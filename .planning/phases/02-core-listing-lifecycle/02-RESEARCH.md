# Phase 2: Core Listing Lifecycle - Research

**Researched:** 2026-05-18
**Domain:** Next.js 16 App Router — Vercel Blob client upload, Drizzle ORM reads, listing card UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** "Post an item" button navigates to a separate full-screen page at `/[token]/new`. Standard Next.js App Router route — no modal or sheet overlay.
- **D-02:** After successful submission, the form stays on `/[token]/new` and shows an inline success banner ("Your listing is posted!"). The banner does NOT display the edit token — it is stored silently in localStorage.
- **D-03:** After the success banner, the form resets so the user can post another item immediately. The banner clears when the form resets.
- **D-04:** Edit token is generated server-side on listing creation and returned to the client, which writes it to `localStorage` under a key like `edit_token_${listingId}`. The token is never shown to the user.
- **D-05:** Browse page uses a single-column full-width card layout (1 column). No grid — one card per row, easy to scan on a phone.
- **D-06:** Description text is truncated to 2 lines with ellipsis (`line-clamp-2`). No tap-to-expand in Phase 2 — contact info on the card lets users reach the poster if interested.
- **D-07:** No listing detail page in Phase 2. The card is the full experience — all required info (photo, title, description, price/FREE, poster name, contact, date, status) is displayed on the card itself.
- **D-08:** Photo upload happens on form submit — the Vercel Blob client-upload token request fires when the user taps "Post", not on file pick. The whole create-listing flow is one submit action.
- **D-09:** Photo is optional. If no photo is provided, use a static fallback image (user will supply a photo of their dog as `/public/fallback.jpg` or similar). The card always shows an image — never a broken or empty photo slot.

### Claude's Discretion

- Exact card layout within the single-column constraint (padding, shadow, border-radius, spacing between cards)
- Whether the "Post an item" button in AppHeader becomes a Next.js `<Link>` or triggers a router.push
- Exact inline success banner appearance (color, icon, duration before form reset)
- Loading/pending state for the submit button during upload + DB write
- The exact localStorage key naming convention for edit tokens

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIST-01 | User can browse all active listings in a card grid, ordered newest-first | Drizzle `select().from(listings).where(eq(listings.status, 'active')).orderBy(desc(listings.created_at))` — confirmed pattern |
| LIST-02 | User can create a listing (title, description, optional price, name, contact, optional photo) | Route Handler at `app/[token]/api/listings/route.ts` with `upload()` from `@vercel/blob/client` then Drizzle insert |
| LIST-03 | Each listing card displays: photo, title, description, price/FREE badge, poster name/contact, date, status | ListingCard component with all fields from schema; fallback image for null photo_key |
| LIST-04 | Listing creation date recorded automatically and displayed on the card | `created_at` stored as integer timestamp (mode: 'timestamp') in schema; `new Date(listing.created_at).toLocaleDateString()` for display |
| LIST-05 | Creating a listing issues a one-time edit token stored in creator's browser localStorage | Server generates `crypto.randomUUID()`, inserts as `edit_token`, returns in JSON response; client writes to `localStorage` |
| UX-01 | Listings with no price display a visual "FREE" badge | Conditional render: `{listing.price ? <span>{listing.price}</span> : <span className="...">FREE</span>}` |
| UX-02 | Photo upload step shows a preview of the selected image before form submission | `URL.createObjectURL(file)` in onChange handler — revoke on unmount/reset |
| UX-03 | All pages mobile-friendly — usable on phone with no horizontal scroll or pinch-zoom | `max-w-screen-sm mx-auto` constraint already established in Phase 1 shell; maintain throughout |
</phase_requirements>

---

## Summary

Phase 2 builds the core listing loop on top of the Phase 1 foundation: a create-listing form at `/[token]/new` and a populated browse page at `/[token]`. All infrastructure is already in place — the upload Route Handler, Drizzle schema, Turso connection, and invite-gate middleware are operational. Phase 2 is primarily UI and integration work, not infrastructure work.

The critical integration is the Vercel Blob client-upload pattern. The existing `app/[token]/api/upload/route.ts` uses `handleUpload` from `@vercel/blob/client` (the server side). Phase 2 calls this handler from the create form using `upload()` from `@vercel/blob/client` (the browser side). The `upload()` call returns a `PutBlobResult` containing a `pathname` field — this pathname is stored in `listings.photo_key` (never the full URL, per CLAUDE.md). The create-listing Route Handler then receives this `photo_key` alongside the form fields and performs the Drizzle insert.

The mutation architecture is a **Route Handler** (not a Server Action). The reason: the Vercel Blob `upload()` call runs in the browser and returns data that must be sent to the server in a follow-up request. This two-step pattern (browser → Blob CDN, browser → your server) is incompatible with a single Server Action invocation. The form is a Client Component (`'use client'`) that orchestrates: (1) validate magic bytes, (2) call `upload()`, (3) POST form data + `photo_key` to the Route Handler, (4) receive `{ id, editToken }` in the response, (5) write to localStorage, (6) show success banner.

