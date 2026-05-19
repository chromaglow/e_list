'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const TABS = [
  { label: 'Active', value: 'active' },
  { label: 'Taken', value: 'taken' },
  { label: 'All', value: 'all' },
]

export default function FilterTabs({ token }: { token: string }) {
  const searchParams = useSearchParams()
  const current = searchParams.get('filter') ?? 'active'

  return (
    <nav className="flex gap-2 px-4 pt-3 pb-1">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={`/${token}?filter=${tab.value}`}
          scroll={false}
          className={
            current === tab.value
              ? 'px-3 py-1.5 rounded-full bg-foreground text-background text-sm font-medium'
              : 'px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground'
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
