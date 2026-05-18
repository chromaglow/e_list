import 'server-only'
import { drizzle } from 'drizzle-orm/libsql'
import { env } from '@/lib/env'
import * as schema from '@/lib/schema'

export const db = drizzle({ connection: { url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN }, schema })