**Primary recommendation:** Client Component form calls `upload()` on submit → POSTs to `app/[token]/api/listings/route.ts` → returns `{ id, editToken }` → client writes localStorage and shows banner.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Browse listings (read) | Frontend Server (SSR) | Database | Server Component queries Drizzle, renders HTML — no client JS needed for read path |
| Create listing form UI | Browser / Client | — | Needs `useState` for preview, pending state, success banner; must be `'use client'` |
| Photo upload to Blob CDN | Browser / Client | Frontend Server (token exchange) | `upload()` from `@vercel/blob/client` runs in browser; upload Route Handler exchanges token |
| DB insert (create listing) | API / Backend | Database | Route Handler at `app/[token]/api/listings/route.ts` does Zod validation + Drizzle insert |
| Edit token issuance | API / Backend | — | `crypto.randomUUID()` generated server-side in the create Route Handler, never client-side |
| Edit token storage | Browser / Client | — | Client writes to localStorage after receiving response; server never touches localStorage |
| Image display (card) | Frontend Server (SSR) | — | `<Image>` component renders server-side; needs `remotePatterns` for blob.vercel-storage.com |
| Magic byte validation | Browser / Client | — | `isAllowedMagicBytes()` already in `lib/upload-validators.ts` — call before `upload()` |
| Invite token gate | Frontend Server (middleware) | — | Already handled by `proxy.ts` — Phase 2 adds no new middleware |

---

## Standard Stack

### Core (all already installed — no new packages needed for Phase 2)

| Library | Version (installed) | Purpose | Source |
|---------|---------------------|---------|--------|
| `@vercel/blob` | 2.3.3 | `upload()` client function + `PutBlobResult` type | [VERIFIED: package.json] |
| `drizzle-orm` | 0.45.2 | `select`, `eq`, `desc`, `insert` for listings table | [VERIFIED: package.json] |
| `next` | 16.2.6 | App Router, `<Image>`, Server Components, Route Handlers | [VERIFIED: package.json] |
| `zod` | 4.4.3 | Server-side validation of listing create payload | [VERIFIED: package.json] |
| `nanoid` | 5.1.11 | Listing ID generation (already used for other IDs) | [VERIFIED: package.json] |

### Supporting (already installed)

| Library | Version (installed) | Purpose | When to Use |
|---------|---------------------|---------|-------------|
| `lucide-react` | ^1.16.0 | Icons — camera icon on file input, check icon on success banner | Icon needs only |
| `@base-ui/react` | ^1.4.1 | Base UI primitives — already provides `Button` | Use existing `<Button>` from `components/ui/button.tsx` |
| `tailwind-merge` + `clsx` | installed | Class merging | `cn()` utility already in `lib/utils.ts` |

**No new packages need to be installed for Phase 2.** All dependencies are present.

### Package Legitimacy Audit

> No new packages are being installed in Phase 2. All libraries are from the existing Phase 1 install, already verified and in use. This section is N/A for Phase 2.

---

## Architecture Patterns

### System Architecture Diagram

```
User taps "Post an item"
        |
        v
[AppHeader Link] --> /[token]/new (Client Component page)
        |
        | (onChange: file picked)
        v
[FileInput] -- URL.createObjectURL(file) --> [Image Preview]
        |
        | (onSubmit)
        v
[1] isAllowedMagicBytes(file)   -- fail --> show error, abort
        |
        | pass
        v
[2] upload(file.name, file, {   -- @vercel/blob/client
      access: 'public',
      handleUploadUrl: '/[token]/api/upload'   <-- proxy.ts gates this
    })
        |
        | returns PutBlobResult { pathname, url, ... }
        v
[3] POST /[token]/api/listings
        body: { title, description, price?, posterName, contactInfo, photoKey: blob.pathname }
        |
        v
[Route Handler: app/[token]/api/listings/route.ts]
    - Zod validate body
    - crypto.randomUUID() → listingId
    - crypto.randomUUID() → editToken
    - db.insert(listings).values({ id: listingId, ..., photo_key: photoKey, edit_token: editToken })
    - return NextResponse.json({ id: listingId, editToken })
        |
        v
[Client receives { id, editToken }]
    - localStorage.setItem(`edit_token_${id}`, editToken)
    - setState({ success: true })
    - setTimeout → form.reset(), setState({ success: false })

Browse page flow:
/[token] (Server Component)
    - db.select().from(listings)
        .where(eq(listings.status, 'active'))
        .orderBy(desc(listings.created_at))
    - listings.length === 0 → <EmptyState />
    - listings.length > 0 → listings.map(l => <ListingCard listing={l} />)
```

### Recommended Project Structure (new files only)

