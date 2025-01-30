import process from 'node:process'
import httpStatus from 'http-status'
import { ZodError, z } from 'zod'
import { ApiError } from '../utils/ApiError'
import { generateZodErrorMessage } from '../utils/zod'

const envVarsSchema = z.object({
  ENV: z.union([z.literal('production'), z.literal('development'), z.literal('test')]),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  // Database URL
  DATABASE_URL: z.string(),
  WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_TEST_DB: z.string().optional(),

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

  SENTRY_DSN: z.string(),

  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string(),
  EMAIL_SENDER: z.string()
})

export type EnvVarsSchemaType = z.infer<typeof envVarsSchema>

// TODO: Remove this function and replace with getEnv
export const getConfig = (env: any) => {
  try {
    const envVars = envVarsSchema.parse(env)
    return {
      env: envVars.ENV,
      isDev: envVars.ENV === 'development',
      isProd: envVars.ENV === 'production',
      logLevel: envVars.LOG_LEVEL,
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
      }
    }
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
}

let cachedConfig: EnvVarsSchemaType

export const getEnv = (env: any): EnvVarsSchemaType => {
  try {
    cachedConfig = envVarsSchema.parse(env)
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
  return cachedConfig
}

export const config = () => {
  if (cachedConfig) {
    return cachedConfig
  }
  return getEnv(
    typeof Bun !== 'undefined' && Bun.env
      ? {
          ...Bun.env
        }
      : {
          ...process.env
        }
  )
}
