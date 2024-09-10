import { beforeEach } from 'vitest'
import db from '@/db'
import { authorisation } from '@/db/schemas/pg/authorisation'
import { user } from '@/db/schemas/pg/user'

const tableMap = {
  user: user,
  authorisation: authorisation
} as const

type TableName = keyof typeof tableMap

const clearDBTables = (tables: TableName[]) => {
  beforeEach(async () => {
    for (const table of tables) {
      await db().delete(tableMap[table]).execute()
    }
  })
}

export { clearDBTables }