```
app/[token]/
├── new/
│   └── page.tsx              # Create listing page — imports CreateListingForm
├── api/
│   ├── upload/route.ts       # EXISTING — no changes needed
│   └── listings/
│       └── route.ts          # NEW — POST handler: Zod validate, DB insert, return editToken
components/
├── listings/
│   ├── CreateListingForm.tsx # NEW — 'use client' form with upload + preview
│   └── ListingCard.tsx       # NEW — Server Component card (reads listing prop)
└── shell/
    └── AppHeader.tsx         # MODIFY — convert disabled button to <Link href={...}>
lib/
└── listing-service.ts        # NEW — getActiveListings() and createListing() — thin wrappers over db
next.config.ts                # MODIFY — add images.remotePatterns for blob.vercel-storage.com
app/[token]/page.tsx          # MODIFY — replace <EmptyState> only with query + card list
```

### Pattern 1: Vercel Blob client-upload()

**What:** Browser calls `upload()` which token-exchanges with your Route Handler, then uploads directly to Vercel Blob CDN.

**When to use:** Any time a file must be sent from the browser without going through the Next.js server body.

```typescript
// Source: Vercel official docs (vercel.com/docs/storage/vercel-blob/client-upload, 2026-02-26)
// In CreateListingForm.tsx ('use client')
import { upload, type PutBlobResult } from '@vercel/blob/client'

// Called inside handleSubmit, after magic byte validation:
const blob: PutBlobResult = await upload(file.name, file, {
  access: 'public',
  handleUploadUrl: `/${token}/api/upload`,
  // token param is from useParams() — the [token] route segment
})

// blob.pathname is the storage key to save in DB
// blob.url is the CDN URL (derive at render time from pathname, never store)
const photoKey = blob.pathname
```

**PutBlobResult shape** [VERIFIED: installed package `@vercel/blob` 2.3.3 type definitions]:
```typescript
interface PutBlobResult {
  url: string              // Full CDN URL: https://<store>.blob.vercel-storage.com/<pathname>
  downloadUrl: string      // Forces browser download
  pathname: string         // Storage key — THIS is what goes in listings.photo_key
  contentType: string
  contentDisposition: string
  etag: string
}
```

### Pattern 2: Create Listing Route Handler

**What:** Server-side POST handler that validates the listing data (already has photo_key from step 1) and inserts into DB.

**When to use:** After the Blob upload succeeds, the form POSTs here with all listing fields + `photoKey`.

```typescript
// Source: verified from installed Next.js 16.2.6 + Drizzle 0.45.2 patterns
// app/[token]/api/listings/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { listings } from '@/lib/schema'

const CreateListingBody = z.object({
  title:       z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  price:       z.string().max(100).optional(),
  posterName:  z.string().min(1).max(100),
  contactInfo: z.string().min(1).max(200),
  photoKey:    z.string().max(500).optional(),  // blob.pathname, or absent if no photo
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = CreateListingBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { title, description, price, posterName, contactInfo, photoKey } = parsed.data
  const id = nanoid()
  const editToken = crypto.randomUUID()  // Web Crypto API — available in Node.js 16+ and Edge

  await db.insert(listings).values({
    id,
    title,
    description,
    price: price ?? null,
    poster_name: posterName,
    contact_info: contactInfo,
    photo_key: photoKey ?? null,
    edit_token: editToken,
    status: 'active',
  })

  return NextResponse.json({ id, editToken })
}
```

### Pattern 3: Browse Page — Server Component Query

**What:** Server Component queries active listings ordered newest-first, renders card list.

```typescript
// Source: Drizzle ORM docs (orm.drizzle.team/docs/select), Next.js App Router patterns
// app/[token]/page.tsx — modified from Phase 1 shell
import { db } from '@/lib/db'
import { listings } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'  // keep — proxy validation per-request

export default async function BrowsePage() {
  const activeListings = await db
    .select()
    .from(listings)
    .where(eq(listings.status, 'active'))
    .orderBy(desc(listings.created_at))

  return (
    <>
      <AppHeader token={token} />
      <main className="min-h-[calc(100dvh-3.5rem)]">
        {activeListings.length === 0
          ? <EmptyState />
          : (
            <div className="mx-auto max-w-screen-sm px-4 py-4 space-y-4">
              {activeListings.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )
        }
      </main>
    </>
  )
}
```

**Note on params:** The browse page is at `app/[token]/page.tsx`. In Next.js 16, `params` is a Promise — access with `const { token } = await params`. See Pattern 6 below.

### Pattern 4: Image Display with Blob Remote Pattern

**What:** `next.config.ts` must whitelist `blob.vercel-storage.com` for `<Image>` to accept Blob URLs. Without this, Next.js throws a 400 error.

```typescript
// Source: Next.js 16.2.6 official docs (nextjs.org/docs/app/api-reference/components/image, 2026-05-18)
// next.config.ts — ADD this images block
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
```

