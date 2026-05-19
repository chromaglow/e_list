# Phase 3: Mark Taken + Admin Delete — Research

**Researched:** 2026-05-18
**Domain:** Next.js 15 App Router — server/client component boundaries, Drizzle ORM mutations, middleware caching, URL-driven filter state
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Mark Taken UX (LIST-06)**
- D-01: "Mark as taken" button appears directly on the listing card — visible only when `localStorage.getItem('edit_token_${listing.id}')` is present. No separate edit page.
- D-02: No confirmation dialog for mark-taken. Instant feedback.
- D-03: Route Handler for mark-taken accepts edit token in request body; verifies against `listings.edit_token` in DB; updates `status → 'taken'` and `taken_at → now()`.
- D-04: After marking taken, the poster's browser optimistically removes the listing from the "Active" feed.

**Browse Filter (LIST-07)**
- D-05: Three tab buttons across top: Active | Taken | All. "Active" is the default.
- D-06: Tabs implemented as URL search params (`?filter=active|taken|all`). Browse Server Component reads the param and queries accordingly.
- D-07: Date sort toggle deferred — newest-first only.

**Admin Delete UI (ADMN-03)**
- D-08: Delete icon appears on every listing card when logged in as admin. Inline delete from main feed.
- D-09: Confirm dialog before delete fires. (Implementation detail: Claude's discretion — see below.)
- D-10: Deletion is soft: `status → 'deleted'`, `deleted_at → now()`. Deleted listings never appear in any browse tab.
- D-11: Admin delete visibility gated on a server-rendered prop — browse page detects admin session server-side and passes `isAdmin` down to cards.

**Invite Regeneration (ADMN-04)**
- D-12: Regeneration immediately invalidates old token — no grace period.
- D-13: Regenerate button lives on `/[token]/admin` page. New invite URL displayed inline in copyable read-only field.
- D-14: Admin JWT sessions survive invite regeneration (validated against ADMIN_USERNAME/ADMIN_PASSWORD_HASH, not invite token).
- D-15 (Resolved): Invite token stored in DB (`settings` table) — not env-only. Middleware reads from DB with short in-memory cache. Regeneration takes effect immediately without a redeploy.

### Claude's Discretion
- Exact tab styling (pill, underline, segmented control)
- Whether "Mark as taken" button uses a loading/pending state
- Confirm dialog implementation: `window.confirm` vs custom modal
- Exact delete icon (Trash2 from lucide-react)
- Cache duration for invite token DB read in middleware (suggest 60s)

### Deferred Ideas (OUT OF SCOPE)
- Date sort toggle
- "TAKEN" badge overlay on browse feed (LIST-V2-01)
- Admin dashboard stats (ADMN-V2-01)

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIST-06 | User can mark their listing as taken/sold by presenting their edit token — updated in-place, not deleted | Edit token PATCH route pattern; timing-safe compare; client button as Client Component with localStorage check |
| LIST-07 | User can toggle the browse page between "all listings" and "active only" (hiding taken/sold items) | Next.js `searchParams` in Server Components; new `getListingsByFilter()` service function |
| ADMN-03 | Admin can delete any listing — soft-deleted (status 'deleted'), not permanently removed | Admin JWT cookie read in Server Component; DELETE route handler; `isAdmin` prop pattern |
| ADMN-04 | Admin can regenerate the invite URL — old token immediately invalidated | `settings` table schema; middleware in-memory cache pattern; new Route Handler or Server Action |

</phase_requirements>

---

## Summary

Phase 3 completes the listing lifecycle by adding mark-taken (poster), admin delete, browse filtering, and invite regeneration. All four features use patterns already established in Phases 1–2 — the only genuinely novel piece is the `settings` table (a single-row key-value store for the live invite token) and the middleware cache that reads from it.

The central engineering challenge is the **server/client boundary** on `ListingCard`. The card is currently a Server Component, but both the "Mark as taken" button (needs localStorage) and the admin delete button (needs an interactive confirm + fetch) require browser APIs. The correct pattern is: keep `ListingCard` as a Server Component that accepts `isAdmin: boolean` as a prop, and embed two small Client Components inside it — `MarkTakenButton` (checks localStorage, fires PATCH) and `AdminDeleteButton` (shows confirm dialog, fires DELETE). This is the standard React Server Components island pattern.

The middleware change (reading invite token from DB instead of env) requires adding a module-scoped in-memory cache variable in `proxy.ts` — a 60-second TTL is appropriate. The cache must be keyed by time, not by a stale reference to the old token, so a simple `{ value, expiresAt }` object works without a dependency.

**Primary recommendation:** Add `MarkTakenButton` and `AdminDeleteButton` as thin Client Component islands inside a still-server-rendered `ListingCard`. All DB mutations stay in Route Handlers. The `settings` table uses a single row with a well-known key (`invite_token`). Middleware cache is a module-level variable with a timestamp check.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Mark-taken mutation (PATCH) | API / Backend (Route Handler) | — | Token verification is server-side; never trust client to do the compare |
| Mark-taken button visibility | Browser / Client | — | `localStorage` is browser-only; Server Components cannot read it |
| Admin delete mutation (DELETE) | API / Backend (Route Handler) | — | Admin JWT verification must be server-side |
| Admin delete button visibility | Frontend Server (SSR) | Browser / Client | `isAdmin` prop computed server-side; button interactivity is client-side |
| Browse filter state | Frontend Server (SSR) | — | `?filter=` search param read by Server Component; no client state needed |
| Filter tabs UI | Browser / Client | — | Tab clicks must navigate (push URL param); requires `<Link>` or `useRouter` |
| Invite token regeneration | API / Backend (Route Handler) | — | Must be admin-gated; writes to DB |
| Invite token storage | Database / Storage | — | Single-row `settings` table; read by middleware |
| Middleware token cache | API / Backend (middleware) | — | Module-scope variable in `proxy.ts`; 60s TTL |
| Admin session detection | Frontend Server (SSR) | — | Server Component reads `cookies()` to set `isAdmin` prop |

---

## Standard Stack

No new packages required for this phase. All functionality is implementable with the existing dependency set.

### Core (already installed)
| Library | Installed Version | Role in Phase 3 |
|---------|------------------|-----------------|
| `next` | 16.2.6 | Server Components, Route Handlers, `searchParams`, `cookies()` |
| `drizzle-orm` | 0.45.2 | DB mutations (`update`, new `settings` table queries) |
| `@libsql/client` | 0.17.3 | Turso connection (no change) |
| `jose` | 6.2.3 | `verifyAdminSession()` already exists — no change |
| `zod` | 4.4.3 | Validate PATCH and DELETE request bodies |
| `lucide-react` | ^1.16.0 | Trash2 icon for admin delete button |
| `node:crypto` | built-in | `timingSafeEqual` for edit token comparison (already used in proxy.ts) |

### No New Packages
All Phase 3 features are achievable with the existing stack. Do not add any new runtime dependencies.

**Installation:** none required.

---

## Package Legitimacy Audit

No new packages are being installed in this phase. Section is not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser                           Next.js Server                    Turso DB
───────                           ──────────────                    ────────
GET /?filter=taken
  → searchParams.filter ──────────→ BrowsePage (Server Component)
                                       cookies() → verifyAdminSession()
                                       getListingsByFilter('taken') ──────→ SELECT WHERE status='taken'
                                       passes isAdmin={true|false} to cards ←── rows
  ← HTML with cards ←─────────────────
  
  [Client hydrates]
  MarkTakenButton mounts
    localStorage.getItem('edit_token_X')
    if present → renders button
    
  User clicks "Mark taken"
    fetch PATCH /[token]/api/listings/[id]
      { editToken } ──────────────→ PATCH route handler
                                       SELECT edit_token WHERE id=X
                                       timingSafeEqual(supplied, stored)
                                       UPDATE status='taken', taken_at=now()
  ← { ok: true } ←───────────────────
  [Client removes card from DOM optimistically]

  Admin clicks delete (after confirm)
    fetch DELETE /[token]/api/listings/[id]
      (admin_session cookie) ─────→ DELETE route handler
                                       verifyAdminSession(cookie)
                                       UPDATE status='deleted', deleted_at=now()
  ← { ok: true } ←───────────────────
  [Client removes card from DOM]

Admin regenerates invite:
  POST /[token]/admin/api/regen-invite
    (admin_session cookie) ─────→ Regen Route Handler
                                     verifyAdminSession()
                                     crypto.randomBytes(32).toString('hex')
                                     UPDATE settings SET value=newToken WHERE key='invite_token'
  ← { newToken } ←────────────────
  [Admin page displays new URL]

Every request:
  proxy.ts
    reads module-level cache { value, expiresAt }
    if expired → SELECT value FROM settings WHERE key='invite_token'
              → update cache
    timingSafeEqual(urlToken, cachedToken)
```

### Recommended Project Structure (additions only)

```
lib/
├── schema.ts           # + settings table definition
├── listing-service.ts  # + getListingsByFilter(), markListingTaken(), deleteListingAdmin()
└── settings-service.ts # getInviteToken(), setInviteToken() — server-only

app/[token]/
├── page.tsx            # reads searchParams.filter, passes isAdmin to cards
└── admin/
    ├── page.tsx        # + invite regen UI, RegenInviteForm Client Component
    └── api/
        └── regen-invite/
            └── route.ts  # POST — admin-gated, writes new token to DB

app/[token]/api/listings/[id]/
└── route.ts            # PATCH (mark taken) + DELETE (admin soft delete)

components/listings/
├── ListingCard.tsx     # + accepts isAdmin, token props; embeds two Client Component islands
├── MarkTakenButton.tsx # 'use client' — checks localStorage, fires PATCH
└── AdminDeleteButton.tsx # 'use client' — confirm dialog, fires DELETE

proxy.ts                # + DB read with 60s in-memory cache replacing env.INVITE_TOKEN
```

### Pattern 1: Client Component Island inside Server Component

This is the canonical pattern for a Server Component that needs one or two interactive elements.

**What:** `ListingCard` stays a Server Component. It renders two Client Component children conditionally. The server controls what props are passed (including `isAdmin`). The client components access browser APIs (`localStorage`) and fire `fetch` calls.

**When to use:** When most of a component is data-display (server-rendered) and only a small slice needs browser interactivity.

```tsx
// components/listings/ListingCard.tsx — STAYS a Server Component
import MarkTakenButton from './MarkTakenButton'
import AdminDeleteButton from './AdminDeleteButton'

interface Props {
  listing: Listing
  token: string
  isAdmin: boolean
}

export default function ListingCard({ listing, token, isAdmin }: Props) {
  return (
    <article className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* ... existing photo/title/description/poster/date markup ... */}
      <div className="px-4 pb-4 flex gap-2">
        {/* Client island: renders itself only if localStorage has the token */}
        <MarkTakenButton listingId={listing.id} token={token} />
        {/* Client island: renders only when isAdmin=true */}
        {isAdmin && <AdminDeleteButton listingId={listing.id} token={token} />}
      </div>
    </article>
  )
}
```

```tsx
// components/listings/MarkTakenButton.tsx
'use client'
import { useState, useEffect } from 'react'

