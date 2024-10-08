import { Handler } from 'hono'
import httpStatus from 'http-status'
import { github } from 'worker-auth-providers'
import { Environment } from '../../../../bindings'
import { getConfig } from '../../../config'
import { authProviders } from '../../../config/authProviders'
import { oauthCallback, oauthLink, deleteOauthLink, validateCallbackBody } from './oauth.controller'

export const githubRedirect: Handler<Environment> = async (c) => {
  const config = getConfig(c.env)
  const location = await github.redirect({
    options: {
      clientId: config.oauth.github.clientId
    }
  })
  return c.redirect(location, httpStatus.FOUND)
}

export const githubCallback: Handler<Environment> = async (c) => {
  const config = getConfig(c.env)
  const request = await validateCallbackBody(c)
  const oauthRequest = github.users({
    options: {
      clientId: config.oauth.github.clientId,
      clientSecret: config.oauth.github.clientSecret
    },
    request
  })
  return oauthCallback<typeof authProviders.GITHUB>(c, oauthRequest, authProviders.GITHUB)
}

export const linkGithub: Handler<Environment> = async (c) => {
  const config = getConfig(c.env)
  const request = await validateCallbackBody(c)
  const oauthRequest = github.users({
    options: {
      clientId: config.oauth.github.clientId,
      clientSecret: config.oauth.github.clientSecret
    },
    request
  })
  return oauthLink(c, oauthRequest, authProviders.GITHUB)
}

export const deleteGithubLink: Handler<Environment> = async (c) => {
  return deleteOauthLink(c, authProviders.GITHUB)
}
