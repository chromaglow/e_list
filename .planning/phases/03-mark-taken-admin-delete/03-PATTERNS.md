# Phase 3: Mark Taken + Admin Delete — Pattern Map

**Mapped:** 2026-05-18
**Files analyzed:** 10 new/modified files
**Analogs found:** 10 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/schema.ts` | model | CRUD | `lib/schema.ts` (existing) | exact — additive |
| `lib/listing-service.ts` | service | CRUD | `lib/listing-service.ts` (existing) | exact — additive |
| `lib/settings-service.ts` | service | CRUD | `lib/listing-service.ts` | role-match |
| `app/[token]/api/listings/[id]/route.ts` | route handler | request-response | `app/[token]/api/listings/route.ts` | exact |
| `app/[token]/admin/api/regen-invite/route.ts` | route handler | request-response | `app/[token]/api/admin/logout/route.ts` | role-match |
| `components/listings/MarkTakenButton.tsx` | component (client island) | request-response | `components/admin/LogoutButton.tsx` | role-match |
| `components/listings/AdminDeleteButton.tsx` | component (client island) | request-response | `components/admin/LoginForm.tsx` | role-match |
| `components/listings/ListingCard.tsx` | component (server) | request-response | `components/listings/ListingCard.tsx` (existing) | exact — additive |
| `app/[token]/page.tsx` | page (server component) | request-response | `app/[token]/page.tsx` (existing) | exact — additive |
| `app/[token]/admin/page.tsx` | page (server component) | request-response | `app/[token]/admin/page.tsx` (existing) | exact — additive |
| `proxy.ts` | middleware | request-response | `proxy.ts` (existing) | exact — additive |

---

## Pattern Assignments

### `lib/schema.ts` (model, CRUD — additive)

**Analog:** `lib/schema.ts` (existing)

**Existing table pattern** (lines 1–21):
```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const listings = sqliteTable('listings', {
  id:           text('id').primaryKey(),
  // ... columns ...
  status:       text('status', { enum: ['active', 'taken', 'deleted'] }).notNull().default('active'),
  created_at:   integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  taken_at:     integer('taken_at',   { mode: 'timestamp' }),
  deleted_at:   integer('deleted_at', { mode: 'timestamp' }),
})

export type Listing    = typeof listings.$inferSelect
export type NewListing = typeof listings.$inferInsert
```

**New `settings` table to append** — copy the `sqliteTable` pattern with `text().primaryKey()`:
```typescript
export const settings = sqliteTable('settings', {
  key:   text('key').primaryKey(),
  value: text('value').notNull(),
})

export type Setting    = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert
```

**Migration pattern:** `drizzle-kit generate` produces `drizzle/0001_settings_table.sql`. The migration SQL must include an `INSERT OR IGNORE` seed for `invite_token`:
```sql
-- drizzle/0001_settings_table.sql (generated then manually appended)
CREATE TABLE `settings` (
  `key` text PRIMARY KEY NOT NULL,
  `value` text NOT NULL
);
-- Seed invite_token from env var at migration time
INSERT OR IGNORE INTO `settings` (`key`, `value`) VALUES ('invite_token', (SELECT value FROM pragma_database_list WHERE name='main'));
```
Note: The seed INSERT must be provided via the migration file or a seed script — drizzle-kit only generates DDL, not DML seeds. The implementer should hand-append the seed row or use `drizzle/seed.ts`.

---

### `lib/listing-service.ts` (service, CRUD — additive)

**Analog:** `lib/listing-service.ts` (existing)

**Existing import and function pattern** (lines 1–17):
```typescript
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
```

**Three functions to add — copy this exact Drizzle pattern:**

`getListingsByFilter` — add `inArray` to imports; use `or(eq(...), eq(...))` if `inArray` is unavailable:
```typescript
import { eq, desc, or, inArray } from 'drizzle-orm'

export type ListingFilter = 'active' | 'taken' | 'all'

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
```

`markListingTaken` — uses `update().set().where()` with `and()` guard:
```typescript
import { eq, desc, and, or, inArray } from 'drizzle-orm'

