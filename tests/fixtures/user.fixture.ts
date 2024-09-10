import { faker } from '@faker-js/faker'
import bcrypt from 'bcryptjs'
import { type Insertable } from 'kysely'
import { type UserTable } from '../../src/models/user.model'
import db from '@/db'
import { user } from '@/db/schemas/pg/user'

const password = 'password1'
const salt = bcrypt.genSaltSync(8)
const hashedPassword = bcrypt.hashSync(password, salt)

export type MockUser = Insertable<UserTable>

export interface UserResponse {
  id: number
  name: string
  email: string
  role: string
  is_email_verified: boolean
}

export const userOne: MockUser = {
  name: faker.person.fullName(),
  email: faker.internet.email().toLowerCase(),
  password,
  role: 'user',
  is_email_verified: false
}

export const userTwo: MockUser = {
  name: faker.person.fullName(),
  email: faker.internet.email().toLowerCase(),
  password,
  role: 'user',
  is_email_verified: false
}

export const admin: MockUser = {
  name: faker.person.fullName(),
  email: faker.internet.email().toLowerCase(),
  password,
  role: 'admin',
  is_email_verified: false
}

export const insertUsers = async (users: MockUser[]) => {
  const hashedUsers = users.map((user) => ({
    ...user,
    password: user.password ? hashedPassword : null
  }))
  const results: number[] = []
  for await (const userData of hashedUsers) {
    const [inserted] = await db().insert(user).values(userData).returning({ id: user.id })
    if (inserted && inserted.id) {
      results.push(inserted.id)
    }
  }
  return results
}
