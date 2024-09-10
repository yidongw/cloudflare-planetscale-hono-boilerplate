import process from 'node:process'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { config } from '@/config'
import { logger } from '@/utils/logger'

export const clientNeon = () => neon(config().databaseUrl)
export const clientPostgres = () => postgres(config().databaseUrl)

export const getClient = () => {
  if (config().databaseClientType === 'neon') {
    return clientNeon()
  }
  return clientPostgres()
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
const db = (client?: NeonQueryFunction<false, false> | postgres.Sql<{}>) => {
  if (!client) {
    if (config().databaseClientType === 'neon') {
      client = clientNeon()
    } else {
      client = clientPostgres()
    }
  }

  if (config().databaseClientType === 'neon') {
    return drizzleNeon(client as NeonQueryFunction<false, false>) as unknown as PostgresJsDatabase<
      Record<string, never>
    >
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  return drizzlePostgres(client as postgres.Sql<{}>)
}

export async function testConnection() {
  try {
    // Run a simple query to test the connection
    await (getClient() as postgres.Sql)`SELECT 1 AS connected`
    logger().info({
      msg: 'Connected to DB'
    })
  } catch (error) {
    logger().error({
      msg: 'Error connecting to the database',
      error
    })
    // Stop the process
    process.exit(1)
  }
}

export default db