export async function markListingTaken(id: string): Promise<void> {
  await db
    .update(listings)
    .set({ status: 'taken', taken_at: new Date() })
    .where(and(eq(listings.id, id), eq(listings.status, 'active')))
}
```

`deleteListingAdmin` — same `update().set().where()` shape:
```typescript
export async function deleteListingAdmin(id: string): Promise<void> {
  await db
    .update(listings)
    .set({ status: 'deleted', deleted_at: new Date() })
    .where(eq(listings.id, id))
}
```

---

### `lib/settings-service.ts` (service, CRUD — new file)

**Analog:** `lib/listing-service.ts`

**Import block — copy exactly:**
```typescript
import 'server-only'
import { db } from '@/lib/db'
import { settings } from '@/lib/schema'
import { eq } from 'drizzle-orm'
```

**Core pattern — single-row select with `.get()`, upsert with `onConflictDoUpdate`:**
```typescript
export async function getSetting(key: string): Promise<string | null> {
  const row = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .get()
  return row?.value ?? null
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
}
```

**Note:** `.get()` returns `T | undefined` (single row). `onConflictDoUpdate` is the Drizzle SQLite upsert — equivalent to `INSERT OR REPLACE` but safer.

---

### `app/[token]/api/listings/[id]/route.ts` (route handler, request-response — new file)

**Analog:** `app/[token]/api/listings/route.ts` (lines 1–46)

**Imports pattern** (copy from analog lines 1–4, add crypto and session):
```typescript
import { z } from 'zod'
import { timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { listings } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { verifyAdminSession } from '@/lib/session'
import { markListingTaken, deleteListingAdmin } from '@/lib/listing-service'
```

**Zod schema + JSON parse pattern** (copy from analog lines 6–25):
```typescript
const MarkTakenSchema = z.object({
  editToken: z.string().min(1).max(500),
})

// In handler:
let json: unknown
try {
  json = await request.json()
} catch {
  return Response.json({ error: 'Invalid request' }, { status: 400 })
}

const parsed = MarkTakenSchema.safeParse(json)
if (!parsed.success) {
  return Response.json({ error: 'Invalid request' }, { status: 400 })
}
```

**Timing-safe token comparison pattern** (copy from `proxy.ts` lines 31–39):
```typescript
let tokenMatch = false
try {
  const a = Buffer.from(parsed.data.editToken)
  const b = Buffer.from(listing.edit_token)
  if (a.length === b.length && a.length > 0) {
    tokenMatch = timingSafeEqual(a, b)
  }
} catch {
  tokenMatch = false
}
if (!tokenMatch) return Response.json({ error: 'Forbidden' }, { status: 403 })
```

**Admin session verification pattern** (copy from `app/[token]/admin/page.tsx` lines 1–18):
```typescript
// In DELETE handler:
const sessionCookie = (await cookies()).get('admin_session')?.value
const session = await verifyAdminSession(sessionCookie)
if (!session) return Response.json({ error: 'Forbidden' }, { status: 403 })
```

**Route handler signature** (copy params Promise pattern from analog):
```typescript
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { id } = await params
  // ...
  return Response.json({ ok: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { id } = await params
  // ...
  return Response.json({ ok: true })
}
```

---

### `app/[token]/admin/api/regen-invite/route.ts` (route handler, request-response — new file)

**Analog:** `app/[token]/api/admin/logout/route.ts` (lines 1–6) + `app/[token]/api/admin/login/route.ts` (lines 1–37)

**Minimal admin-gated POST handler shape** (from logout analog):
```typescript
// logout/route.ts — minimal admin handler shape to copy
import { deleteAdminSession } from '@/lib/session'

export async function POST() {
  await deleteAdminSession()
  return Response.json({ success: true })
}
```

**Admin JWT gate + defense in depth** (copy from login route, lines 7–11 + admin page lines 16–18):
```typescript
import { cookies } from 'next/headers'
import { verifyAdminSession } from '@/lib/session'
import { setSetting } from '@/lib/settings-service'

export async function POST() {
  // Defense in depth — middleware already gated /admin/* but verify here too
  const sessionCookie = (await cookies()).get('admin_session')?.value
  const session = await verifyAdminSession(sessionCookie)
  if (!session) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const newToken = crypto.randomBytes(32).toString('hex')  // 64 hex chars
  await setSetting('invite_token', newToken)

  return Response.json({ newToken })
}
```

**Note:** `crypto` here is the Node.js built-in `node:crypto` — must import explicitly: `import { randomBytes } from 'node:crypto'`.

---

### `components/listings/MarkTakenButton.tsx` (component, client island — new file)

**Analog:** `components/admin/LogoutButton.tsx` (lines 1–16) — simplest 'use client' fetch-on-click pattern

**LogoutButton base pattern** (lines 1–16):
```typescript
'use client'

import { Button } from '@/components/ui/button'

export default function LogoutButton({ token }: { token: string }) {
  async function handleLogout() {
    await fetch(`/${token}/api/admin/logout`, { method: 'POST' })
    window.location.href = `/${token}/admin/login`
  }

  return (
    <Button variant="outline" onClick={handleLogout}>
      Log out
    </Button>
  )
}
```

**Additions for MarkTakenButton:** localStorage check in `useEffect` (no-op on server), `isPending` state, `useRouter().refresh()` on success. Copy `useState`/`useEffect` pattern from `components/listings/CreateListingForm.tsx` lines 1–21:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function MarkTakenButton({
  listingId,
  token,
}: {
  listingId: string
  token: string
}) {
  const router = useRouter()
  const [hasToken, setHasToken] = useState(false)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(`edit_token_${listingId}`)
    setHasToken(!!stored)
  }, [listingId])

  if (!hasToken) return null

  async function handleClick() {
    const editToken = localStorage.getItem(`edit_token_${listingId}`)
    if (!editToken) return
    setIsPending(true)
    const res = await fetch(`/${token}/api/listings/${listingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editToken }),
    })
    if (res.ok) {
      router.refresh()  // re-fetch server component data — card disappears from Active tab
    }
    setIsPending(false)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? 'Marking…' : 'Mark as taken'}
    </Button>
  )
}
```

**Critical:** `hasToken` initializes to `false` — same value the server would render — preventing hydration mismatch.

---

### `components/listings/AdminDeleteButton.tsx` (component, client island — new file)

**Analog:** `components/admin/LoginForm.tsx` — 'use client' with async fetch, error state, status feedback (lines 1–88)

**Key patterns to copy from LoginForm:**
- `useState` for pending + error state (lines 9–11)
- `try/catch` around `fetch` (lines 18–42)
- `Button` component import (line 4)
- Status-based button text (line 81)

**AdminDeleteButton shape:**
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdminDeleteButton({
  listingId,
  token,
}: {
  listingId: string
  token: string
}) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  async function handleClick() {
    // D-09: confirm dialog before delete
    if (!window.confirm('Delete this listing?')) return
    setIsPending(true)
    try {
      const res = await fetch(`/${token}/api/listings/${listingId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.refresh()
      }
    } catch {
      // non-fatal — card will still be visible; user can retry
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Delete listing"
    >
      <Trash2 className="size-4" />
    </Button>
  )
}
```

---

### `components/listings/ListingCard.tsx` (component, server — additive)

**Analog:** `components/listings/ListingCard.tsx` (existing, lines 1–65)

**Existing props signature** (line 11):
```typescript
export default function ListingCard({ listing }: { listing: Listing }) {
```

**New props signature — extend by adding `isAdmin` and `token`:**
```typescript
interface Props {
  listing: Listing
  token: string
  isAdmin: boolean
}

export default function ListingCard({ listing, token, isAdmin }: Props) {
```

**New button area to add inside `<div className="px-4 pt-3 pb-4">`** — after the existing date `<time>` element:
```typescript
import MarkTakenButton from './MarkTakenButton'
import AdminDeleteButton from './AdminDeleteButton'

// Add at bottom of content div, after the <time> element:
<div className="mt-3 flex gap-2">
  <MarkTakenButton listingId={listing.id} token={token} />
  {isAdmin && <AdminDeleteButton listingId={listing.id} token={token} />}
</div>
```

**Server Component stays intact** — no `'use client'` added. The two islands are themselves Client Components.

---

### `app/[token]/page.tsx` (page, server component — additive)

**Analog:** `app/[token]/page.tsx` (existing, lines 1–38) + `app/[token]/admin/page.tsx` (lines 1–30)

**Existing import + function signature** (lines 1–22):
```typescript
import AppHeader from '@/components/shell/AppHeader'
import EmptyState from '@/components/shell/EmptyState'
import { getActiveListings } from '@/lib/listing-service'
import ListingCard from '@/components/listings/ListingCard'

export const dynamic = 'force-dynamic'

export default async function BrowsePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const activeListings = await getActiveListings()
```

**Admin session detection — copy verbatim from `admin/page.tsx` lines 1–18:**
```typescript
import { cookies } from 'next/headers'
import { verifyAdminSession } from '@/lib/session'

// In BrowsePage:
const sessionCookie = (await cookies()).get('admin_session')?.value
const isAdmin = !!(await verifyAdminSession(sessionCookie))
```

**searchParams — add to function signature and read filter:**
```typescript
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
  const listings = await getListingsByFilter(validFilter)
```

**Pass new props to ListingCard** (replace existing map, line 32):
```typescript
{listings.map((listing) => (
  <ListingCard key={listing.id} listing={listing} token={token} isAdmin={isAdmin} />
))}
```

**FilterTabs component** — new `'use client'` component using `<Link>` navigation; add above the listing grid. Import pattern from `AppHeader` (which uses `Link` from `next/link`):
```typescript
// components/listings/FilterTabs.tsx
'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
```

---

### `app/[token]/admin/page.tsx` (page, server component — additive)

**Analog:** `app/[token]/admin/page.tsx` (existing, lines 1–30)

**Existing full file** (lines 1–30):
```typescript
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AppHeader from '@/components/shell/AppHeader'
import { verifyAdminSession } from '@/lib/session'
import LogoutButton from '@/components/admin/LogoutButton'

export const dynamic = 'force-dynamic'

export default async function AdminPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const sessionCookie = (await cookies()).get('admin_session')?.value
  const session = await verifyAdminSession(sessionCookie)
  if (!session) redirect(`/${token}/admin/login`)

  return (
    <>
      <AppHeader token={token} />
      <main className="mx-auto max-w-screen-sm px-4 py-12">
        <h2 className="mb-4 text-lg font-semibold">Admin</h2>
        <p className="mb-6 text-sm text-muted-foreground">Logged in as admin.</p>
        <LogoutButton token={token} />
      </main>
    </>
  )
}
```

**Additions:** Add `RegenInviteForm` client component below `LogoutButton`. The form calls `POST /{token}/admin/api/regen-invite`, then displays the new URL in a read-only input. Pattern the form on `LoginForm.tsx` (fetch + state + display result). The server page only adds the import and renders the component — no logic change to the session check.

---

### `proxy.ts` (middleware, request-response — additive)

**Analog:** `proxy.ts` (existing, lines 1–72)

**Existing timingSafeEqual pattern to preserve** (lines 30–45):
```typescript
let tokenMatch = false
try {
  const expectedToken = env.INVITE_TOKEN
  const a = Buffer.from(urlToken, 'hex')
  const b = Buffer.from(expectedToken, 'hex')
  if (urlToken.length === expectedToken.length && urlToken.length > 0) {
    tokenMatch = timingSafeEqual(a, b)
  }
} catch {
  tokenMatch = false
}
```

**Replace `env.INVITE_TOKEN` with DB cache** — add at module scope (before `export async function proxy`):
```typescript
// Module-level cache — survives across requests in the same Node.js process (Vercel warm instance)
let tokenCache: { value: string; expiresAt: number } | null = null
const CACHE_TTL_MS = 60_000

async function getInviteToken(): Promise<string> {
  const now = Date.now()
  if (tokenCache && tokenCache.expiresAt > now) {
    return tokenCache.value
  }
  const { db } = await import('@/lib/db')
  const { settings } = await import('@/lib/schema')
  const { eq } = await import('drizzle-orm')
  const row = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'invite_token'))
    .get()
  // Fallback to env var during transition (Pitfall 6 guard)
  const value = row?.value ?? env.INVITE_TOKEN
  tokenCache = { value, expiresAt: now + CACHE_TTL_MS }
  return value
}
```

**Update comparison block** (replace `env.INVITE_TOKEN` reference):
```typescript
const expectedToken = await getInviteToken()
```

**Export runtime declaration** — add at top of file (required for LibSQL in middleware):
```typescript
export const runtime = 'nodejs'
```

**Also update the admin redirect** (line 57) which currently hardcodes `env.INVITE_TOKEN`:
```typescript
// Before:
new URL(`/${env.INVITE_TOKEN}/admin/login`, request.url)
// After:
new URL(`/${await getInviteToken()}/admin/login`, request.url)
```

---

## Shared Patterns

### Admin Session Verification
**Source:** `app/[token]/admin/page.tsx` lines 1–18
**Apply to:** `app/[token]/api/listings/[id]/route.ts` (DELETE), `app/[token]/admin/api/regen-invite/route.ts`, `app/[token]/page.tsx`
```typescript
import { cookies } from 'next/headers'
import { verifyAdminSession } from '@/lib/session'

