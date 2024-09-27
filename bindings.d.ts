import type { JwtPayload } from '@tsndr/cloudflare-worker-jwt'
import type { Toucan } from 'toucan-js'
// import type { RateLimiter } from './src/durable-objects/rateLimiter.do'
import type { EnvVarsSchemaType } from './src/config'

type Environment = {
  Bindings: Omit<EnvVarsSchemaType, 'HYPERDRIVE'> & {
    HYPERDRIVE: Hyperdrive
    RATE_LIMITER: DurableObjectNamespace<RateLimiter>
  }
  Variables: {
    payload: JwtPayload
    sentry: Toucan
  }
}
