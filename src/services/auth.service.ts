import { eq, count, and } from 'drizzle-orm'
import httpStatus from 'http-status'
import { type Config } from '../config'
import { type Role } from '../config/roles'
import { tokenTypes } from '../config/tokens'
import { OAuthUserModel } from '../models/oauth/oauthBase.model'
import { type TokenResponse } from '../models/token.model'
import { User } from '../models/user.model'
import { type AuthProviderType } from '../types/oauth.types'
import { ApiError } from '../utils/ApiError'
import { type Register } from '../validations/auth.validation'
import * as tokenService from './token.service'
import * as userService from './user.service'
import { createUser } from './user.service'
import db from '@/db'
import { authorisation } from '@/db/schemas/pg'
import { user, user as users } from '@/db/schemas/pg/user'

export const loginUserWithEmailAndPassword = async (
  email: string,
  password: string
): Promise<User> => {
  const user = await userService.getUserByEmail(email)
  // If password is null then the user must login with a social account
  if (user && !user.password) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please login with your social account')
  }
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password')
  }
  return user
}

export const refreshAuth = async (refreshToken: string, config: Config): Promise<TokenResponse> => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(
      refreshToken,
      tokenTypes.REFRESH,
      config.jwt.secret
    )
    const user = await userService.getUserById(Number(refreshTokenDoc.sub))
    if (!user) {
      throw new Error()
    }
    return tokenService.generateAuthTokens(user, config.jwt)
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate')
  }
}

export const register = async (body: Register): Promise<User> => {
  const registerBody = { ...body, role: 'user' as Role, is_email_verified: false }
  const newUser = await createUser(registerBody)
  return newUser
}

export const resetPassword = async (
  resetPasswordToken: string,
  newPassword: string,
  config: Config
): Promise<void> => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(
      resetPasswordToken,
      tokenTypes.RESET_PASSWORD,
      config.jwt.secret
    )
    const userId = Number(resetPasswordTokenDoc.sub)
    const user = await userService.getUserById(userId)
    if (!user) {
      throw new Error()
    }
    await userService.updateUserById(user.id, { password: newPassword })
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed')
  }
}

export const verifyEmail = async (verifyEmailToken: string, config: Config): Promise<void> => {
  try {
    const verifyEmailTokenDoc = await tokenService.verifyToken(
      verifyEmailToken,
      tokenTypes.VERIFY_EMAIL,
      config.jwt.secret
    )
    const userId = Number(verifyEmailTokenDoc.sub)
    const user = await userService.getUserById(userId)
    if (!user) {
      throw new Error()
    }
    await userService.updateUserById(user.id, { is_email_verified: true })
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed')
  }
}

export const loginOrCreateUserWithOauth = async (providerUser: OAuthUserModel): Promise<User> => {
  const user = await userService.getUserByProviderIdType(
    providerUser._id,
    providerUser.providerType
  )
  if (user) return user
  return userService.createOauthUser(providerUser)
}

export const linkUserWithOauth = async (
  userId: number,
  providerUser: OAuthUserModel
): Promise<void> => {
  await db().transaction(async (trx) => {
    // Changed to drizzle syntax
    try {
      await trx.select().from(users).where(eq(users.id, userId))
    } catch {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate')
    }
    await trx.insert(authorisation).values({
      user_id: userId,
      provider_user_id: providerUser._id,
      provider_type: providerUser.providerType
    })
  })
}

export const deleteOauthLink = async (
  userId: number,
  provider: AuthProviderType
): Promise<void> => {
  await db().transaction(async (trx) => {
    try {
      // Select logins using Drizzle syntax
      const [login] = await trx
        .select({
          password: user.password,
          authorisations: count(authorisation.provider_user_id).as('authorisationsCount')
        })
        .from(user)
        .leftJoin(authorisation, eq(user.id, authorisation.user_id))
        .where(eq(user.id, userId))
        .groupBy(user.password)

      const loginsNo = login.password !== null ? login.authorisations + 1 : login.authorisations

      const minLoginMethods = 1
      if (loginsNo <= minLoginMethods) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot unlink last login method')
      }

      // Delete from authorisations
      const result = await trx
        .delete(authorisation)
        .where(and(eq(authorisation.user_id, userId), eq(authorisation.provider_type, provider)))
        .returning()

      if (result.length < 1) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Account not linked')
      }
    } catch {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Account not linked')
    }
  })
}
