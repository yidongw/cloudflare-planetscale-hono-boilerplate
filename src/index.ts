import process from 'node:process'
import { sentry } from '@hono/sentry'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import httpStatus from 'http-status'
import { type Environment } from '../bindings'
import { errorHandler } from './middlewares/error'
import { defaultRoutes } from './routes'
import { ApiError } from './utils/ApiError'
import { resTimeLogger } from '@/middlewares/resTimeLogger'
// export { RateLimiter } from './durable-objects/rateLimiter.do'
/* eslint no-console: "off" */
const app = new Hono<Environment>()

// Middleware to bind env vars to process.env
app.use('*', (c, next) => {
  Object.assign(process.env, {
    ...c.env,
    HYPERDRIVE: JSON.stringify(c.env.HYPERDRIVE)
  })
  return next()
})

app.use(resTimeLogger())

app.use('*', sentry())
app.use('*', cors())

app.notFound(() => {
  throw new ApiError(httpStatus.NOT_FOUND, 'Not found')
})

app.onError(errorHandler)

defaultRoutes.forEach((route) => {
  app.route(`${route.path}`, route.route)
})

console.log('Server is running')
export default app
