// app/[token]/page.tsx — Browse page.
// Server Component — proxy.ts has already validated the invite token.
// Phase 2: fetches active listings and renders ListingCard list or EmptyState.

import AppHeader from '@/components/shell/AppHeader'
import EmptyState from '@/components/shell/EmptyState'
import { getActiveListings } from '@/lib/listing-service'
import ListingCard from '@/components/listings/ListingCard'

// Force dynamic rendering — proxy validation runs per-request.
// Do not let Next.js statically optimize the token segment.
export const dynamic = 'force-dynamic'

export default async function BrowsePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const activeListings = await getActiveListings()

  return (
    <>
      <AppHeader token={token} />
      <main className="min-h-[calc(100dvh-3.5rem)]">
        {activeListings.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mx-auto max-w-screen-sm px-4 py-4 space-y-4">
            {activeListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
