import { eq, and, sql } from 'drizzle-orm'
import { asc, desc } from 'drizzle-orm'
import httpStatus from 'http-status'
import { OAuthUserModel } from '../models/oauth/oauthBase.model'
import { User, type UserTable } from '../models/user.model'
import { type AuthProviderType } from '../types/oauth.types'
import { ApiError } from '../utils/ApiError'
import { type CreateUser, type UpdateUser } from '../validations/user.validation'
import db from '@/db'
import { authorisation as authorisations } from '@/db/schemas/pg/authorisation'
import { user as users } from '@/db/schemas/pg/user'

interface getUsersFilter {
  email: string | undefined
}

interface getUsersOptions {
  sortBy: string
  limit: number
  page: number
}

export const createUser = async (userBody: CreateUser): Promise<User> => {
  try {
    const [result] = await db().insert(users).values(userBody).returning()
    const user = await getUserById(result.id)
    return user!
  } catch {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User already exists')
  }
}

export const createOauthUser = async (providerUser: OAuthUserModel): Promise<User> => {
  try {
    await db().transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          name: providerUser._name,
          email: providerUser._email,
          is_email_verified: true,
          password: null,
          role: 'user'
        })
        .returning({ id: users.id })

      await tx.insert(authorisations).values({
        user_id: user.id,
        provider_type: providerUser.providerType,
        provider_user_id: providerUser._id
      })

      return [user]
    })

    const user = await getUserByProviderIdType(providerUser._id, providerUser.providerType)
    return new User(user as User)
  } catch {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `Cannot signup with ${providerUser.providerType}, user already exists with that email`
    )
  }
}

export const queryUsers = async (
  filter: getUsersFilter,
  options: getUsersOptions
): Promise<User[]> => {
  const [sortField, direction] = options.sortBy.split(':') as [keyof UserTable, 'asc' | 'desc']
  let query
  query = db()
    .select()
    .from(users)
    .orderBy(direction === 'asc' ? asc(sql.identifier(sortField)) : desc(sql.identifier(sortField)))
    .limit(options.limit)
    .offset(options.limit * options.page)

  if (filter.email) {
    query = query.where(eq(users.email, filter.email))
  }

  const result = await query
  return result.map((user) => new User(user))
}

export const getUserById = async (id: number): Promise<User | undefined> => {
  const [user] = await db().select().from(users).where(eq(users.id, id))
  return user ? new User(user) : undefined
}

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  const [user] = await db().select().from(users).where(eq(users.email, email))
  return user ? new User(user) : undefined
}

export const getUserByProviderIdType = async (
  id: string,
  type: AuthProviderType
): Promise<User | undefined> => {
  const [user] = await db()
    .select()
    .from(users)
    .innerJoin(authorisations, eq(authorisations.user_id, users.id))
    .where(and(eq(authorisations.provider_user_id, id), eq(authorisations.provider_type, type)))
  return user ? new User(user.user) : undefined
}

export const updateUserById = async (
  userId: number,
  updateBody: Partial<UpdateUser>
): Promise<User> => {
  try {
    const [updatedUser] = await db()
      .update(users)
      .set(updateBody)
      .where(eq(users.id, userId))
      .returning()

    if (!updatedUser) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found')
    }

    return new User(updatedUser)
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(httpStatus.BAD_REQUEST, 'User already exists')
  }
}

export const deleteUserById = async (userId: number): Promise<void> => {
  const result = await db().delete(users).where(eq(users.id, userId)).returning()

  if (result.length < 1) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found')
  }
}

export const getAuthorisations = async (userId: number) => {
  const auths = await db()
    .select()
    .from(users)
    .leftJoin(authorisations, eq(authorisations.user_id, users.id))
    .where(eq(users.id, userId))

  if (!auths) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate')
  }
  const response = {
    local: auths[0].user.password !== null ? true : false,
    google: false,
    facebook: false,
    discord: false,
    spotify: false,
    github: false,
    apple: false
  }
  for (const auth of auths) {
    if (auth.authorisation === null || auth.authorisation.provider_type === null) {
      continue
    }
    response[auth.authorisation.provider_type as AuthProviderType] = true
  }
  return response
}