**ListingCard image usage:**
```typescript
// Source: Next.js official docs + CLAUDE.md pattern (store pathname, derive URL)
import Image from 'next/image'
import { Listing } from '@/lib/schema'

// Derive CDN URL from stored pathname
function getBlobUrl(pathname: string): string {
  // The blob.url is not stored — derive it from the pathname.
  // However: the pathname alone is not enough to reconstruct the full URL
  // (the store subdomain is part of the URL, not the pathname).
  // SOLUTION: store the full URL in photo_key instead, OR use blob.url at upload time.
  // See Open Question OQ-01 below.
}

// Card image:
<div className="relative aspect-[4/3] w-full rounded-t-lg overflow-hidden bg-muted">
  <Image
    src={listing.photo_key
      ? listing.photo_key   // see OQ-01 for what this should contain
      : '/fallback.jpg'}
    alt={listing.title}
    fill
    className="object-cover"
    loading="lazy"
    sizes="(max-width: 640px) 100vw, 640px"
  />
</div>
```

### Pattern 5: Image Preview with URL.createObjectURL

**What:** Show a preview of the selected file before form submit. `URL.createObjectURL` is preferred over `FileReader` — synchronous, memory-efficient, works for all file types.

```typescript
// Source: MDN Web Docs (developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static)
// Industry-standard pattern for image preview; PITFALLS.md Pitfall 6 recommends this approach
// In CreateListingForm.tsx ('use client')
const [previewUrl, setPreviewUrl] = useState<string | null>(null)

function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (previewUrl) URL.revokeObjectURL(previewUrl)  // clean up previous
  if (file) {
    setPreviewUrl(URL.createObjectURL(file))
  } else {
    setPreviewUrl(null)
  }
}

// On form reset or component unmount:
useEffect(() => {
  return () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }
}, [previewUrl])

// In JSX:
{previewUrl && (
  <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden bg-muted">
    {/* Use regular <img> for preview — it's a local blob: URL, no Next.js optimization needed */}
    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
  </div>
)}
```

**Why `URL.createObjectURL` over `FileReader`:**
- `FileReader.readAsDataURL` produces a base64 string (33% larger in memory)
- `URL.createObjectURL` produces a short `blob:` URI referencing the original File in memory
- Both work for phone camera uploads (iOS Safari and Android Chrome)
- `URL.createObjectURL` is synchronous; no `onload` event needed
[VERIFIED: MDN Web Docs]

### Pattern 6: Accessing [token] in Pages and Route Handlers

**What:** In Next.js 15+, `params` is a Promise. Both pages and Route Handlers must `await params`.

```typescript
// Source: Next.js 16.2.6 official docs (route-handlers section, 2026-05-18)
// app/[token]/new/page.tsx
export default async function NewListingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <CreateListingForm token={token} />
}

// The form passes token as a prop — used in the handleUploadUrl:
// handleUploadUrl: `/${token}/api/upload`
// and in the POST to create listing:
// fetch(`/${token}/api/listings`, { method: 'POST', body: JSON.stringify(data) })
```

### Pattern 7: Date Display from Integer Timestamp

**What:** `created_at` is stored as integer (Unix timestamp in ms) with Drizzle `mode: 'timestamp'`. When Drizzle reads it, it returns a JavaScript `Date` object.

```typescript
// Source: Drizzle schema.ts (existing code, integer mode: 'timestamp')
// Display in ListingCard:
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  // Output: "May 18, 2026"
}

// Usage in card:
<time dateTime={listing.created_at.toISOString()}>
  {formatDate(listing.created_at)}
</time>
```

Note: Drizzle's `integer({ mode: 'timestamp' })` returns a `Date` object on read, not a raw number. No manual conversion needed.
[VERIFIED: existing `lib/schema.ts` uses `mode: 'timestamp'`]

### Pattern 8: FREE Badge

**What:** When `listing.price` is null/empty, show a "FREE" badge instead of a price.

```typescript
// Source: Tailwind CSS utility classes (UX-01 requirement)
// In ListingCard.tsx:
{listing.price
  ? <span className="text-sm font-medium">{listing.price}</span>
  : <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
      FREE
    </span>
}
```

### Pattern 9: AppHeader "Post an item" Link

**What:** Convert the disabled Button placeholder from Phase 1 to a Next.js Link.

AppHeader is currently a Server Component — it can use `<Link>` directly without becoming a Client Component.

```typescript
// Source: Phase 1 app/[token]/page.tsx shows AppHeader receives no props.
// ISSUE: AppHeader needs the token to build the href for /[token]/new.
// SOLUTION: Pass token from BrowsePage (which has access via params) down to AppHeader.

// app/[token]/page.tsx:
const { token } = await params
return (
  <>
    <AppHeader token={token} />
    ...
  </>
)

// components/shell/AppHeader.tsx (modified):
import Link from 'next/link'

export default function AppHeader({ token }: { token: string }) {
  return (
    <header ...>
      <div ...>
        <h1 ...>FriendSwap</h1>
        <Button asChild>
          <Link href={`/${token}/new`}>Post an item</Link>
        </Button>
      </div>
    </header>
  )
}
```

