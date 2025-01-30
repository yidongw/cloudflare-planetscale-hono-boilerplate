import httpStatus from 'http-status'
import { type Role } from '../config/roles'
import { tokenTypes } from '../config/tokens'
import { type TokenResponse } from '../models/token.model'
import { User } from '../models/user.model'
import { ApiError } from '../utils/ApiError'
import { type Register } from '../validations/auth.validation'
import * as tokenService from './token.service'
import * as userService from './user.service'
import { createUser } from './user.service'

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

export const refreshAuth = async (refreshToken: string, config: any): Promise<TokenResponse> => {
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
  config: any
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

export const verifyEmail = async (verifyEmailToken: string, config: any): Promise<void> => {
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
