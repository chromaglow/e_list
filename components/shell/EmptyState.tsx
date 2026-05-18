// components/shell/EmptyState.tsx — Empty state for the browse page.
// Server Component (rendered server-side only).
// D-09: Phase 2 drops listing cards into the grid area without layout rework.

export default function EmptyState() {
  return (
    <div className="mx-auto max-w-screen-sm px-4 py-12 text-center">
      <p className="text-muted-foreground text-base">Nothing here yet.</p>
      <p className="mt-2 text-sm text-muted-foreground/70">
        Listings will appear here once friends start posting.
      </p>
    </div>
  )
}