export default function MarkTakenButton({
  listingId,
  token,
}: {
  listingId: string
  token: string
}) {
  const [hasToken, setHasToken] = useState(false)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    // localStorage is only available in the browser
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
      // D-04: optimistically remove from feed — parent can handle via router.refresh()
      // or the component can be removed by the parent list
    }
    setIsPending(false)
  }

  return (
    <button onClick={handleClick} disabled={isPending}>
      {isPending ? 'Marking…' : 'Mark as taken'}
    </button>
  )
}
```

**Source:** [ASSUMED] — React Server Components island pattern; Next.js App Router docs on mixing Server and Client Components

**Important note on `useEffect` for localStorage:** Since Server Components render on the server where `localStorage` doesn't exist, the button's visibility check MUST happen inside a Client Component's `useEffect` (or equivalent). Attempting to read `localStorage` outside of a browser context causes a runtime error. The pattern above (initializing `hasToken` to `false` and setting it in `useEffect`) is the correct approach — it avoids hydration mismatch.

### Pattern 2: Server Component reads `searchParams` for filter state

**What:** Next.js App Router passes `searchParams` as a prop to page-level Server Components. The component reads the filter param and passes it to a service function.

**When to use:** URL-driven state that should be shareable and bookmarkable with no client-side state manager.

```tsx
// app/[token]/page.tsx
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

  // detect admin session server-side (D-11)
  const sessionCookie = (await cookies()).get('admin_session')?.value
  const isAdmin = !!(await verifyAdminSession(sessionCookie))

  return (
    <>
      <AppHeader token={token} />
      <FilterTabs current={validFilter} token={token} />
      <main>
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} token={token} isAdmin={isAdmin} />
        ))}
      </main>
    </>
  )
}
```

**Note on Next.js 15 searchParams:** In Next.js 15, `searchParams` is a Promise and must be awaited. [ASSUMED] This changed from Next.js 14 where it was synchronous. The pattern above (`await searchParams`) is correct for Next.js 15+.

**Source:** [ASSUMED] — Next.js 15 App Router page props documentation

### Pattern 3: Filter Tab as Client Component with `<Link>` navigation

**What:** The filter tabs are a Client Component. Each tab is a `<Link>` (or button that pushes a URL) with the appropriate `?filter=` search param. Because `<Link>` is a client-side navigation, it preserves scroll position by default in Next.js App Router when `scroll={false}` is set.

```tsx
// components/listings/FilterTabs.tsx
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
    <nav className="flex gap-2 px-4 py-2">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={`/${token}?filter=${tab.value}`}
          scroll={false}
          className={current === tab.value ? 'font-semibold underline' : 'text-muted-foreground'}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