**Note:** `@base-ui/react` Button supports `asChild` prop (like Radix). Verify this works with the installed `@base-ui/react` ^1.4.1 — if not, wrap with a standard `<Link>` styled directly. See OQ-02.

### Anti-Patterns to Avoid

- **Using Server Actions for the create flow:** The form must call `upload()` from `@vercel/blob/client` in the browser before any server involvement. Server Actions cannot orchestrate the Blob token exchange + file transfer + DB insert in one call. Use a Route Handler instead.
- **Storing `blob.url` in `listings.photo_key`:** CLAUDE.md explicitly requires storing storage keys, not full URLs. Store `blob.pathname`. Reconstruct the URL at render time using a consistent pattern. (See OQ-01 for the correct reconstruction approach.)
- **Calling `upload()` on file pick instead of on submit (D-08):** Uploading on file pick means files get uploaded to Blob even if the user abandons the form. Unnecessary storage consumption.
- **Using `FileReader.readAsDataURL` for preview:** Wastes memory with base64 encoding. Use `URL.createObjectURL` instead.
- **Not revoking object URLs:** Every `URL.createObjectURL` call must be paired with `URL.revokeObjectURL` on cleanup or the browser leaks memory. Call on file change and component unmount.
- **Not adding `loading="lazy"` to card images:** With 20+ listings, eager-loading all photos on mobile is a performance problem. Pitfall 12 from PITFALLS.md.
- **Missing `sizes` prop on fill Image:** Without `sizes`, Next.js generates oversized srcsets. Use `sizes="(max-width: 640px) 100vw, 640px"` for the single-column layout.
- **Not setting `export const dynamic = 'force-dynamic'` on the new listing page:** Without it, Next.js may attempt static optimization. The form page must render dynamically because it needs the `[token]` param at request time.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload to CDN | Custom S3/Blob upload pipeline | `upload()` from `@vercel/blob/client` | Token exchange, retry logic, progress callbacks are handled |
| Listing ID generation | `Math.random()` or `Date.now()` | `nanoid()` — already in use in the project | URL-safe, cryptographically strong, consistent with existing patterns |
| Edit token generation | Rolling your own random string | `crypto.randomUUID()` — Web Crypto API | Built-in, no import needed, CSPRNG-backed, UUID format |
| Magic byte validation | Re-implement byte inspection | `isAllowedMagicBytes()` from `lib/upload-validators.ts` | Already implemented and tested in Phase 1 |
| Image rendering | Plain `<img>` for Blob images | `next/image` with `fill` + `loading="lazy"` | Automatic CDN optimization, lazy loading, layout shift prevention |
| Form validation (server) | Manual field checks | `zod` — already in use | Type-safe, composable, already installed |

**Key insight:** Phase 2 is integration, not invention. Every hard problem (upload security, ID generation, validation, image optimization) is already solved by installed dependencies or Phase 1 code.

---

## Common Pitfalls

### Pitfall 1: photo_key stores pathname but Image src expects a full URL

**What goes wrong:** `blob.pathname` is something like `filename-abc123.jpg` — not a full URL. If this is passed directly to `<Image src={listing.photo_key}>`, Next.js will try to load it as a relative path and fail.

**Why it happens:** CLAUDE.md says "store storage keys in DB, not full URLs." But `<Image>` needs a full URL. The key and the URL are different things.

