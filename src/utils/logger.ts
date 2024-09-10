import { pino } from 'pino'
import { config } from '@/config'

export const logger = () =>
  pino({
    level: config().logLevel,
    transport: {
      targets: [
        ...(config().isDev
          ? [
              {
                target: 'pino-pretty',
                level: config().logLevel,
                options: {
                  ignore: 'pid,hostname',
                  colorize: true,
                  translateTime: true
                }
              }
            ]
          : [
              {
                target: 'pino/file',
                level: config().logLevel,
                options: {}
              }
            ])
      ]
    }
  })

export type Logger = typeof logger
