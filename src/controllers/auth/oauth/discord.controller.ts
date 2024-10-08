import { Handler } from 'hono'
import httpStatus from 'http-status'
import { discord } from 'worker-auth-providers'
import { Environment } from '../../../../bindings'
import { getConfig } from '../../../config'
import { authProviders } from '../../../config/authProviders'
import { DiscordUserType } from '../../../types/oauth.types'
import { oauthCallback, oauthLink, deleteOauthLink, validateCallbackBody } from './oauth.controller'

export const discordRedirect: Handler<Environment> = async (c) => {
  const config = getConfig(c.env)
  const location = await discord.redirect({
    options: {
      clientId: config.oauth.discord.clientId,
      redirectUrl: config.oauth.discord.redirectUrl,
      scope: 'identify email'
    }
  })
  return c.redirect(location, httpStatus.FOUND)
}

export const discordCallback: Handler<Environment> = async (c) => {
  const config = getConfig(c.env)
  const request = await validateCallbackBody(c)
  const oauthRequest = discord.users({
    options: {
      clientId: config.oauth.discord.clientId,
      clientSecret: config.oauth.discord.clientSecret,
      redirectUrl: config.oauth.discord.redirectUrl
    },
    request
  }) as Promise<{ user: DiscordUserType; tokens: unknown }>
  return oauthCallback<typeof authProviders.DISCORD>(c, oauthRequest, authProviders.DISCORD)
}

export const linkDiscord: Handler<Environment> = async (c) => {
  const config = getConfig(c.env)
  const request = await validateCallbackBody(c)
  const oauthRequest = discord.users({
    options: {
      clientId: config.oauth.discord.clientId,
      clientSecret: config.oauth.discord.clientSecret,
      redirectUrl: config.oauth.discord.redirectUrl
    },
    request
  }) as Promise<{ user: DiscordUserType; tokens: unknown }>
  return oauthLink<typeof authProviders.DISCORD>(c, oauthRequest, authProviders.DISCORD)
}

export const deleteDiscordLink: Handler<Environment> = async (c) => {
  return deleteOauthLink(c, authProviders.DISCORD)
}