const sessionCookie = (await cookies()).get('admin_session')?.value
const session = await verifyAdminSession(sessionCookie)
if (!session) return Response.json({ error: 'Forbidden' }, { status: 403 })
// or: if (!session) redirect(`/${token}/admin/login`)
```

### Timing-Safe Token Comparison
**Source:** `proxy.ts` lines 30–39
**Apply to:** `app/[token]/api/listings/[id]/route.ts` (PATCH handler)
```typescript
import { timingSafeEqual } from 'node:crypto'

let tokenMatch = false
try {
  const a = Buffer.from(suppliedToken)
  const b = Buffer.from(storedToken)
  if (a.length === b.length && a.length > 0) {
    tokenMatch = timingSafeEqual(a, b)
  }
} catch {
  tokenMatch = false
}
if (!tokenMatch) return Response.json({ error: 'Forbidden' }, { status: 403 })
```

### Zod Validation + JSON Parse
**Source:** `app/[token]/api/listings/route.ts` lines 6–25
**Apply to:** `app/[token]/api/listings/[id]/route.ts` (PATCH)
```typescript
import { z } from 'zod'

const Schema = z.object({ ... })

let json: unknown
try {
  json = await request.json()
} catch {
  return Response.json({ error: 'Invalid request' }, { status: 400 })
}
const parsed = Schema.safeParse(json)
if (!parsed.success) {
  return Response.json({ error: 'Invalid request' }, { status: 400 })
}
```

### Client Component Fetch-on-Click
**Source:** `components/admin/LogoutButton.tsx` lines 1–16
**Apply to:** `MarkTakenButton.tsx`, `AdminDeleteButton.tsx`, `RegenInviteForm` (admin page)
```typescript
'use client'
import { Button } from '@/components/ui/button'

