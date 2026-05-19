// app/[token]/page.tsx — Browse page.
// Server Component — proxy.ts has already validated the invite token.
// Phase 3: supports filter tabs, admin detection, and getListingsByFilter.

import { cookies } from 'next/headers'
import AppHeader from '@/components/shell/AppHeader'
import EmptyState from '@/components/shell/EmptyState'
import { getListingsByFilter } from '@/lib/listing-service'
import { verifyAdminSession } from '@/lib/session'
import ListingCard from '@/components/listings/ListingCard'
import FilterTabs from '@/components/listings/FilterTabs'

// Force dynamic rendering — proxy validation runs per-request.
// Do not let Next.js statically optimize the token segment.
export const dynamic = 'force-dynamic'

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ filter?: string }>
}) {
  const { token } = await params
  const { filter } = await searchParams
  const validFilter = filter === 'taken' || filter === 'all' ? filter : 'active'
  const activeListings = await getListingsByFilter(validFilter)

  const sessionCookie = (await cookies()).get('admin_session')?.value
  const isAdmin = !!(await verifyAdminSession(sessionCookie))

  return (
    <>
      <AppHeader token={token} />
      <main className="min-h-[calc(100dvh-3.5rem)]">
        <FilterTabs token={token} />
        {activeListings.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mx-auto max-w-screen-sm px-4 py-4 space-y-4">
            {activeListings.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} token={token} isAdmin={isAdmin} priority={i === 0} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