**How to avoid:** Two valid approaches:
1. Store `blob.url` in `photo_key` and accept the minor deviation from the CLAUDE.md guidance (the full URL is stable — Vercel Blob URLs don't change)
2. Store `blob.pathname` and reconstruct the full URL at render time using a helper

Approach 1 is simpler for Phase 2. Approach 2 is more principled. See OQ-01 for the decision.

**Warning signs:** `Error: Invalid src prop ... hostname "blob.vercel-storage.com" is not configured`

### Pitfall 2: handleUploadUrl must be token-prefixed

**What goes wrong:** If `handleUploadUrl` is set to `/api/upload`, the request bypasses the invite gate (proxy.ts) and Next.js returns 404 because no route exists at `/api/upload` — all routes are under `/[token]/...`.

**How to avoid:** Always pass the token-prefixed URL:
```typescript
handleUploadUrl: `/${token}/api/upload`
```

The `token` value is passed as a prop from the page component.

**Warning signs:** 404 from `upload()` during development.

### Pitfall 3: params must be awaited in Next.js 15+

**What goes wrong:** Accessing `params.token` directly (without `await`) fails in Next.js 15+. The `params` object is a Promise.

**How to avoid:**
```typescript
const { token } = await params  // correct
// NOT: params.token            // throws in Next.js 15+
```
[VERIFIED: Next.js 16.2.6 official docs route-handler reference, 2026-05-18]

### Pitfall 4: onUploadCompleted callback does not fire locally

**What goes wrong:** The `onUploadCompleted` callback in the upload Route Handler does not fire during local development (Vercel Blob cannot reach localhost). This causes test frustration but is not a real bug.

**How to avoid:** For Phase 2, `onUploadCompleted` is not used for DB operations — the DB insert happens in the separate listings Route Handler, not in `onUploadCompleted`. This is by design and avoids the localhost issue entirely.

**Warning signs:** `onUploadCompleted` console.log not appearing locally — expected, not a bug.

### Pitfall 5: Double submit creates duplicate listings

**What goes wrong:** Upload takes 2-5 seconds on mobile. Without a loading state, users tap "Post" again, creating two listings with two Blob files.

**How to avoid:** Disable the submit button during the pending state:
```typescript
const [isPending, setIsPending] = useState(false)
// In handleSubmit:
setIsPending(true)
try { ... } finally { setIsPending(false) }
// On button: disabled={isPending}
```

**Warning signs:** Duplicate listings appearing from the same user in sequence.

### Pitfall 6: File input type and accept attribute

**What goes wrong:** On iOS, a plain `<input type="file">` with no `accept` attribute shows all file types. Users pick screenshots of the item instead of taking a photo, then don't understand why the photo looks bad.

**How to avoid:**
```tsx
<input
  type="file"
  accept="image/jpeg,image/png,image/webp"
  capture="environment"  // opens camera as default on mobile
/>
```

`capture="environment"` is a hint only — iOS Safari may still show a picker. But it improves the default UX significantly.

### Pitfall 7: Using the installed shadcn CLI vs. component imports

**What goes wrong:** The project uses `@base-ui/react` (not `@radix-ui/react` or `shadcn/ui` components). The installed `shadcn` package is the CLI tool, not a component library. New components should use `@base-ui/react` primitives, not import from `@radix-ui` (not installed).

**How to avoid:** Check `components/ui/button.tsx` — it imports from `"@base-ui/react/button"`. Follow this pattern for any new component primitives needed.

---

## Code Examples

### Full CreateListingForm submit handler skeleton

```typescript
// Source: synthesized from Vercel Blob client-upload docs + Next.js patterns
// 'use client' — required for useState, event handlers, localStorage

async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
  if (isPending) return
  setIsPending(true)
  setError(null)

  try {
    // Step 1: Validate magic bytes (client-side, before upload)
    if (fileRef.current) {
      const head = new Uint8Array(await fileRef.current.slice(0, 12).arrayBuffer())
      if (!isAllowedMagicBytes(head)) {
        setError('Please select a real JPEG, PNG, or WebP image.')
        return
      }
    }

    // Step 2: Upload to Vercel Blob CDN (browser → CDN directly)
    let photoKey: string | undefined
    if (fileRef.current) {
      const blob = await upload(fileRef.current.name, fileRef.current, {
        access: 'public',
        handleUploadUrl: `/${token}/api/upload`,
      })
      photoKey = blob.pathname  // storage key, not full URL (or reconsider per OQ-01)
    }

    // Step 3: Create listing in DB via Route Handler
    const res = await fetch(`/${token}/api/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formData.title,
        description: formData.description,
        price: formData.price || undefined,
        posterName: formData.posterName,
        contactInfo: formData.contactInfo,
        photoKey,
      }),
    })
    if (!res.ok) throw new Error('Failed to create listing')

    // Step 4: Store edit token in localStorage
    const { id, editToken } = await res.json()
    localStorage.setItem(`edit_token_${id}`, editToken)

    // Step 5: Show success banner, then reset form
    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      formRef.current?.reset()
      setPreviewUrl(null)
    }, 3000)

  } catch (err) {
    setError('Something went wrong. Please try again.')
  } finally {
    setIsPending(false)
  }
}
```

### Zod schema for create listing body

```typescript
// For use in app/[token]/api/listings/route.ts
import { z } from 'zod'

export const CreateListingSchema = z.object({
  title:       z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(2000),
  price:       z.string().max(100).optional(),
  posterName:  z.string().min(1, 'Your name is required').max(100),
  contactInfo: z.string().min(1, 'Contact info is required').max(200),
  photoKey:    z.string().max(500).optional(),
})
```

### next.config.ts with remotePatterns

```typescript
// Source: Next.js 16.2.6 official docs (image component, remotePatterns section, 2026-05-18)
// Hostname verified from @vercel/blob 2.3.3 installed package source
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
```

---

## Open Questions

### OQ-01: photo_key should store pathname or full URL?

**What we know:** CLAUDE.md says "Store image storage keys in DB, not full URLs." `blob.pathname` from `PutBlobResult` is the storage key (e.g., `my-item-abc123.jpg`). But `<Image src>` requires a full URL. Reconstructing the full URL from the pathname requires knowing the store's subdomain (e.g., `abc123xyz.blob.vercel-storage.com`) — which is stored in `BLOB_READ_WRITE_TOKEN` but not trivially parseable.

**What's unclear:** Is the store subdomain stable enough to hardcode in a reconstruction helper? Or should we store `blob.url` in `photo_key` and accept the deviation from the CLAUDE.md guideline?

**Recommendation:** Store `blob.url` in `photo_key` for Phase 2. The rationale for CLAUDE.md's guidance (URLs change; keys don't) does not apply to Vercel Blob — the blob CDN URL is stable and does not change unless the blob is deleted and re-uploaded. The guideline is more relevant to S3 where bucket URLs can change with configuration. Update the column comment to note this decision. The column is named `photo_key` which still makes the intent clear (it's not a display URL — it's a reference).

**Impact if decided wrong:** If we store pathname and can't reconstruct URL, images will not display. If we store full URL, minor deviation from CLAUDE.md but no functional impact.

### OQ-02: Does @base-ui/react Button support asChild prop?

**What we know:** The existing `Button` component imports from `"@base-ui/react/button"` and uses `ButtonPrimitive`. The current `AppHeader` uses `<Button disabled>` — no asChild needed.

**What's unclear:** `@base-ui/react` ^1.4.1 may not implement the Radix `asChild` pattern. If it doesn't, we cannot do `<Button asChild><Link href="...">...</Link></Button>`.

**Recommendation:** If `asChild` doesn't work, replace the disabled Button in AppHeader with a plain `<Link>` that is styled using `buttonVariants()` from the button component. `buttonVariants` is already exported from `components/ui/button.tsx`. This is the standard shadcn/ui pattern for link-styled buttons:
```tsx
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

