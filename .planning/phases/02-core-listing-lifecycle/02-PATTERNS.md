# Phase 2: Core Listing Lifecycle - Pattern Map

**Mapped:** 2026-05-18
**Files analyzed:** 10 (new/modified)
**Analogs found:** 9 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/[token]/new/page.tsx` | page (Server Component shell) | request-response | `app/[token]/admin/login/page.tsx` | exact |
| `app/[token]/api/listings/route.ts` | route handler | CRUD (write) | `app/[token]/api/admin/login/route.ts` | exact |
| `components/listings/CreateListingForm.tsx` | component (Client) | request-response + file I/O | `components/admin/LoginForm.tsx` | exact |
| `components/listings/ListingCard.tsx` | component (Server) | transform (prop → render) | `components/shell/EmptyState.tsx` | role-match |
| `components/shell/AppHeader.tsx` | component (Server, modify) | request-response | `components/shell/AppHeader.tsx` (self) | self |
| `lib/listing-service.ts` | service / data-access layer | CRUD (read + write) | `lib/session.ts` | role-match |
| `lib/listing-service.test.ts` | test | — | `lib/upload-validators.test.ts` | exact |
| `app/[token]/api/listings/route.test.ts` | test | — | `app/[token]/api/admin/login/route.test.ts` | exact |
| `app/[token]/page.tsx` | page (Server Component, modify) | CRUD (read) | `app/[token]/admin/page.tsx` | exact |
| `next.config.ts` | config (modify) | — | `next.config.ts` (self) | self |

---

## Pattern Assignments

### `app/[token]/new/page.tsx` (page, request-response)

**Analog:** `app/[token]/admin/login/page.tsx`

**Imports pattern** (lines 1-3):
```typescript
import AppHeader from '@/components/shell/AppHeader'
import LoginForm from '@/components/admin/LoginForm'
```

**Page shell pattern** (lines 1-20, full file):
```typescript
import AppHeader from '@/components/shell/AppHeader'
import LoginForm from '@/components/admin/LoginForm'

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return (
    <>
      <AppHeader />
      <main className="min-h-[calc(100dvh-3.5rem)]">
        <LoginForm token={token} />
      </main>
    </>
  )
}
```

**Adaptation notes:**
- Replace `LoginForm` import with `CreateListingForm` from `@/components/listings/CreateListingForm`
- Pass `token` as prop to `CreateListingForm` (same pattern as `LoginForm`)
- Pass `token` to `AppHeader` (Phase 2 adds `token` prop — see AppHeader section)
- Keep `export const dynamic = 'force-dynamic'` — same rationale (per-request param)
- `main` className stays `min-h-[calc(100dvh-3.5rem)]` for full-bleed layout

---

### `app/[token]/api/listings/route.ts` (route handler, CRUD write)

**Analog:** `app/[token]/api/admin/login/route.ts`

**Imports pattern** (lines 1-5):
```typescript
import { compare } from 'bcryptjs'
import { createAdminSession } from '@/lib/session'
import { checkRateLimit } from '@/lib/rate-limit'
import { loginSchema } from '@/lib/admin-validators'
import { env } from '@/lib/env'
```

**Request parsing + Zod validation pattern** (lines 7-22):
```typescript
export async function POST(request: Request) {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
  // ...destructure parsed.data
}
```

**Success response pattern** (line 36-37):
```typescript
return Response.json({ success: true })
```

**Adaptation notes for `listings/route.ts`:**
- Import `db` from `@/lib/db`, `listings` schema from `@/lib/schema`, `nanoid` from `nanoid`
- Use `Response.json()` not `NextResponse.json()` — the login route uses `Response.json()` directly (no NextResponse import); the upload route uses NextResponse — prefer `Response.json()` for consistency with the login route pattern
- Schema: define inline `CreateListingSchema` with `z.object({...})` similar to `loginSchema` in `lib/admin-validators.ts`
- Success response: `return Response.json({ id, editToken })` instead of `{ success: true }`
- No rate limiting needed (invite-gated app; token entropy is the gate)
- Generate `id = nanoid()` and `editToken = crypto.randomUUID()` before the DB insert

---

### `components/listings/CreateListingForm.tsx` (component, Client, request-response + file I/O)

**Analog:** `components/admin/LoginForm.tsx`

**'use client' + imports pattern** (lines 1-4):
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
```

