// components/shell/AppHeader.tsx — Sticky mobile-first header.
// Server Component (rendered server-side only).
// D-10: "Post an item" button is present as a disabled placeholder.
// Phase 2 wires up the button action.

import { Button } from '@/components/ui/button'

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-screen-sm px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">FriendSwap</h1>
        <Button
          disabled={true}
          aria-label="Post an item (coming in Phase 2)"
          title="Coming soon"
          className="cursor-not-allowed"
        >
          Post an item
        </Button>
      </div>
    </header>
  )
}
