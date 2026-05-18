import 'server-only'
import { db } from '@/lib/db'
import { listings } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'
import type { Listing, NewListing } from '@/lib/schema'

export async function getActiveListings(): Promise<Listing[]> {
  return db
    .select()
    .from(listings)
    .where(eq(listings.status, 'active'))
    .orderBy(desc(listings.created_at))
}

export async function createListing(data: NewListing): Promise<void> {
  await db.insert(listings).values(data)
}
