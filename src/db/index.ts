import process from 'node:process'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { config } from '@/config'
import { logger } from '@/utils/logger'

export const clientNeon = () => neon(config().DATABASE_URL)
export const clientPostgres = () => postgres(config().DATABASE_URL)
export const clientHyperdrive = () => postgres(config().HYPERDRIVE!.connectionString)

export const getClient = () => {
  if (config().DATABASE_CLIENT_TYPE === 'neon') {
    return clientNeon()
  }
  if (config().DATABASE_CLIENT_TYPE === 'hyperdrive') {
    return clientHyperdrive()
  }
  return clientPostgres()
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
const db = (client?: NeonQueryFunction<false, false> | postgres.Sql<{}>) => {
  if (!client) {
    if (config().DATABASE_CLIENT_TYPE === 'neon') {
      client = clientNeon()
    } else if (config().DATABASE_CLIENT_TYPE === 'hyperdrive') {
      client = clientHyperdrive()
    } else {
      client = clientPostgres()
    }
  }

  if (config().DATABASE_CLIENT_TYPE === 'neon') {
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