**Props signature pattern** (line 6):
```typescript
export default function LoginForm({ token }: { token: string }) {
```

**Pending + error state pattern** (lines 8-11):
```typescript
const [submitting, setSubmitting] = useState(false)
const [error, setError] = useState<string | null>(null)
```

**handleSubmit skeleton pattern** (lines 12-43):
```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setSubmitting(true)
  setError(null)

  try {
    const res = await fetch(`/${token}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (res.ok) {
      window.location.href = `/${token}/admin`
      return
    }

    if (res.status === 401) {
      setError('Invalid credentials')
    } else if (res.status === 429) {
      setError('Too many attempts — try again later')
    } else if (res.status === 400) {
      setError('Please enter both fields')
    } else {
      setError('Could not reach server')
    }
  } catch {
    setError('Could not reach server')
  } finally {
    setSubmitting(false)
  }
}
```

**Error display + button disabled pattern** (lines 77-82):
```typescript
{error && (
  <p role="alert" className="text-sm text-destructive">
    {error}
  </p>
)}
<Button type="submit" disabled={submitting} className="w-full">
  {submitting ? 'Signing in…' : 'Sign in'}
</Button>
```

**Card wrapper + form layout pattern** (lines 46-50):
```typescript
<div className="mx-auto max-w-screen-sm px-4 py-12">
  <div className="rounded-lg border bg-card p-6 shadow-sm">
    <h2 className="mb-6 text-lg font-semibold">Admin sign in</h2>
    <form onSubmit={handleSubmit} className="space-y-4">
```

**Input field pattern** (lines 51-65):
```typescript
<div className="space-y-1.5">
  <label htmlFor="username" className="text-sm font-medium">
    Username
  </label>
  <input
    id="username"
    type="text"
    autoComplete="username"
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
  />
