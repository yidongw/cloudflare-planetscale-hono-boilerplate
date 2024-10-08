import { Context } from 'hono'
import httpStatus from 'http-status'
import { Environment } from '../../../../bindings'
import { getConfig } from '../../../config'
import { providerUserFactory } from '../../../factories/oauth.factory'
import { OAuthUserModel } from '../../../models/oauth/oauthBase.model'
import * as authService from '../../../services/auth.service'
import * as tokenService from '../../../services/token.service'
import { AuthProviderType, OauthUserTypes } from '../../../types/oauth.types'
import { ApiError } from '../../../utils/ApiError'
import * as authValidation from '../../../validations/auth.validation'

export const oauthCallback = async <T extends AuthProviderType>(
  c: Context<Environment>,
  oauthRequest: Promise<{ user: OauthUserTypes[T]; tokens: unknown }>,
  providerType: T
): Promise<Response> => {
  const config = getConfig(c.env)
  let providerUser: OAuthUserModel
  try {
    const result = await oauthRequest
    const UserModel = providerUserFactory[providerType]
    providerUser = new UserModel(result.user)
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized')
  }
  const user = await authService.loginOrCreateUserWithOauth(providerUser)
  const tokens = await tokenService.generateAuthTokens(user, config.jwt)
  return c.json({ user, tokens }, httpStatus.OK)
}

export const oauthLink = async <T extends AuthProviderType>(
  c: Context<Environment>,
  oauthRequest: Promise<{ user: OauthUserTypes[T]; tokens: unknown }>,
  providerType: T
): Promise<Response> => {
  const payload = c.get('payload')
  const userId = Number(payload.sub)
  let providerUser: OAuthUserModel
  try {
    const result = await oauthRequest
    const UserModel = providerUserFactory[providerType]
    providerUser = new UserModel(result.user)
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized')
  }
  await authService.linkUserWithOauth(userId, providerUser)
  c.status(httpStatus.NO_CONTENT)
  return c.body(null)
}

export const deleteOauthLink = async (
  c: Context<Environment>,
  provider: AuthProviderType
): Promise<Response> => {
  const payload = c.get('payload')
  const userId = Number(payload.sub)
  await authService.deleteOauthLink(userId, provider)
  c.status(httpStatus.NO_CONTENT)
  return c.body(null)
}

export const validateCallbackBody = async (c: Context<Environment>): Promise<Request> => {
  const bodyParse = await c.req.json()
  const { code } = authValidation.oauthCallback.parse(bodyParse)
  const url = new URL(c.req.url)
  url.searchParams.set('code', code)
  const request = new Request(url.toString())
  return request
}
