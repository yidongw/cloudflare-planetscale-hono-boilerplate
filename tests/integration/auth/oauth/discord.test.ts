import { faker } from '@faker-js/faker'
import { env, fetchMock } from 'cloudflare:test'
import { eq, and } from 'drizzle-orm'
import httpStatus from 'http-status'
import { describe, expect, test, beforeAll, afterEach } from 'vitest'
import { getConfig } from '../../../../src/config'
import { authProviders } from '../../../../src/config/authProviders'
import { tokenTypes } from '../../../../src/config/tokens'
import { DiscordUserType } from '../../../../src/types/oauth.types'
import {
  discordAuthorisation,
  facebookAuthorisation,
  githubAuthorisation,
  insertAuthorisations
} from '../../../fixtures/authorisations.fixture'
import { getAccessToken, TokenResponse } from '../../../fixtures/token.fixture'
import { userOne, insertUsers, UserResponse, userTwo } from '../../../fixtures/user.fixture'
import { clearDBTables } from '../../../utils/clearDBTables'
import { request } from '../../../utils/testRequest'
import db from '@/db'
import { authorisation } from '@/db/schemas/pg/authorisation'
import { user } from '@/db/schemas/pg/user'

const config = getConfig(env)
const client = db()

clearDBTables(['user', 'authorisation'])

