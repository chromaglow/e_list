// components/shell/AppHeader.tsx — Sticky mobile-first header.
// Server Component (rendered server-side only).
// Phase 2: "Post an item" Link wired to /[token]/new using buttonVariants().

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default function AppHeader({ token }: { token: string }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-screen-sm px-4 py-3 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <Link href={`/${token}`} className="text-lg font-semibold tracking-tight">FriendSwap</Link>
          <a
            href="https://buymeacoffee.com/chromaglow"
            target="_blank"
            rel="noopener noreferrer"
            title="Support FriendSwap"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >Donate</a>
        </div>
        <a href="https://youtu.be/bM01Al2SWx4?si=u2S-cgktKoRv3RLQ" target="_blank" rel="noopener noreferrer">
          <img src="/header.png" alt="" className="h-16 w-auto object-contain mix-blend-multiply dark:mix-blend-screen" />
        </a>
        <Link href={`/${token}/new`} className={buttonVariants()}>
          Post an item
        </Link>
      </div>
      <Link
        href={`/${token}/admin/login`}
        className="absolute top-0 right-0 w-6 h-6 opacity-0"
        aria-hidden="true"
        tabIndex={-1}
      />
    </header>
  )
}
