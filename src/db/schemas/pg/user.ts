import { pgEnum, varchar, boolean, uniqueIndex, pgTable, serial } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'

export const roleEnum = pgEnum('role', ['user', 'admin'])

export const user = pgTable(
  'user',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }),
    password: varchar('password', { length: 255 }),
    email: varchar('email', { length: 255 }).notNull().unique(),
    is_email_verified: boolean('is_email_verified').notNull().default(false),
    role: roleEnum('role').notNull().default('user')
  },
  (table) => ({
    emailIndex: uniqueIndex('user_email_index').on(table.email)
  })
)

// Select User Schema
export const selectUserSchema = createSelectSchema(user)
