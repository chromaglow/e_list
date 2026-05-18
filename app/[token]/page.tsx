// app/[token]/page.tsx — Browse page (empty shell).
// Server Component — proxy.ts has already validated the invite token.
// D-09: Styled shell with header + empty state; Phase 2 drops listing cards in.
// D-10: "Post an item" button is present but disabled in AppHeader.

import AppHeader from '@/components/shell/AppHeader'
import EmptyState from '@/components/shell/EmptyState'

// Force dynamic rendering — proxy validation runs per-request.
// Do not let Next.js statically optimize the token segment.
export const dynamic = 'force-dynamic'

export default function BrowsePage() {
  return (
    <>
      <AppHeader />
      <main className="min-h-[calc(100dvh-3.5rem)]">
        <EmptyState />
      </main>
    </>
  )
}
