import { defineConfig } from 'drizzle-kit'
import process from 'node:process'

export default defineConfig({
  dialect: 'postgresql', // "mysql" | "sqlite" | "postgresql"
  schema: './src/db/schemas/pg/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
})