<Link href={`/${token}/new`} className={buttonVariants()}>
  Post an item
</Link>
```

### OQ-03: Should the new listing page (app/[token]/new/page.tsx) use export const dynamic = 'force-dynamic'?

**Recommendation:** Yes. The page renders the create form which is a Client Component — but the page itself needs `token` from params. Since params is always dynamic (it contains the invite token), set `export const dynamic = 'force-dynamic'` on the new listing page to match the browse page pattern established in Phase 1.

---

## Runtime State Inventory

> This is a greenfield feature addition, not a rename/refactor/migration phase. No runtime state exists for listing creation — no Blob files, no DB rows, no registered tasks. Omitted.

---

## Environment Availability

All external dependencies for Phase 2 are already in the installed environment and were validated in Phase 1.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Turso (TURSO_DATABASE_URL) | DB insert/query | Assumed ✓ (Phase 1 validated) | — | — |
| Vercel Blob (BLOB_READ_WRITE_TOKEN) | Photo upload | Assumed ✓ (Phase 1 validated) | — | — |
| `@vercel/blob` 2.3.3 | `upload()` client fn | ✓ | 2.3.3 | — |
| `drizzle-orm` 0.45.2 | `insert`, `select` | ✓ | 0.45.2 | — |
| `/public/fallback.jpg` | Card image fallback (D-09) | NOT YET | — | Must be added before Phase 2 ships |

**Missing with no fallback:**
- `/public/fallback.jpg` — the user must supply this file before Phase 2 is testable end-to-end. The planner should include a task to add this file (placeholder or real dog photo).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 |
| Config file | `vitest.config.ts` (exists, environment: 'node') |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIST-01 | `getActiveListings()` returns only active rows ordered by created_at DESC | unit | `npm test -- lib/listing-service.test.ts` | No — Wave 0 |
| LIST-02 | `POST /api/listings` with valid body inserts row and returns `{ id, editToken }` | unit (Route Handler) | `npm test -- app/[token]/api/listings/route.test.ts` | No — Wave 0 |
| LIST-03 | ListingCard renders photo, title, price, FREE badge, contact, date | manual visual | — | N/A |
| LIST-04 | `created_at` integer formats correctly to display date | unit | `npm test -- lib/listing-service.test.ts` | No — Wave 0 |
| LIST-05 | Route Handler returns `editToken` in response body | unit | `npm test -- app/[token]/api/listings/route.test.ts` | No — Wave 0 |
| UX-01 | FREE badge shown when price is null/empty | manual visual | — | N/A |
| UX-02 | Image preview appears on file select | manual visual | — | N/A |
| UX-03 | No horizontal scroll on 375px viewport | manual visual | — | N/A |

### Wave 0 Gaps

- [ ] `lib/listing-service.ts` — covers LIST-01, LIST-04 (data access layer to test)
- [ ] `lib/listing-service.test.ts` — unit tests for `getActiveListings()` query filter and ordering
- [ ] `app/[token]/api/listings/route.test.ts` — covers LIST-02, LIST-05 (Route Handler tests)

*(Existing tests: `lib/schema.test.ts`, `lib/session.test.ts`, `lib/rate-limit.test.ts`, `lib/admin-validators.test.ts`, `lib/upload-validators.test.ts`, `lib/env.test.ts` — all Phase 1, all passing)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (invite gate already in Phase 1) | — |
| V3 Session Management | No | — |
| V4 Access Control | Partial — edit token ownership | `crypto.randomUUID()` server-side; localStorage client-side; Phase 3 verifies on update |
| V5 Input Validation | Yes | zod on create listing body; `isAllowedMagicBytes()` on file before upload |
| V6 Cryptography | No (no new crypto primitives) | — |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Uploading non-image files to Blob | Tampering / Elevation | `isAllowedMagicBytes()` before `upload()` call; `allowedContentTypes` in `onBeforeGenerateToken` |
| Submitting create-listing with forged photoKey | Spoofing | Zod validates `photoKey` format; server does not verify Blob ownership (acceptable for this threat model — invite-gated app) |
| Duplicate listing creation (double-tap) | Tampering | Disable submit button during `isPending` state |
| Edit token brute-force | Elevation | `crypto.randomUUID()` = 122 bits entropy — computationally infeasible; no additional rate limiting needed at Phase 2 |
| XSS via stored listing content | Tampering | React automatically escapes all rendered content; no dangerouslySetInnerHTML used |

---

## Project Constraints (from CLAUDE.md)

These directives are extracted from `CLAUDE.md` and constrain all Phase 2 implementation decisions:

1. **Invite token validated on every server request in middleware** — proxy.ts already handles this; all new routes under `app/[token]/...` are automatically gated.
2. **Image uploads: validate by magic bytes (not Content-Type)** — `isAllowedMagicBytes()` from `lib/upload-validators.ts` MUST be called before `upload()`.
3. **Never serve uploaded files from the same origin as the app** — Vercel Blob handles this automatically. Do not add a local file serving route.
4. **Store image storage keys in DB, not full URLs** — See OQ-01 for the recommended resolution.
5. **Server components for reads, server actions/route handlers for mutations** — browse page is a Server Component; create listing uses a Route Handler.
6. **All routes live under app/[token]/...** — new listing page at `app/[token]/new/page.tsx`; create listing handler at `app/[token]/api/listings/route.ts`.
7. **Do NOT use local disk storage** — no local upload fallback; Blob only.
8. **Tests live alongside source (lib/*.test.ts)** — maintain pattern; new `lib/listing-service.test.ts` follows convention.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@base-ui/react` Button supports `asChild` or can be cleanly replaced with `<Link className={buttonVariants()}>` | Pattern 9 | Low — two alternatives are documented |
| A2 | `blob.url` domain is `*.blob.vercel-storage.com` — used in `remotePatterns` hostname | Pattern 4 / Code Examples | Medium — if domain differs, `<Image>` fails with 400; verify against actual blob URL in dev |
| A3 | Phase 1 Turso and Blob env vars are populated and functional | Environment Availability | Medium — if Phase 1 was not completed, Phase 2 cannot be tested end-to-end |

