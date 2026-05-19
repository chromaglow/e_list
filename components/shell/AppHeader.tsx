// components/shell/AppHeader.tsx — Sticky mobile-first header.
// Server Component (rendered server-side only).
// Phase 2: "Post an item" Link wired to /[token]/new using buttonVariants().

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default function AppHeader({ token }: { token: string }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-screen-sm px-4 py-3 flex items-center justify-between">
        <Link href={`/${token}`} className="text-lg font-semibold tracking-tight">FriendSwap</Link>
        <Link href={`/${token}/new`} className={buttonVariants()}>
          Post an item
        </Link>
      </div>
    </header>
  )
}