```

**Source:** [ASSUMED] — Next.js App Router `<Link>` and `useSearchParams` documentation

### Pattern 4: Timing-safe edit token comparison

**What:** The PATCH route must compare the supplied edit token against the DB value in constant time to prevent timing attacks.

**When to use:** Any secret comparison in a server-side Route Handler.

```ts
// app/[token]/api/listings/[id]/route.ts
import { timingSafeEqual } from 'node:crypto'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { id } = await params

  let json: unknown
  try { json = await request.json() } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const parsed = MarkTakenSchema.safeParse(json)
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const listing = await db
    .select({ edit_token: listings.edit_token, status: listings.status })
    .from(listings)
    .where(eq(listings.id, id))
    .get()

  if (!listing || listing.status !== 'active') {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  // Constant-time comparison — mirrors pattern already in proxy.ts
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

  await markListingTaken(id)
  return Response.json({ ok: true })
}
```

**Source:** [VERIFIED: existing proxy.ts codebase] — `timingSafeEqual` already used in proxy.ts with identical try/catch pattern

**Important:** `timingSafeEqual` from `node:crypto` is available in Next.js Route Handlers (Node.js runtime). The existing `proxy.ts` already uses this exact pattern, so no new dependencies or patterns are introduced.

### Pattern 5: Settings table for hot-swappable invite token

**What:** A single-row key-value table stores the live invite token. Middleware reads from this table with a module-scoped in-memory cache.

**Schema addition to `lib/schema.ts`:**

```ts
export const settings = sqliteTable('settings', {
  key:   text('key').primaryKey(),
  value: text('value').notNull(),
})

