import { pgTable, varchar, primaryKey, uniqueIndex, integer, index } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'

export const authorisation = pgTable(
  'authorisation',
  {
    provider_type: varchar('provider_type', { length: 255 }).notNull(),
    provider_user_id: varchar('provider_user_id', { length: 255 }).notNull(),
    user_id: integer('user_id').notNull()
  },
  (table) => ({
    primaryKey: primaryKey({
      name: 'primary_key',
      columns: [table.provider_type, table.provider_user_id, table.user_id]
    }),
    uniqueProviderUser: uniqueIndex('unique_provider_user').on(
      table.provider_type,
      table.provider_user_id
    ),
    userIdIndex: index('authorisations_user_id_index').on(table.user_id)
  })
)

// Select Key Schema
export const selectAuthorisationSchema = createSelectSchema(authorisation)
