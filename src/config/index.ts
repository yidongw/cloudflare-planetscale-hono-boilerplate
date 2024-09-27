import process from 'node:process'
import httpStatus from 'http-status'
import { ZodError, z } from 'zod'
import { type Environment } from '../../bindings'
import { ApiError } from '../utils/ApiError'
import { generateZodErrorMessage } from '../utils/zod'

const envVarsSchema = z.object({
  ENV: z.union([z.literal('production'), z.literal('development'), z.literal('test')]),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  // Database Client Type
  DATABASE_CLIENT_TYPE: z.string(),
  // Database URL
  DATABASE_URL: z.string(),
  // JWT secret key
  JWT_SECRET: z.string(),
  // Minutes after which access tokens expire
  JWT_ACCESS_EXPIRATION_MINUTES: z.coerce.number().default(30),
  // Days after which refresh tokens expire
  JWT_REFRESH_EXPIRATION_DAYS: z.coerce.number().default(30),
  // Minutes after which reset password token expires
  JWT_RESET_PASSWORD_EXPIRATION_MINUTES: z.coerce.number().default(10),
  // Minutes after which verify email token expires
  JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: z.coerce.number().default(10),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string(),
  EMAIL_SENDER: z.string(),
  OAUTH_GITHUB_CLIENT_ID: z.string(),
  OAUTH_GITHUB_CLIENT_SECRET: z.string(),
  OAUTH_GOOGLE_CLIENT_ID: z.string(),
  OAUTH_GOOGLE_CLIENT_SECRET: z.string(),
  OAUTH_GOOGLE_REDIRECT_URL: z.string(),
  OAUTH_DISCORD_CLIENT_ID: z.string(),
  OAUTH_DISCORD_CLIENT_SECRET: z.string(),
  OAUTH_DISCORD_REDIRECT_URL: z.string(),
  OAUTH_SPOTIFY_CLIENT_ID: z.string(),
  OAUTH_SPOTIFY_CLIENT_SECRET: z.string(),
  OAUTH_SPOTIFY_REDIRECT_URL: z.string(),
  OAUTH_FACEBOOK_CLIENT_ID: z.string(),
  OAUTH_FACEBOOK_CLIENT_SECRET: z.string(),
  OAUTH_FACEBOOK_REDIRECT_URL: z.string(),
  OAUTH_APPLE_CLIENT_ID: z.string(),
  OAUTH_APPLE_CLIENT_SECRET: z.string(),
  OAUTH_APPLE_REDIRECT_URL: z.string()
})

export type EnvVarsSchemaType = z.infer<typeof envVarsSchema>

export interface Config {
  env: 'production' | 'development' | 'test'
  isDev: boolean
  isProd: boolean
  logLevel: string
  databaseClientType: string
  databaseUrl: string
  jwt: {
    secret: string
    accessExpirationMinutes: number
    refreshExpirationDays: number
    resetPasswordExpirationMinutes: number
    verifyEmailExpirationMinutes: number
  }
  aws: {
    accessKeyId: string
    secretAccessKey: string
    region: string
  }
  email: {
    sender: string
  }
  oauth: {
    github: {
      clientId: string
      clientSecret: string
    }
    google: {
      clientId: string
      clientSecret: string
      redirectUrl: string
    }
    spotify: {
      clientId: string
      clientSecret: string
      redirectUrl: string
    }
    discord: {
      clientId: string
      clientSecret: string
      redirectUrl: string
    }
    facebook: {
      clientId: string
      clientSecret: string
      redirectUrl: string
    }
    apple: {
      clientId: string
      clientSecret: string
      redirectUrl: string
    }
  }
}

let cachedConfig: Config

export const getConfig = (env: Environment['Bindings']): Config => {
  if (cachedConfig) {
    return cachedConfig
  }

  let envVars: EnvVarsSchemaType
  try {
    envVars = envVarsSchema.parse(env)
  } catch (err) {
    if (env.ENV && env.ENV === 'production') {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Invalid server configuration')
    }
    if (err instanceof ZodError) {
      const errorMessage = generateZodErrorMessage(err)
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, errorMessage)
    }
    throw err
  }
  const config = {
    env: envVars.ENV,
    isDev: envVars.ENV === 'development',
    isProd: envVars.ENV === 'production',
    logLevel: envVars.LOG_LEVEL,
    databaseClientType: envVars.DATABASE_CLIENT_TYPE,
    databaseUrl: envVars.DATABASE_URL,
    jwt: {
      secret: envVars.JWT_SECRET,
      accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
      refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
      resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
      verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES
    },
    aws: {
      accessKeyId: envVars.AWS_ACCESS_KEY_ID,
      secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
      region: envVars.AWS_REGION
    },
    email: {
      sender: envVars.EMAIL_SENDER
    },
    oauth: {
      github: {
        clientId: envVars.OAUTH_GITHUB_CLIENT_ID,
        clientSecret: envVars.OAUTH_GITHUB_CLIENT_SECRET
      },
      google: {
        clientId: envVars.OAUTH_GOOGLE_CLIENT_ID,
        clientSecret: envVars.OAUTH_GOOGLE_CLIENT_SECRET,
        redirectUrl: envVars.OAUTH_GOOGLE_REDIRECT_URL
      },
      spotify: {
        clientId: envVars.OAUTH_SPOTIFY_CLIENT_ID,
        clientSecret: envVars.OAUTH_SPOTIFY_CLIENT_SECRET,
        redirectUrl: envVars.OAUTH_SPOTIFY_REDIRECT_URL
      },
      discord: {
        clientId: envVars.OAUTH_DISCORD_CLIENT_ID,
        clientSecret: envVars.OAUTH_DISCORD_CLIENT_SECRET,
        redirectUrl: envVars.OAUTH_DISCORD_REDIRECT_URL
      },
      facebook: {
        clientId: envVars.OAUTH_FACEBOOK_CLIENT_ID,
        clientSecret: envVars.OAUTH_FACEBOOK_CLIENT_SECRET,
        redirectUrl: envVars.OAUTH_FACEBOOK_REDIRECT_URL
      },
      apple: {
        clientId: envVars.OAUTH_APPLE_CLIENT_ID,
        clientSecret: envVars.OAUTH_APPLE_CLIENT_SECRET,
        redirectUrl: envVars.OAUTH_APPLE_REDIRECT_URL
      }
    }
  }
  return config
}

export const config = () =>
  getConfig(
    typeof Bun !== 'undefined' && Bun.env
      ? (Bun.env as unknown as Environment['Bindings'])
      : (process.env as unknown as Environment['Bindings'])
  )