describe('Oauth Discord routes', () => {
  describe('GET /v1/auth/discord/redirect', () => {
    test('should return 302 and successfully redirect to discord', async () => {
      const urlEncodedRedirectUrl = encodeURIComponent(config.oauth.discord.redirectUrl)
      const res = await request('/v1/auth/discord/redirect', {
        method: 'GET'
      })
      expect(res.status).toBe(httpStatus.FOUND)
      expect(res.headers.get('location')).toBe(
        `https://discord.com/api/oauth2/authorize?client_id=${config.oauth.discord.clientId}&` +
          `redirect_uri=${urlEncodedRedirectUrl}&response_type=code&scope=identify%20email`
      )
    })
  })

  describe('POST /v1/auth/discord/callback', () => {
    let newUser: DiscordUserType
    beforeAll(async () => {
      newUser = {
        id: faker.number.int().toString(),
        username: faker.person.fullName(),
        email: faker.internet.email()
      }
      fetchMock.activate()
    })
    afterEach(() => fetchMock.assertNoPendingInterceptors())
    test('should return 200 and successfully register user if request data is ok', async () => {
      const discordApiMock = fetchMock.get('https://discord.com')
      discordApiMock
        .intercept({ method: 'GET', path: '/api/users/@me' })
        .reply(200, JSON.stringify(newUser))
      const discordMock = fetchMock.get('https://discordapp.com')
      discordMock
        .intercept({ method: 'POST', path: '/api/oauth2/token' })
        .reply(200, JSON.stringify({ access_token: '1234' }))

      const providerId = '123456'
      const res = await request('/v1/auth/discord/callback', {
        method: 'POST',
        body: JSON.stringify({ code: providerId }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const body = await res.json<{ user: UserResponse; tokens: TokenResponse }>()
      expect(res.status).toBe(httpStatus.OK)
      expect(body.user).not.toHaveProperty('password')
      expect(body.user).toEqual({
        id: expect.anything(),
        name: newUser.username,
        email: newUser.email,
        role: 'user',
        is_email_verified: true
      })

      const [dbUser] = await client.select().from(user).where(eq(user.id, body.user.id))

      expect(dbUser).toBeDefined()
      if (!dbUser) return

      expect(dbUser.password).toBeNull()
      expect(dbUser).toMatchObject({
        name: newUser.username,
        password: null,
        email: newUser.email,
        role: 'user',
        is_email_verified: true
      })

      const oauthUser = await client
        .select()
        .from(authorisation)
        .where(
          and(
            eq(authorisation.provider_type, authProviders.DISCORD),
            eq(authorisation.user_id, body.user.id),
            eq(authorisation.provider_user_id, newUser.id)
          )
        )

      expect(oauthUser).toBeDefined()
      if (!oauthUser) return

      expect(body.tokens).toEqual({
        access: { token: expect.anything(), expires: expect.anything() },
        refresh: { token: expect.anything(), expires: expect.anything() }
      })
    })

    test('should return 200 and successfully login user if already created', async () => {
      const ids = await insertUsers([userOne])
      const userId = ids[0]
      const discordUser = discordAuthorisation(userId)
      await insertAuthorisations([discordUser])
      newUser.id = discordUser.provider_user_id

      const discordApiMock = fetchMock.get('https://discord.com')
      discordApiMock
        .intercept({ method: 'GET', path: '/api/users/@me' })
        .reply(200, JSON.stringify(newUser))
      const discordMock = fetchMock.get('https://discordapp.com')
      discordMock
        .intercept({ method: 'POST', path: '/api/oauth2/token' })
        .reply(200, JSON.stringify({ access_token: '1234' }))

      const providerId = '123456'
      const res = await request('/v1/auth/discord/callback', {
        method: 'POST',
        body: JSON.stringify({ code: providerId }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const body = await res.json<{ user: UserResponse; tokens: TokenResponse }>()
      expect(res.status).toBe(httpStatus.OK)
      expect(body.user).not.toHaveProperty('password')
      expect(body.user).toEqual({
        id: userId,
        name: userOne.name,
        email: userOne.email,
        role: userOne.role,
        is_email_verified: false
      })

      expect(body.tokens).toEqual({
        access: { token: expect.anything(), expires: expect.anything() },
        refresh: { token: expect.anything(), expires: expect.anything() }
      })
    })

    test('should return 403 if user exists but has not linked their discord', async () => {
      await insertUsers([userOne])
      newUser.email = userOne.email

      const discordApiMock = fetchMock.get('https://discord.com')
      discordApiMock
        .intercept({ method: 'GET', path: '/api/users/@me' })
        .reply(200, JSON.stringify(newUser))
      const discordMock = fetchMock.get('https://discordapp.com')
      discordMock
        .intercept({ method: 'POST', path: '/api/oauth2/token' })
        .reply(200, JSON.stringify({ access_token: '1234' }))

      const providerId = '123456'
      const res = await request('/v1/auth/discord/callback', {
        method: 'POST',
        body: JSON.stringify({ code: providerId }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const body = await res.json<{ user: UserResponse; tokens: TokenResponse }>()
      expect(res.status).toBe(httpStatus.FORBIDDEN)
      expect(body).toEqual({
        code: httpStatus.FORBIDDEN,
        message: 'Cannot signup with discord, user already exists with that email'
      })
    })

    test('should return 401 if code is invalid', async () => {
      const discordMock = fetchMock.get('https://discordapp.com')
      discordMock
        .intercept({ method: 'POST', path: '/api/oauth2/token' })
        .reply(httpStatus.UNAUTHORIZED, JSON.stringify({ error: 'error' }))

      const providerId = '123456'
      const res = await request('/v1/auth/discord/callback', {
        method: 'POST',
        body: JSON.stringify({ code: providerId }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(res.status).toBe(httpStatus.UNAUTHORIZED)
    })

    test('should return 400 if no code provided', async () => {
      const res = await request('/v1/auth/discord/callback', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(res.status).toBe(httpStatus.BAD_REQUEST)
    })
  })

  describe('POST /v1/auth/discord/:userId', () => {
    let newUser: DiscordUserType
    beforeAll(async () => {
      newUser = {
        id: faker.number.int().toString(),
        username: faker.person.fullName(),
        email: faker.internet.email()
      }
    })
    test('should return 200 and successfully link discord account', async () => {
      const ids = await insertUsers([userOne])
      const userId = ids[0]
      const userOneAccessToken = await getAccessToken(ids[0], userOne.role, config.jwt)

      const discordApiMock = fetchMock.get('https://discord.com')
      discordApiMock
        .intercept({ method: 'GET', path: '/api/users/@me' })
        .reply(200, JSON.stringify(newUser))
      const discordMock = fetchMock.get('https://discordapp.com')
      discordMock
        .intercept({ method: 'POST', path: '/api/oauth2/token' })
        .reply(200, JSON.stringify({ access_token: '1234' }))

      const providerId = '123456'
      const res = await request(`/v1/auth/discord/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ code: providerId }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userOneAccessToken}`
        }
      })
      expect(res.status).toBe(httpStatus.NO_CONTENT)

      const [dbUser] = await client.select().from(user).where(eq(user.id, userId))

      expect(dbUser).toBeDefined()
      if (!dbUser) return

      expect(dbUser.password).toBeDefined()
      expect(dbUser).toMatchObject({
        name: userOne.name,
        password: expect.anything(),
        email: userOne.email,
        role: userOne.role,
        is_email_verified: false
      })

      const oauthUser = await client
        .select()
        .from(authorisation)
        .where(
          and(
            eq(authorisation.provider_type, authProviders.DISCORD),
            eq(authorisation.user_id, userId),
            eq(authorisation.provider_user_id, newUser.id)
          )
        )

      expect(oauthUser).toBeDefined()
      if (!oauthUser) return
    })

    test('should return 401 if user does not exist when linking', async () => {
      const ids = await insertUsers([userOne])
      const userId = ids[0]
      const userOneAccessToken = await getAccessToken(userId, userOne.role, config.jwt)
      await client.delete(user).where(eq(user.id, userId)).execute()

      const discordApiMock = fetchMock.get('https://discord.com')
      discordApiMock
        .intercept({ method: 'GET', path: '/api/users/@me' })
        .reply(200, JSON.stringify(newUser))
      const discordMock = fetchMock.get('https://discordapp.com')
      discordMock
        .intercept({ method: 'POST', path: '/api/oauth2/token' })
        .reply(200, JSON.stringify({ access_token: '1234' }))

      const providerId = '123456'
      const res = await request(`/v1/auth/discord/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ code: providerId }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userOneAccessToken}`
        }
      })
      expect(res.status).toBe(httpStatus.UNAUTHORIZED)

      const oauthUser = await client
        .select()
        .from(authorisation)
        .where(
          and(
            eq(authorisation.provider_type, authProviders.DISCORD),
            eq(authorisation.user_id, userId),
            eq(authorisation.provider_user_id, newUser.id)
          )
        )

      expect(oauthUser).toBeUndefined()
    })

    test('should return 401 if code is invalid', async () => {
      const ids = await insertUsers([userOne])
      const userId = ids[0]
      const userOneAccessToken = await getAccessToken(ids[0], userOne.role, config.jwt)

      const discordMock = fetchMock.get('https://discordapp.com')
      discordMock
        .intercept({ method: 'POST', path: '/api/oauth2/token' })
        .reply(httpStatus.UNAUTHORIZED, JSON.stringify({ error: 'error' }))

      const providerId = '123456'
      const res = await request(`/v1/auth/discord/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ code: providerId }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userOneAccessToken}`
        }
      })
      expect(res.status).toBe(httpStatus.UNAUTHORIZED)
    })

    test('should return 403 if linking different user', async () => {
      const ids = await insertUsers([userOne])
      const userId = ids[0]
      const userOneAccessToken = await getAccessToken(userId, userOne.role, config.jwt)

      const providerId = '123456'
      const res = await request('/v1/auth/discord/5298', {
        method: 'POST',
        body: JSON.stringify({ code: providerId }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userOneAccessToken}`
        }
      })
      expect(res.status).toBe(httpStatus.FORBIDDEN)
    })

    test('should return 400 if no code provided', async () => {
      const ids = await insertUsers([userOne])
      const userId = ids[0]
      const userOneAccessToken = await getAccessToken(ids[0], userOne.role, config.jwt)

      const res = await request(`/v1/auth/discord/${userId}`, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userOneAccessToken}`
        }
      })
      expect(res.status).toBe(httpStatus.BAD_REQUEST)
    })

    test('should return 401 error if access token is missing', async () => {
      const res = await request('/v1/auth/discord/1234', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(res.status).toBe(httpStatus.UNAUTHORIZED)
    })
    test('should return 403 if user has not verified their email', async () => {
      const ids = await insertUsers([userTwo])
      const userId = ids[0]
      const accessToken = await getAccessToken(
        userId,
        userTwo.role,
        config.jwt,
        tokenTypes.ACCESS,
        userTwo.is_email_verified
      )
      const res = await request('/v1/auth/discord/5298', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })
      expect(res.status).toBe(httpStatus.FORBIDDEN)
    })
  })

  describe('DELETE /v1/auth/discord/:userId', () => {
    test('should return 200 and successfully remove discord account link', async () => {
      const ids = await insertUsers([userOne])
      const userId = ids[0]
      const userOneAccessToken = await getAccessToken(ids[0], userOne.role, config.jwt)
      const discordUser = discordAuthorisation(userId)
      await insertAuthorisations([discordUser])

      const res = await request(`/v1/auth/discord/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${userOneAccessToken}`
        }
      })
      expect(res.status).toBe(httpStatus.NO_CONTENT)

      const [oauthUser] = await client
        .select()
        .from(authorisation)
        .where(
          and(
            eq(authorisation.provider_type, authProviders.DISCORD),
            eq(authorisation.user_id, userId)
          )
        )

      expect(oauthUser).toBeUndefined()
      if (!oauthUser) return
    })

    test('should return 400 if user does not have a local login and only 1 link', async () => {
      const newUser = { ...userOne, password: null }
      const ids = await insertUsers([newUser])
      const userId = ids[0]
      const userOneAccessToken = await getAccessToken(ids[0], newUser.role, config.jwt)
      const discordUser = discordAuthorisation(userId)
      await insertAuthorisations([discordUser])

      const res = await request(`/v1/auth/discord/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${userOneAccessToken}`
        }
      })
      expect(res.status).toBe(httpStatus.BAD_REQUEST)

      const [oauthUser] = await client
        .select()
        .from(authorisation)
        .where(
          and(
            eq(authorisation.provider_type, authProviders.DISCORD),
            eq(authorisation.user_id, userId)
          )
        )

      expect(oauthUser).toBeDefined()
    })

    test('should return 400 if user does not have discord link', async () => {
      const newUser = { ...userOne, password: null }
      const ids = await insertUsers([newUser])
      const userId = ids[0]
      const userOneAccessToken = await getAccessToken(ids[0], newUser.role, config.jwt)
      const githubUser = githubAuthorisation(userId)
      await insertAuthorisations([githubUser])
      const facebookUser = facebookAuthorisation(userId)
      await insertAuthorisations([facebookUser])

      const res = await request(`/v1/auth/discord/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${userOneAccessToken}`
        }
      })
      expect(res.status).toBe(httpStatus.BAD_REQUEST)
    })

    test('should return 400 if user only has a local login', async () => {
      const newUser = { ...userOne, password: null }
      const ids = await insertUsers([newUser])
      const userId = ids[0]
      const userOneAccessToken = await getAccessToken(ids[0], newUser.role, config.jwt)

      const res = await request(`/v1/auth/discord/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${userOneAccessToken}`
        }
      })
      expect(res.status).toBe(httpStatus.BAD_REQUEST)
    })

    test('should return 200 if user does not have a local login and 2 links', async () => {
      const newUser = { ...userOne, password: null }
      const ids = await insertUsers([newUser])
      const userId = ids[0]
      const userOneAccessToken = await getAccessToken(ids[0], newUser.role, config.jwt)
      const discordUser = discordAuthorisation(userId)
      const facebookUser = facebookAuthorisation(userId)
      await insertAuthorisations([discordUser, facebookUser])

      const res = await request(`/v1/auth/discord/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${userOneAccessToken}`
        }
      })
      expect(res.status).toBe(httpStatus.NO_CONTENT)

      const [oauthDiscordUser] = await client
        .select()
        .from(authorisation)
        .where(
          and(
            eq(authorisation.provider_type, authProviders.DISCORD),
            eq(authorisation.user_id, userId)
          )
        )

      expect(oauthDiscordUser).toBeUndefined()

      const [oauthFacebookUser] = await client
        .select()
        .from(authorisation)
        .where(
          and(
            eq(authorisation.provider_type, authProviders.FACEBOOK),
            eq(authorisation.user_id, userId)
          )
        )

      expect(oauthFacebookUser).toBeDefined()
    })

    test('should return 403 if unlinking different user', async () => {
      const ids = await insertUsers([userOne])
      const userId = ids[0]
      const userOneAccessToken = await getAccessToken(userId, userOne.role, config.jwt)

      const res = await request('/v1/auth/discord/5298', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userOneAccessToken}`
        }
      })
      expect(res.status).toBe(httpStatus.FORBIDDEN)
    })

    test('should return 401 error if access token is missing', async () => {
      const res = await request('/v1/auth/discord/1234', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(res.status).toBe(httpStatus.UNAUTHORIZED)
    })
    test('should return 403 if user has not verified their email', async () => {
      const ids = await insertUsers([userTwo])
      const userId = ids[0]
      const accessToken = await getAccessToken(
        userId,
        userTwo.role,
        config.jwt,
        tokenTypes.ACCESS,
        userTwo.is_email_verified
      )
      const res = await request('/v1/auth/discord/5298', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })
      expect(res.status).toBe(httpStatus.FORBIDDEN)
    })
  })
})
