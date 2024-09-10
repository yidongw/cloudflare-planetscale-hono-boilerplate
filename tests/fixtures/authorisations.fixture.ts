import { faker } from '@faker-js/faker'
import { authProviders } from '../../src/config/authProviders'
import db from '@/db'
import { authorisation } from '@/db/schemas/pg/authorisation'

export const githubAuthorisation = (userId: number) => ({
  provider_type: authProviders.GITHUB,
  provider_user_id: faker.number.int().toString(),
  user_id: userId
})

export const discordAuthorisation = (userId: number) => ({
  provider_type: authProviders.DISCORD,
  provider_user_id: faker.number.int().toString(),
  user_id: userId
})

export const spotifyAuthorisation = (userId: number) => ({
  provider_type: authProviders.SPOTIFY,
  provider_user_id: faker.number.int().toString(),
  user_id: userId
})

export const googleAuthorisation = (userId: number) => ({
  provider_type: authProviders.GOOGLE,
  provider_user_id: faker.number.int().toString(),
  user_id: userId
})

export const facebookAuthorisation = (userId: number) => ({
  provider_type: authProviders.FACEBOOK,
  provider_user_id: faker.number.int().toString(),
  user_id: userId
})

export const appleAuthorisation = (userId: number) => ({
  provider_type: authProviders.APPLE,
  provider_user_id: faker.number.int().toString(),
  user_id: userId
})

export const insertAuthorisations = async (
  authorisationsData: (typeof authorisation.$inferInsert)[]
) => {
  for (const authData of authorisationsData) {
    await db().insert(authorisation).values(authData)
  }
}