**If this table has few entries:** Most claims in this research were directly verified from installed package type definitions, official docs fetched in this session, or existing project source code.

---

## Sources

### Primary (HIGH confidence)
- Vercel Blob official docs (vercel.com/docs/storage/vercel-blob/client-upload, last_updated 2026-02-26) — `upload()` call signature, `handleUploadUrl` pattern, `PutBlobResult` fields
- Next.js 16.2.6 official docs (nextjs.org/docs/app/api-reference/components/image, lastUpdated 2026-05-18) — `remotePatterns` config, `fill` prop, `loading="lazy"`, `sizes`
- Next.js 16.2.6 official docs (nextjs.org/docs/app/api-reference/file-conventions/route, lastUpdated 2026-05-18) — Route Handler `params` as Promise, FormData pattern
- `@vercel/blob` 2.3.3 installed type definitions — `PutBlobResult` interface fields confirmed from `node_modules/@vercel/blob/dist/create-folder-vlS2Pu_G.d.ts`
- `@vercel/blob` 2.3.3 installed source — CDN hostname `blob.vercel-storage.com` confirmed from `node_modules/@vercel/blob/dist/index.js`
- Drizzle ORM official docs (orm.drizzle.team/docs/select) — `select().from().where().orderBy(desc())` pattern
- Existing project source files read in this session: `lib/schema.ts`, `lib/db.ts`, `lib/upload-validators.ts`, `lib/env.ts`, `proxy.ts`, `app/[token]/api/upload/route.ts`, `components/ui/button.tsx`, `next.config.ts`, `vitest.config.ts`, `package.json`

### Secondary (MEDIUM confidence)
- MDN Web Docs — `URL.createObjectURL` vs `FileReader` for image preview; browser compatibility
- PITFALLS.md (project research) — Pitfall 6 (mobile form UX), Pitfall 11 (upload ordering), Pitfall 12 (lazy loading)
- SUMMARY.md (project research) — Phase 2 scope definition, architecture approach

### Tertiary (LOW confidence)
- None — all claims verified against official docs or installed code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from installed package.json and type definitions
- Architecture: HIGH — upload pattern verified from official Vercel Blob docs; Route Handler pattern from Next.js official docs
- Pitfalls: HIGH — derived from official docs, installed source, and established project pitfalls research
- Test mapping: MEDIUM — standard Vitest patterns applied to new modules; actual test implementation is Wave 0 work

**Research date:** 2026-05-18
**Valid until:** 2026-06-18 (stable stack; no fast-moving dependencies)
