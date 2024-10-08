import { Handler } from 'hono'
import httpStatus from 'http-status'
import { facebook } from 'worker-auth-providers'
import { Environment } from '../../../../bindings'
import { getConfig } from '../../../config'
import { authProviders } from '../../../config/authProviders'
import { oauthCallback, oauthLink, deleteOauthLink, validateCallbackBody } from './oauth.controller'

export const facebookRedirect: Handler<Environment> = async (c) => {
  const config = getConfig(c.env)
  const location = await facebook.redirect({
    clientId: config.oauth.facebook.clientId,
    redirectUrl: config.oauth.facebook.redirectUrl
  })
  return c.redirect(location, httpStatus.FOUND)
}

export const facebookCallback: Handler<Environment> = async (c) => {
  const config = getConfig(c.env)
  const request = await validateCallbackBody(c)
  const oauthRequest = facebook.users({
    options: {
      clientId: config.oauth.facebook.clientId,
      clientSecret: config.oauth.facebook.clientSecret,
      redirectUrl: config.oauth.facebook.redirectUrl
    },
    request
  })
  return oauthCallback<typeof authProviders.FACEBOOK>(c, oauthRequest, authProviders.FACEBOOK)
}

export const linkFacebook: Handler<Environment> = async (c) => {
  const config = getConfig(c.env)
  const request = await validateCallbackBody(c)
  const oauthRequest = facebook.users({
    options: {
      clientId: config.oauth.facebook.clientId,
      clientSecret: config.oauth.facebook.clientSecret,
      redirectUrl: config.oauth.facebook.redirectUrl
    },
    request
  })
  return oauthLink<typeof authProviders.FACEBOOK>(c, oauthRequest, authProviders.FACEBOOK)
}

export const deleteFacebookLink: Handler<Environment> = async (c) => {
  return deleteOauthLink(c, authProviders.FACEBOOK)
}