</div>
```

**Adaptation notes for `CreateListingForm.tsx`:**
- Add `useRef` for the file input ref and `formRef` for form reset
- Add `useEffect` import for URL.revokeObjectURL cleanup
- Add `upload` from `@vercel/blob/client` and `isAllowedMagicBytes` from `@/lib/upload-validators`
- Add additional state: `previewUrl`, `success` boolean
- File input uses `type="file"`, `accept="image/jpeg,image/png,image/webp"`, `capture="environment"`
- On file change: `URL.createObjectURL(file)` → `setPreviewUrl`
- On form submit: magic byte check → `upload()` → `POST /${token}/api/listings` → `localStorage.setItem` → `setSuccess(true)` → setTimeout reset
- On success, show success banner (`setSuccess(true)`) instead of redirecting
- After 3 s timeout: `formRef.current?.reset()`, `setSuccess(false)`, revoke preview URL
- The `fetch` URL is `/${token}/api/listings` (not `/api/admin/login`)
- Response destructure: `const { id, editToken } = await res.json()` then `localStorage.setItem(\`edit_token_${id}\`, editToken)`

---

### `components/listings/ListingCard.tsx` (component, Server, transform)

**Analog:** `components/shell/EmptyState.tsx` (closest Server Component, but minimal; treat as structural reference only)

**Server Component structural pattern** (`components/shell/EmptyState.tsx`, lines 1-14, full file):
```typescript
// components/shell/EmptyState.tsx — Empty state for the browse page.
// Server Component (rendered server-side only).

export default function EmptyState() {
  return (
    <div className="mx-auto max-w-screen-sm px-4 py-12 text-center">
      <p className="text-muted-foreground text-base">Nothing here yet.</p>
      ...
    </div>
  )
}
```

**Schema type for prop** (`lib/schema.ts`, lines 19-20):
```typescript
export type Listing    = typeof listings.$inferSelect
export type NewListing = typeof listings.$inferInsert
```

**Adaptation notes for `ListingCard.tsx`:**
- No `'use client'` — pure Server Component (no state, no handlers)
- Prop: `{ listing: Listing }` using the `Listing` type from `@/lib/schema`
- Import `Image` from `next/image`
- Use `fill` + `loading="lazy"` + `sizes="(max-width: 640px) 100vw, 640px"` on the Image
- Photo source: `listing.photo_key ?? '/fallback.jpg'` — `photo_key` stores `blob.url` per OQ-01 resolution
- Image container: `relative aspect-[4/3] w-full rounded-t-lg overflow-hidden bg-muted`
- Description: `line-clamp-2` Tailwind class for 2-line truncation (D-06)
- Price/FREE badge: conditional render (see Shared Patterns below)
- Date: `<time dateTime={listing.created_at.toISOString()}>` with `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`
- Card wrapper: `rounded-lg border bg-card shadow-sm overflow-hidden` (consistent with LoginForm's `rounded-lg border bg-card shadow-sm`)

---

### `components/shell/AppHeader.tsx` (component, Server, modify)

**Analog:** Self (existing file)

**Current full file** (`components/shell/AppHeader.tsx`, lines 1-24):
```typescript
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
```

**`buttonVariants` export** (`components/ui/button.tsx`, line 58):
```typescript
export { Button, buttonVariants }
```

**Adaptation notes:**
- Add `token: string` to the props signature: `export default function AppHeader({ token }: { token: string })`
- Replace `<Button disabled>` with `<Link href={\`/${token}/new\`} className={buttonVariants()}>Post an item</Link>`
- Add `import Link from 'next/link'` and `import { buttonVariants } from '@/components/ui/button'`
- Remove the `Button` import (no longer needed) OR keep it if used elsewhere; safe to remove for now
- `@base-ui/react` Button does NOT implement Radix `asChild` — use `buttonVariants()` on a `<Link>` directly (per OQ-02 resolution)
- All callers of `AppHeader` must now pass `token` prop: `app/[token]/page.tsx`, `app/[token]/new/page.tsx`, `app/[token]/admin/login/page.tsx`, `app/[token]/admin/page.tsx`

---

### `lib/listing-service.ts` (service / data-access layer, CRUD read + write)

**Analog:** `lib/session.ts` (server-only module with async data operations)

**server-only import pattern** (`lib/session.ts`, line 1):
```typescript
import 'server-only'
```

**db + schema import pattern** (`lib/db.ts`, line 6):
```typescript
export const db = drizzle({ connection: { url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN }, schema })
```

**Drizzle select pattern** (from `lib/schema.ts` column types — used in route handler pattern in RESEARCH.md):
```typescript
import { db } from '@/lib/db'
import { listings } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'

export async function getActiveListings() {
  return db
    .select()
    .from(listings)
    .where(eq(listings.status, 'active'))
    .orderBy(desc(listings.created_at))
}
```

**Adaptation notes for `listing-service.ts`:**
- Start with `import 'server-only'` (same as `lib/session.ts` and `lib/db.ts`)
- Import `db` from `@/lib/db`, `listings` from `@/lib/schema`, `eq`, `desc`, `insert` from `drizzle-orm`
- Export `getActiveListings()` — returns `Listing[]`
- Optionally export `createListing(data: NewListing)` as a thin wrapper over `db.insert(listings).values(data)` — but the Route Handler may call `db.insert` directly; keep this module thin
- No `env` import needed if only doing DB operations

---

### `lib/listing-service.test.ts` (test, unit)

**Analog:** `lib/upload-validators.test.ts` (pure unit test — no mocked Next.js modules needed)

**Test file structure pattern** (`lib/upload-validators.test.ts`, lines 1-10):
```typescript
import { describe, it, expect } from 'vitest'
import { ALLOWED_TYPES, MAX_SIZE_BYTES, isAllowedMagicBytes } from './upload-validators'

describe('ALLOWED_TYPES', () => {
  it('contains exactly jpeg, png, webp', () => {
    expect(ALLOWED_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })
})
```

**server-only mock pattern** (`lib/session.test.ts`, line 6):
```typescript
vi.mock('server-only', () => ({}))
```

**Drizzle db mock pattern** (from `app/[token]/api/admin/login/route.test.ts` — mocks external deps at top):
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({ db: { select: vi.fn(), insert: vi.fn() } }))
```

**Adaptation notes for `listing-service.test.ts`:**
- Mock `server-only`, `@/lib/db`, and `drizzle-orm` at the top
- The Drizzle chain (`select().from().where().orderBy()`) must be mocked as a fluent chain — each method returns an object with the next method
- Use `vi.fn()` returning `{ from: vi.fn().mockReturnThis() }` etc., or mock the full `db.select` to resolve a fixture array
- Test `getActiveListings()`: assert it calls with `status = 'active'`, returns rows ordered by `created_at` DESC (test the mock was called correctly, not the actual query)
- Test date handling: `created_at` returns a `Date` object from Drizzle (integer mode: 'timestamp')

---

### `app/[token]/api/listings/route.test.ts` (test, route handler unit)

**Analog:** `app/[token]/api/admin/login/route.test.ts`

**Full mock setup pattern** (`app/[token]/api/admin/login/route.test.ts`, lines 1-32):
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('bcryptjs', () => ({ compare: vi.fn() }))
vi.mock('@/lib/session', () => ({ createAdminSession: vi.fn(), verifyAdminSession: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/lib/env', () => ({
  env: {
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD_HASH: '$2b$12$' + 'a'.repeat(53),
  },
}))

import { compare } from 'bcryptjs'
import { createAdminSession } from '@/lib/session'
import { checkRateLimit } from '@/lib/rate-limit'
import { POST } from './route'

function makeRequest(body: unknown, ip = '1.2.3.4'): Request {
  return new Request('http://localhost/abc/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockReturnValue(true)
  vi.mocked(compare).mockResolvedValue(false as never)
  vi.mocked(createAdminSession).mockResolvedValue(undefined)
})
```

**Upload route — top-level await import pattern** (`app/[token]/api/upload/route.test.ts`, lines 1-8):
```typescript
const mockHandleUpload = vi.fn()
vi.mock('@vercel/blob/client', () => ({
  handleUpload: mockHandleUpload,
}))

const { POST } = await import('./route')
```

**describe + it pattern** (`app/[token]/api/admin/login/route.test.ts`, lines 34-40):
```typescript
describe('POST /[token]/api/admin/login', () => {
  it('returns 200 + { success: true } on correct credentials, calls createAdminSession', async () => {
    vi.mocked(compare).mockResolvedValue(true as never)
    const res = await POST(makeRequest({ username: 'admin', password: 'correct' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(createAdminSession).toHaveBeenCalledOnce()
  })
```

**Adaptation notes for `listings/route.test.ts`:**
- Mock `server-only`, `@/lib/db`, `@/lib/schema`, `nanoid`
- `crypto.randomUUID` is a global — mock with `vi.spyOn(crypto, 'randomUUID')` or set `global.crypto`
- `makeRequest` helper takes `body: unknown`, produces `new Request('http://localhost/abc/api/listings', { method: 'POST', ... })`
- Use `vi.clearAllMocks()` in `beforeEach`
- Test cases to cover:
  - 201 + `{ id, editToken }` on valid body — assert `db.insert` called, response shape correct (LIST-02, LIST-05)
  - 400 on missing required field (Zod validation)
  - 400 on malformed JSON
  - `photoKey` is optional — test with and without it
  - `editToken` is never echoed or logged from the request body (security — LIST-05)

---

### `app/[token]/page.tsx` (page, Server Component, modify)

**Analog:** `app/[token]/admin/page.tsx` (Server Component with `await params`, db read, conditional render)

**Full current file** (`app/[token]/page.tsx`, lines 1-22):
```typescript
import AppHeader from '@/components/shell/AppHeader'
import EmptyState from '@/components/shell/EmptyState'

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
```

**await params pattern** (`app/[token]/admin/page.tsx`, lines 10-15):
```typescript
export default async function AdminPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
```

**Adaptation notes for `app/[token]/page.tsx`:**
- Convert `BrowsePage` from sync to `async` function
- Add `params: Promise<{ token: string }>` prop + `const { token } = await params`
- Add `import { db } from '@/lib/db'`, `import { listings } from '@/lib/schema'`, `import { eq, desc } from 'drizzle-orm'`
- Add `import ListingCard from '@/components/listings/ListingCard'`
- Query: `const activeListings = await db.select().from(listings).where(eq(listings.status, 'active')).orderBy(desc(listings.created_at))` — OR call `getActiveListings()` from `lib/listing-service`
- Pass `token` to `<AppHeader token={token} />` (AppHeader now requires this prop)
- Conditional render: `activeListings.length === 0 ? <EmptyState /> : <div className="mx-auto max-w-screen-sm px-4 py-4 space-y-4">{activeListings.map(l => <ListingCard key={l.id} listing={l} />)}</div>`
- Keep `export const dynamic = 'force-dynamic'`

---

### `next.config.ts` (config, modify)

**Analog:** Self (existing file)

**Current full file** (`next.config.ts`, lines 1-7):
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

**Adaptation notes:**
- Add `images.remotePatterns` block inside `nextConfig`
- Hostname from `@vercel/blob` installed source: `*.blob.vercel-storage.com`
- Use wildcard subdomain (`*.blob.vercel-storage.com`) to support any store subdomain
- No other config changes needed

---

## Shared Patterns

### Server-Only Modules
**Source:** `lib/db.ts` (line 1), `lib/session.ts` (line 1)
**Apply to:** `lib/listing-service.ts`
```typescript
import 'server-only'
```
All lib modules that touch the DB or secrets must start with this import. It causes a build error if accidentally imported in a Client Component.

---

### `'use client'` Client Component Declaration
**Source:** `components/admin/LoginForm.tsx` (line 1), `components/admin/LogoutButton.tsx` (line 1)
**Apply to:** `components/listings/CreateListingForm.tsx`
```typescript
'use client'
```
Any component using `useState`, `useEffect`, event handlers, `upload()`, or `localStorage` must declare this at the top of the file.

---

### Token-Prefixed API Fetch URLs
**Source:** `components/admin/LoginForm.tsx` (line 18), `components/admin/LogoutButton.tsx` (line 7)
**Apply to:** `CreateListingForm.tsx` (fetch to `/[token]/api/listings`)
```typescript
// LoginForm pattern:
const res = await fetch(`/${token}/api/admin/login`, { method: 'POST', ... })
// LogoutButton pattern:
await fetch(`/${token}/api/admin/logout`, { method: 'POST' })
```
All client-side fetch calls must use the token-prefixed path. The token comes from a prop passed down from the page component.

---

### Zod `safeParse` Validation in Route Handlers
**Source:** `app/[token]/api/admin/login/route.ts` (lines 21-24)
**Apply to:** `app/[token]/api/listings/route.ts`
```typescript
const parsed = loginSchema.safeParse(json)
if (!parsed.success) {
  return Response.json({ error: 'Invalid request' }, { status: 400 })
}
```
Always use `safeParse` (never `parse`) in Route Handlers — `parse` throws, `safeParse` returns a result object that can be checked without try/catch.

---

### JSON Parse Try/Catch in Route Handlers
**Source:** `app/[token]/api/admin/login/route.ts` (lines 13-19)
**Apply to:** `app/[token]/api/listings/route.ts`
```typescript
let json: unknown
try {
  json = await request.json()
} catch {
  return Response.json({ error: 'Invalid request' }, { status: 400 })
}
```
Always guard `request.json()` with try/catch — malformed JSON throws synchronously and must be caught explicitly.

---

### `export const dynamic = 'force-dynamic'` on Token Pages
**Source:** `app/[token]/page.tsx` (line 11), `app/[token]/admin/login/page.tsx` (line 4), `app/[token]/admin/page.tsx` (line 8)
**Apply to:** `app/[token]/new/page.tsx`, `app/[token]/page.tsx` (already present)
```typescript
export const dynamic = 'force-dynamic'
```
All pages under `app/[token]/` must opt out of static generation. The invite token in the URL path is dynamic per-request.

---

### `await params` in Async Pages
**Source:** `app/[token]/admin/login/page.tsx` (lines 6-10), `app/[token]/admin/page.tsx` (lines 10-15)
**Apply to:** `app/[token]/new/page.tsx`, `app/[token]/page.tsx`
```typescript
export default async function SomePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
```
Next.js 15+: `params` is a Promise. Direct access without `await` throws at runtime.

---

### `vi.mock('server-only', () => ({}))` in Tests
**Source:** `lib/session.test.ts` (line 6), `app/[token]/api/admin/login/route.test.ts` (line 3)
**Apply to:** `lib/listing-service.test.ts`, `app/[token]/api/listings/route.test.ts`
```typescript
vi.mock('server-only', () => ({}))
```
Any test file that imports (directly or transitively) a module with `import 'server-only'` must mock it at the top. Without this, Vitest throws during module resolution.

---

### `max-w-screen-sm mx-auto px-4` Layout Constraint
**Source:** `components/admin/LoginForm.tsx` (line 46), `components/shell/EmptyState.tsx` (line 7), `app/[token]/admin/page.tsx` (line 23)
**Apply to:** `components/listings/ListingCard.tsx` (card list wrapper in page), `components/listings/CreateListingForm.tsx`
```typescript
// EmptyState:
<div className="mx-auto max-w-screen-sm px-4 py-12 text-center">
// Admin page:
<main className="mx-auto max-w-screen-sm px-4 py-12">
// LoginForm card wrapper:
<div className="mx-auto max-w-screen-sm px-4 py-12">
```
All content must be constrained to `max-w-screen-sm` with `mx-auto` for the single-column mobile-first layout (UX-03).

---

### `rounded-lg border bg-card shadow-sm` Card Container
**Source:** `components/admin/LoginForm.tsx` (line 47)
**Apply to:** `components/listings/ListingCard.tsx`
```typescript
<div className="rounded-lg border bg-card p-6 shadow-sm">
```
The listing card should use these same Tailwind tokens for visual consistency. Note: for the card, `overflow-hidden` is needed on the outer container to clip the image to the rounded corners — add to the pattern.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | All 10 files have at least a role-match analog in the existing codebase |

The closest the project gets to "no analog" is `ListingCard.tsx` — only `EmptyState.tsx` exists as a comparable Server Component, and it is trivially simple. The planner should rely primarily on RESEARCH.md Pattern 4 (Image Display) and Pattern 8 (FREE Badge) for the card implementation details not covered by the analog.

---

## Metadata

**Analog search scope:** `app/[token]/`, `components/`, `lib/`, `next.config.ts`
**Files scanned:** 18 source files read
**Key files not needing analogs:** `lib/utils.ts`, `lib/schema.ts` — referenced but not analogs
**Pattern extraction date:** 2026-05-18
