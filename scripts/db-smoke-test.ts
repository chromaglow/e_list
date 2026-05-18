import { config } from 'dotenv'
config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/libsql'
import { listings } from '../lib/schema'

async function main() {
  const db = drizzle({
    connection: {
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    },
  })
  const rows = await db.select().from(listings)
  console.log(`smoke-test ok: ${rows.length} listing(s) in table`)
  if (rows.length > 0) {
    console.log('columns:', Object.keys(rows[0]))
  }
  process.exit(0)
}

main()
