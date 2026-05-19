import 'server-only'
import { db } from '@/lib/db'
import { listings } from '@/lib/schema'
import { eq, desc, and, inArray } from 'drizzle-orm'
import type { Listing, NewListing } from '@/lib/schema'

export type ListingFilter = 'active' | 'taken' | 'all'

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

export async function getListingsByFilter(filter: ListingFilter): Promise<Listing[]> {
  if (filter === 'all') {
    return db
      .select()
      .from(listings)
      .where(inArray(listings.status, ['active', 'taken']))
      .orderBy(desc(listings.created_at))
  }
  return db
    .select()
    .from(listings)
    .where(eq(listings.status, filter))
    .orderBy(desc(listings.created_at))
}

export async function markListingTaken(id: string): Promise<void> {
  await db
    .update(listings)
    .set({ status: 'taken', taken_at: new Date() })
    .where(and(eq(listings.id, id), eq(listings.status, 'active')))
}

export async function deleteListingAdmin(id: string): Promise<void> {
  await db
    .update(listings)
    .set({ status: 'deleted', deleted_at: new Date() })
    .where(eq(listings.id, id))
}