export default function ActionButton({ token }: { token: string }) {
  async function handleClick() {
    const res = await fetch(`/${token}/api/...`, { method: 'POST' })
    if (res.ok) { /* handle success */ }
  }
  return <Button onClick={handleClick}>Action</Button>
}
```

### Server Component Params Pattern
**Source:** `app/[token]/page.tsx` lines 14–20 and `app/[token]/admin/page.tsx` lines 10–14
**Apply to:** all modified/new page files
```typescript
export default async function PageComponent({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  // searchParams: Promise<{ filter?: string }> — add when needed
```

### Drizzle Service Function Shape
**Source:** `lib/listing-service.ts` lines 1–17
**Apply to:** all new functions in `lib/listing-service.ts`, `lib/settings-service.ts`
```typescript
import 'server-only'
import { db } from '@/lib/db'
import { listings } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'

export async function functionName(): Promise<ReturnType> {
  return db.select().from(table).where(...).orderBy(...)
  // or:
  await db.update(table).set({...}).where(eq(table.id, id))
}
```

### `export const dynamic = 'force-dynamic'`
**Source:** `app/[token]/page.tsx` line 12, `app/[token]/admin/page.tsx` line 8
**Apply to:** all page-level Server Components in this phase (browse page, admin page)

---

## No Analog Found

All Phase 3 files have close analogs in the existing codebase. No files require falling back to RESEARCH.md patterns exclusively.

| File | Note |
|------|------|
| `lib/settings-service.ts` | New file with no exact match, but `lib/listing-service.ts` is a near-identical structural analog (same `server-only`, `db`, `schema`, `drizzle-orm` import pattern) |
| `components/listings/FilterTabs.tsx` | No existing tab/filter component. Use RESEARCH.md Pattern 3 (`useSearchParams` + `<Link>`) as the primary reference; style after `AppHeader.tsx` className conventions |

---

## Metadata

**Analog search scope:** `app/`, `lib/`, `components/`, `proxy.ts`, `drizzle/`
**Files read:** 18
**Pattern extraction date:** 2026-05-18