export type Setting    = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert
```

**Migration:** `drizzle-kit generate` will produce a new `0001_settings_table.sql` migration. Running `drizzle-kit migrate` (which happens on every Vercel deploy per Phase 1 D-08) applies it automatically. The initial token value must be seeded (a one-time INSERT of the existing env token value during migration or a seed script).

**Seed strategy:** The migration file should include an INSERT that reads `INVITE_TOKEN` from the environment so existing deployments start with their current token in the DB.

**Middleware cache in proxy.ts:**

```ts
// Module-level cache — survives across requests in the same Node.js process
let tokenCache: { value: string; expiresAt: number } | null = null
const CACHE_TTL_MS = 60_000 // 60 seconds

async function getInviteTokenFromDB(): Promise<string> {
  const now = Date.now()
  if (tokenCache && tokenCache.expiresAt > now) {
    return tokenCache.value
  }
  // Lazy import db to avoid circular issues at module load in Edge runtime
  const { db } = await import('@/lib/db')
  const { settings } = await import('@/lib/schema')
  const { eq } = await import('drizzle-orm')
  const row = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'invite_token'))
    .get()
  if (!row) throw new Error('invite_token not found in settings table')
  tokenCache = { value: row.value, expiresAt: now + CACHE_TTL_MS }
  return row.value
}
```

**Source:** [ASSUMED] — Standard module-level cache pattern; Drizzle ORM single-row select pattern

**Critical consideration — Next.js middleware runtime:** Next.js middleware (the file named `middleware.ts` or re-exported as one) runs in the **Edge Runtime** by default. The Edge Runtime does NOT have access to Node.js APIs or LibSQL/Turso's `@libsql/client`. This is a significant constraint.

**Options:**
1. **Switch middleware to Node.js runtime** by adding `export const runtime = 'nodejs'` to `middleware.ts`. This disables Edge-specific optimizations but makes full Node.js APIs available, including LibSQL.
2. **Keep middleware Edge, use a separate API route** for token validation — not viable without restructuring.
3. **Use the existing `proxy.ts` export mechanism** and ensure the middleware file explicitly opts into Node.js runtime.

Since `proxy.ts` already uses `node:crypto`'s `timingSafeEqual` and `@libsql/client` requires Node.js, **the middleware must run on the Node.js runtime**. Add `export const runtime = 'nodejs'` to whatever file Next.js uses as the middleware entry point.

**Note on middleware file:** The project has `proxy.ts` but no `middleware.ts`. Next.js requires the middleware file to be named exactly `middleware.ts` at the project root (or `src/middleware.ts`). The `proxy.ts` file is likely re-exported or the project structure needs a thin `middleware.ts` that re-exports from `proxy.ts`. Verify the actual Next.js middleware entry point — the `config.matcher` export in `proxy.ts` indicates it is intended as the middleware file. This discrepancy should be investigated before planning.

### Pattern 6: Admin session detection in Server Component (D-11)

**What:** Browse page Server Component reads the `admin_session` cookie and calls `verifyAdminSession()` to set `isAdmin` — the same pattern already used in `app/[token]/admin/page.tsx`.

```ts
// In BrowsePage (Server Component)
import { cookies } from 'next/headers'
import { verifyAdminSession } from '@/lib/session'

