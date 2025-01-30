import process from 'node:process'
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { config } from '@/config'
import { logger } from '@/utils/logger'

export const clientPostgres = () => postgres(config().DATABASE_URL)

export const getClient = () => {
  return clientPostgres()
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
const db = (client?: postgres.Sql<{}>) => {
  client = clientPostgres()

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