const sessionCookie = (await cookies()).get('admin_session')?.value
const isAdmin = !!(await verifyAdminSession(sessionCookie))
```

This is already the established project pattern. No new abstractions needed.

**Source:** [VERIFIED: existing codebase] — `app/[token]/admin/page.tsx` lines 1-18 uses identical pattern

### Pattern 7: Admin delete Route Handler

```ts
// app/[token]/api/listings/[id]/route.ts — DELETE handler
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { id } = await params

  // Verify admin session from cookie
  const cookieHeader = request.headers.get('cookie') ?? ''
  // Parse admin_session cookie — or use next/headers cookies() if available in route handlers
  const sessionCookie = parseCookieHeader(cookieHeader, 'admin_session')
  const session = await verifyAdminSession(sessionCookie)
  if (!session) return Response.json({ error: 'Forbidden' }, { status: 403 })

  await deleteListingAdmin(id)
  return Response.json({ ok: true })
}
```

**Note:** In Next.js Route Handlers, `cookies()` from `next/headers` is available. Prefer that over manual cookie header parsing.

**Source:** [ASSUMED] — Next.js App Router Route Handler documentation; existing login route uses same cookie pattern

### Anti-Patterns to Avoid

- **Reading localStorage in a Server Component:** Will throw `ReferenceError: localStorage is not defined` at render time. The `MarkTakenButton` must be `'use client'` and check localStorage in `useEffect`.
- **Converting the entire `ListingCard` to a Client Component:** Loses server-rendering benefits for the whole card. Use islands — only the interactive buttons need to be client-side.
- **Storing the edit token as a URL param or in the request URL:** The edit token must travel in the request body (POST/PATCH body), never in the URL (shows in logs, browser history).
- **Using `===` for token comparison instead of `timingSafeEqual`:** String comparison short-circuits on first differing character, enabling timing attacks. Already a project pattern — maintain it.
- **Performing invite token regeneration without invalidating the middleware cache:** After writing the new token to the DB, the in-memory cache may still hold the old value for up to 60 seconds. The regen Route Handler should explicitly reset the cache (`tokenCache = null`) if the DB write succeeds. Since middleware and route handlers share the same Node.js process in local dev, direct cache invalidation is possible — but on Vercel (serverless), each function invocation may be a different process, so the cache naturally resets. This is acceptable behavior for the 60s TTL.
- **Returning the edit token from the PATCH response or displaying it:** The edit token is one-way — issued at creation, stored in localStorage, verified on PATCH. Never echo it back in responses.
- **Putting admin-only Route Handlers outside the `/[token]/admin/` path prefix:** Middleware already gates `/[token]/admin/*` with JWT check. Admin mutations should live under this path to get double-gated. Alternatively, verify the JWT manually in the handler (defense in depth — already the pattern in `admin/page.tsx`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Constant-time string comparison | Custom loop | `node:crypto timingSafeEqual` | Node.js built-in; already used in proxy.ts; timing attacks are real |
| JWT verification | Custom base64 decode + HMAC | `jose jwtVerify` (already installed) | Already in `lib/session.ts`; `verifyAdminSession()` is the project abstraction |
| In-memory cache with TTL | Complex caching library | Simple `let cache: { value, expiresAt }` module variable | TTL cache for one value needs ~8 lines, not a library |
| URL search param state | React state + URL sync | Next.js `<Link href="?filter=X">` + `searchParams` prop | Built into Next.js App Router; zero boilerplate |
| Drizzle schema migrations | Hand-write SQL | `drizzle-kit generate` + `drizzle-kit migrate` | Already the project pattern (Phase 1 D-07); migrations auto-apply on deploy |
| Request body validation | Manual type narrowing | Zod `safeParse` | Already the project pattern in all existing Route Handlers |

---

## Common Pitfalls

### Pitfall 1: Middleware runtime error with LibSQL

**What goes wrong:** Adding a DB call to `proxy.ts` fails at runtime with an error like `Error: The Edge Runtime does not support Node.js built-ins` or `Module not found: Can't resolve '@libsql/client'` when deployed to Vercel.

**Why it happens:** Next.js middleware defaults to the Edge Runtime. LibSQL/`@libsql/client` uses Node.js-specific APIs (net sockets, crypto) that don't exist in the Edge Runtime.

**How to avoid:** Add `export const runtime = 'nodejs'` to the middleware entry point. Verify this is set before testing the DB-reading cache. The existing `proxy.ts` already uses `node:crypto`'s `timingSafeEqual`, which suggests the project already runs Node.js runtime middleware — but the explicit export should be confirmed and added if absent.

**Warning signs:** Works in `next dev` but fails on Vercel deployment with Edge Runtime errors.

### Pitfall 2: Hydration mismatch from localStorage check

**What goes wrong:** `MarkTakenButton` renders on the server (no localStorage) and on the client. If the component renders a button on the client that was not present in the server HTML, React logs a hydration mismatch warning (or error in strict mode).

**Why it happens:** `localStorage` returns a value on the client but the server renders nothing for that slot.

**How to avoid:** Initialize `hasToken` to `false` (same as server render) and update it in `useEffect`. The component renders nothing on the server and on initial client render, then shows the button after `useEffect` fires. This is the correct pattern — no flicker on most devices, no hydration error.

**Warning signs:** React console warning "Hydration failed because the initial UI does not match what was rendered on the server."

### Pitfall 3: `searchParams` is a Promise in Next.js 15

**What goes wrong:** Code written as `searchParams.filter` (synchronous access) throws `TypeError: Cannot read properties of undefined` because `searchParams` is a Promise in Next.js 15 page components.

**Why it happens:** Next.js 15 changed the type of `searchParams` from a plain object to `Promise<{ [key: string]: string | string[] | undefined }>`.

**How to avoid:** Always `await searchParams` before accessing its properties. The pattern is shown in Pattern 2 above.

**Warning signs:** TypeScript error on `searchParams.filter` if types are correctly configured; runtime error if types are bypassed.

### Pitfall 4: `getActiveListings()` query not updated for filter

**What goes wrong:** The new filter tabs silently show no results for "Taken" or "All" because the browse page still calls `getActiveListings()` which hardcodes `WHERE status = 'active'`.

**Why it happens:** The existing service function is filter-specific by name and implementation.

**How to avoid:** Add `getListingsByFilter(filter: 'active' | 'taken' | 'all'): Promise<Listing[]>` to `listing-service.ts`. For `'all'`, query `WHERE status IN ('active', 'taken')` (explicitly exclude `'deleted'`). For `'taken'`, query `WHERE status = 'taken'`. Update `BrowsePage` to call the new function. `getActiveListings()` can remain for other callers or be deprecated.

**Warning signs:** "Taken" and "All" tabs both show zero results even when taken listings exist in the DB.

### Pitfall 5: Admin delete visible to non-admin users via props inspection

**What goes wrong:** If `isAdmin` is not computed server-side and is instead passed as a client prop from a parent Client Component, a user can manipulate it in browser DevTools.

**Why it happens:** Treating client-side state as a security gate instead of a display-only hint.

**How to avoid:** `isAdmin` must be computed server-side in the Server Component (`BrowsePage`). The `AdminDeleteButton` Client Component should also re-verify admin status server-side when the DELETE request fires — i.e., the Route Handler verifies the JWT cookie, not just "trust the client said isAdmin=true." This is already the pattern: the delete button fires a DELETE request, and the Route Handler checks the cookie. The `isAdmin` prop only controls UI visibility, not actual authorization.

### Pitfall 6: Settings table missing at deploy time

**What goes wrong:** The new `settings` table migration runs on deploy, but the `invite_token` row is never seeded. Middleware crashes on the first request with "invite_token not found in settings table."

**Why it happens:** A migration creates the table structure but does not insert data. Seeding is separate.

**How to avoid:** Include an `INSERT OR IGNORE INTO settings (key, value) VALUES ('invite_token', ?)` in the migration SQL, populated from the `INVITE_TOKEN` env var. Alternatively, add fallback logic in the middleware: if the DB row is missing, fall back to `env.INVITE_TOKEN` and log a warning. The fallback approach is safer for the transition period.

**Warning signs:** 404 on every request after deploying Phase 3 changes.

### Pitfall 7: Regen route accessible without admin JWT

**What goes wrong:** The invite regeneration Route Handler is placed at a non-admin path or the JWT check is omitted, allowing any visitor with the invite URL to rotate the invite token (locking out all other users).

**Why it happens:** Forgetting to add JWT verification to a new Route Handler.

**How to avoid:** Place the regen handler under `/[token]/admin/api/regen-invite/` so middleware's admin gate applies. Add explicit `verifyAdminSession()` check inside the handler for defense in depth (the pattern established in `app/[token]/admin/page.tsx`).

---

## Code Examples

### Service function: getListingsByFilter

```ts
// lib/listing-service.ts — add this function
import { and, eq, inArray, desc } from 'drizzle-orm'

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

**Source:** [VERIFIED: existing codebase] — follows identical pattern to `getActiveListings()` in `lib/listing-service.ts`

### Service function: markListingTaken

```ts
// lib/listing-service.ts — add this function
import { eq, and } from 'drizzle-orm'

export async function markListingTaken(id: string): Promise<void> {
  await db
    .update(listings)
    .set({ status: 'taken', taken_at: new Date() })
    .where(and(eq(listings.id, id), eq(listings.status, 'active')))
}
```

**Note:** The `and(eq(id), eq(status, 'active'))` guard prevents double-marking. The Route Handler already validates status before calling this, but defense in depth.

**Source:** [VERIFIED: existing codebase] — Drizzle ORM `update().set().where()` pattern; `eq` and `and` already imported in similar files

### Service function: deleteListingAdmin

```ts
// lib/listing-service.ts — add this function
export async function deleteListingAdmin(id: string): Promise<void> {
  await db
    .update(listings)
    .set({ status: 'deleted', deleted_at: new Date() })
    .where(eq(listings.id, id))
}
```

**Source:** [VERIFIED: existing codebase] — Same Drizzle update pattern; `deleted_at` column confirmed in `lib/schema.ts` line 17

### Settings service

```ts
// lib/settings-service.ts — new file
import 'server-only'
import { db } from '@/lib/db'
import { settings } from '@/lib/schema'
import { eq } from 'drizzle-orm'

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

**Source:** [ASSUMED] — Drizzle ORM upsert pattern with `onConflictDoUpdate`; standard key-value store pattern

### Drizzle `onConflictDoUpdate` for upsert

The `onConflictDoUpdate` method on the `insert` builder handles INSERT-or-UPDATE for the `settings` table.

```ts
await db
  .insert(settings)
  .values({ key: 'invite_token', value: newToken })
  .onConflictDoUpdate({
    target: settings.key,
    set: { value: newToken },
  })
```

**Source:** [ASSUMED] — Drizzle ORM SQLite upsert documentation; standard pattern for single-row config tables

### Drizzle `.get()` for single-row select

LibSQL/Drizzle supports `.get()` to return a single row (or undefined) instead of an array. This is cleaner than `[0]` indexing.

```ts
const row = await db
  .select()
  .from(settings)
  .where(eq(settings.key, 'invite_token'))
  .get()  // returns Setting | undefined
```

**Source:** [ASSUMED] — Drizzle ORM LibSQL driver documentation

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `searchParams` as plain object in page props | `searchParams` is a `Promise<...>` — must be awaited | Next.js 15 | All page components reading search params must `await searchParams` |
| Client-side state + `router.push` for filter tabs | URL search params + Server Component re-render | App Router pattern | No client state manager needed; server queries the right data directly |
| `middleware.ts` always Edge Runtime | Explicit `export const runtime = 'nodejs'` for Node.js APIs | Next.js 15 | Required when using LibSQL, `node:crypto` native addons in middleware |

**Deprecated/outdated:**
- `getServerSideProps` / `getStaticProps`: Not applicable in App Router. All data fetching is inside async Server Components or Route Handlers.
- Pages Router `query` object for search params: In App Router, `searchParams` is the equivalent — must be awaited in Next.js 15.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `searchParams` is a `Promise` in Next.js 15 pages and must be awaited | Pattern 2, Pitfall 3 | If synchronous, `await` is a no-op (safe). If async but not awaited, runtime crashes. |
| A2 | `drizzle-orm` `onConflictDoUpdate` is available for LibSQL/SQLite dialect | Code Examples | If unavailable, use DELETE + INSERT or a conditional UPDATE in settings service |
| A3 | `drizzle-orm` single-row `.get()` method is available in v0.45.2 | Code Examples | If unavailable, use `.all()` and take `[0]` |
| A4 | LibSQL/`@libsql/client` cannot run in Next.js Edge Runtime | Pitfall 1, Pattern 5 | If Edge Runtime gains Node.js compatibility, the `runtime = 'nodejs'` export is unnecessary but harmless |
| A5 | Module-level variables in `proxy.ts` are shared across requests within the same Node.js process on Vercel | Pattern 5 | On Vercel serverless, each cold start creates a fresh process — cache TTL is irrelevant on cold start. On warm instances, cache works as expected. |
| A6 | `cookies()` from `next/headers` is available inside App Router Route Handlers | Pattern 6, Admin Delete | If not available, fall back to parsing the `Cookie` header manually |
| A7 | `inArray` operator is available in `drizzle-orm` v0.45.2 for `WHERE status IN (...)` | Code Examples / getListingsByFilter | If unavailable, use `or(eq(status, 'active'), eq(status, 'taken'))` |
| A8 | The project's `proxy.ts` file is re-exported as or IS the `middleware.ts` entry point | Pattern 5 | If `middleware.ts` doesn't exist at all, the project may lack middleware — but the working invite gate in Phase 1 confirms middleware runs. Investigate actual entry point before implementing. |

---

## Open Questions

1. **Is `proxy.ts` the actual middleware entry point?**
   - What we know: `proxy.ts` exports `proxy` (async function) and `config` (matcher). Both are Next.js middleware exports. No `middleware.ts` found at project root.
   - What's unclear: Next.js requires `middleware.ts` (or `middleware.js`) at project root or `src/` — does a file named `proxy.ts` work? The working invite gate suggests it does, possibly via a build alias or because `middleware.ts` exists but wasn't found by glob.
   - Recommendation: Check next.config.ts or run `ls` at project root to confirm the actual middleware file name before touching the middleware caching logic. If `proxy.ts` is re-exported from `middleware.ts`, both files need editing.

2. **Does the existing `env.INVITE_TOKEN` getter need to stay as a fallback during the DB transition?**
   - What we know: Phase 3 replaces env-only token with DB token. The `env.ts` getter throws if `INVITE_TOKEN` is missing.
   - What's unclear: During the transition, should `INVITE_TOKEN` env var remain required (for the seed migration), or become optional?
   - Recommendation: Keep `INVITE_TOKEN` env var required but make it optional in `env.ts` (no validation error if absent after Phase 3). The seed migration uses it at deploy time; middleware no longer reads it at runtime after Phase 3.

3. **How should the optimistic removal work in `MarkTakenButton` (D-04)?**
   - What we know: D-04 says "poster's browser can optimistically remove it from the feed." The listing card is server-rendered.
   - What's unclear: Should the button call `router.refresh()` (re-queries the server) or use a client-side `useState` to hide the card? `router.refresh()` is cleaner but causes a full server re-render of the list. Hiding via local state is instant but requires the parent list to be a Client Component or for the card to manage its own visibility.
   - Recommendation: The simplest correct approach is `router.refresh()` from `next/navigation` after a successful PATCH. This re-fetches from the server and the card disappears naturally from the "Active" tab. Acceptable latency for a low-volume app.

---

## Environment Availability

No new external tools, services, or CLIs are required. All Phase 3 features use:
- Turso (already connected)
- Drizzle ORM (already installed, `drizzle-kit` for new migration)
- `node:crypto` (built-in, already in use)
- `lucide-react` (already installed)

Step 2.6: SKIPPED (no new external dependencies; all required tools confirmed available from Phase 1 and 2)

---

## Validation Architecture

`nyquist_validation` is set to `false` in `.planning/config.json`. This section is omitted.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (edit token, admin JWT) | `timingSafeEqual` for edit token; `jose jwtVerify` for admin JWT — both already implemented |
| V3 Session Management | no new concerns | Admin cookie flags established in Phase 1; no change |
| V4 Access Control | yes | `isAdmin` prop server-computed; DELETE/regen routes verify JWT server-side |
| V5 Input Validation | yes | Zod validates PATCH body (`editToken` field); Zod validates regen request |
| V6 Cryptography | yes | Edit token was `crypto.randomUUID()` (Phase 2); regen uses `crypto.randomBytes(32).toString('hex')` |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged edit token (brute force) | Tampering | `timingSafeEqual`; edit tokens are UUID-v4 (122-bit entropy) — brute force infeasible |
| Admin delete without auth | Elevation of Privilege | DELETE route verifies `admin_session` JWT; middleware gates `/admin/*` paths |
| Invite regen by non-admin | Elevation of Privilege | Regen route under `/admin/` path (middleware gate) + explicit JWT check in handler |
| Timing attack on token compare | Information Disclosure | `timingSafeEqual` from `node:crypto` — existing pattern from proxy.ts |
| Cache poisoning (stale token) | Spoofing | Cache TTL is 60s; worst case is 60s window where old token still works after regen — acceptable for this threat model |
| Double mark-taken | Tampering | Route Handler checks `status = 'active'` before update; service function uses `AND status='active'` guard |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: existing codebase] — `lib/schema.ts`, `proxy.ts`, `lib/session.ts`, `lib/listing-service.ts`, `app/[token]/api/listings/route.ts`, `app/[token]/admin/page.tsx` — all patterns confirmed by direct code inspection
- [VERIFIED: existing codebase] — `package.json` — confirmed all required packages are already installed (no new dependencies needed)

### Secondary (MEDIUM confidence)
- [ASSUMED] — Next.js 15 `searchParams` Promise type — training data knowledge, high confidence given Next.js 15 docs consistency
- [ASSUMED] — Drizzle ORM `onConflictDoUpdate`, `.get()`, `inArray` — training data knowledge; version 0.45.2 installed

### Tertiary (LOW confidence)
- [ASSUMED] — Next.js Edge Runtime LibSQL incompatibility — known pattern as of training cutoff; should be verified against current Next.js 15 docs before implementing middleware DB read

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all existing dependencies confirmed via package.json
- Architecture: HIGH — all patterns derived from existing codebase code (proxy.ts, admin/page.tsx, listing-service.ts)
- Pitfalls: HIGH (security/timing-safe compare, hydration, middleware runtime) — MEDIUM (Next.js 15 searchParams Promise, Edge Runtime behavior)
- Settings table / middleware cache: MEDIUM — pattern is sound; specific Drizzle API details tagged [ASSUMED]

**Research date:** 2026-05-18
**Valid until:** 2026-06-18 (stable stack; Next.js minor releases unlikely to break patterns within 30 days)
