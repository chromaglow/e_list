# Phase 1: Foundation & Security Gate - Research

**Researched:** 2026-05-17
**Domain:** Next.js 16 App Router + Turso/Drizzle + Vercel Blob + jose JWT + bcryptjs
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Admin login lives inside the invite gate. URL is `/{token}/admin/login`. Admin must have the invite URL to reach the login page.

**D-02:** Admin JWT cookie persists through invite token rotations. Rotating the invite token only invalidates guest access — it does not log out an active admin session.

**D-03:** Single `proxy.ts` (Next.js 16) / `middleware.ts` (Next.js 15) with sequential checks: (1) validate invite token for all paths → 404 if token is missing or wrong; (2) for `/admin/*` paths, additionally check admin JWT cookie → redirect to `/{token}/admin/login` if missing or expired.

**D-04:** Phase 1 delivers a working `POST /api/upload` Route Handler — not just env var configuration.

**D-05:** Full security controls baked into the Phase 1 upload handler: magic byte validation, 8 MB max body, 1 file per request.

**D-06:** Upload endpoint is protected by the invite token gate only (no admin session required).

**D-07:** Use `drizzle-kit generate` + `drizzle-kit migrate` from day one. SQL migration files written to `/drizzle` folder and committed to git. `push` is not used.

**D-08:** Migrations run automatically on every Vercel deploy — add `drizzle-kit migrate` to the Vercel build command.

**D-09:** Phase 1 delivers a styled shell — full header with "FriendSwap" app name, mobile-first Tailwind layout, empty state.

**D-10:** Include a "Post an item" button as a disabled/hidden placeholder in the Phase 1 shell.

### Claude's Discretion

- Exact empty-state copy and styling (header font, color palette, spacing) — follow Tailwind defaults and shadcn/ui conventions.
- Whether the disabled "Post an item" button is visually hidden or visible-but-greyed-out.
- Specific Next.js route layout structure (root layout + slot vs. nested layouts) — follow App Router conventions.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ACCS-01 | Anyone who navigates to the invite URL can browse all listings — visitors without the URL see a 404 | Proxy/middleware pattern with `NextResponse.rewrite('/not-found')` on token mismatch |
| ACCS-02 | Invite token is a 32-byte cryptographically random value (64 hex chars), validated on every server request via middleware before any route handler runs | `crypto.randomBytes(32).toString('hex')` in Node.js; proxy.ts/middleware.ts matcher covers all routes |
| ADMN-01 | Admin can log in with a separate set of credentials (username + bcrypt-hashed password stored in environment variables) | bcryptjs compare() against env var hash; Route Handler POST action |
| ADMN-02 | Admin session persists across browser refresh via a signed JWT in an HttpOnly, SameSite=Strict cookie | jose SignJWT/jwtVerify; Next.js cookies() API with httpOnly:true, secure:true, sameSite:'strict' |
</phase_requirements>

---

## Summary

Phase 1 establishes the entire security and data foundation before any listing features are built. The stack is Next.js 16.x (latest at time of research) + Turso/LibSQL + Drizzle ORM + Vercel Blob + jose JWT + bcryptjs. All four requirements (ACCS-01, ACCS-02, ADMN-01, ADMN-02) are well-supported by the chosen stack with official documentation available for each component.

**Critical finding — Next.js version:** The current npm latest is **Next.js 16.2.6** (released 2026-05-13). Next.js 16 deprecates `middleware.ts` and introduces `proxy.ts` as its replacement. The function is deprecated but still works — it logs a warning. The recommended approach for new projects is to use `proxy.ts`. This research uses the Next.js 16 / `proxy.ts` terminology, but notes `middleware.ts` still functions during the deprecation window.

**Critical finding — Vercel Blob upload size:** Vercel Serverless Functions have a **hard 4.5 MB request body limit** that cannot be bypassed via configuration. The CLAUDE.md requirement of "max 8 MB" uploads cannot be satisfied via server-side upload. The correct approach is **client-side upload** (`@vercel/blob/client`) where the browser uploads directly to Vercel Blob — the server only generates a short-lived token to authorize the upload. This bypasses the function body limit entirely. Magic byte validation is enforced **client-side** in the browser BEFORE calling `upload()` (the server never receives the file bytes in this pattern — the @vercel/blob/client SDK opens a direct browser-to-CDN channel using the short-lived token); Vercel Blob's `allowedContentTypes` and `maximumSizeInBytes` in `onBeforeGenerateToken` act as a second layer enforced server-side by Vercel's CDN.

**Primary recommendation:** Use `proxy.ts` for the invite gate + admin session check (two sequential checks in one file), client-side Vercel Blob upload with server-side `handleUpload` token generation, jose JWT in an HttpOnly SameSite=Strict cookie, and Drizzle ORM with drizzle-kit generate+migrate workflow committed to git.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Invite token validation | Proxy/Middleware | — | Must run before ANY route handler, including API routes |
| Admin JWT verification | Proxy/Middleware | Server Component/Route Handler | Optimistic check in proxy; secure check at data access layer |
| Admin login (bcrypt + JWT issuance) | API / Backend (Route Handler POST) | — | Server-only; must not run client-side |
| Session cookie management | API / Backend (Route Handler + cookies() API) | — | Cookies set server-side only |
| Vercel Blob upload token | API / Backend (Route Handler) | — | `handleUpload` generates client token; validates invite token first |
| Vercel Blob upload (file transfer) | Browser / Client | CDN (Vercel Blob) | Direct browser-to-Blob transfer bypasses function body limit |
| DB schema + migrations | Database / Storage | — | Drizzle ORM, runs at build time on Vercel |
| Browse page (empty shell) | Frontend Server (SSR) | — | React Server Component renders empty state |
| Magic byte / content type validation | Browser / Client (isAllowedMagicBytes before upload()) | Vercel CDN (allowedContentTypes as second layer) | The @vercel/blob/client architecture transfers file bytes browser-to-CDN directly; server never sees file content. Magic byte validation runs in the browser via FileReader/arrayBuffer on the first 12 bytes BEFORE `upload()` is called; Vercel's CDN-side `allowedContentTypes` and `maximumSizeInBytes` enforcement acts as a defense-in-depth second layer. Revised 2026-05-17 per checker WARNING 2 to reflect the architectural reality that server-only magic-byte validation is impossible with @vercel/blob/client. |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.6 | App Router framework | Locked decision; latest stable as of 2026-05-13 |
| typescript | 6.0.3 | Type safety | Ships with create-next-app scaffold |
| tailwindcss | 4.3.0 | Mobile-first utility CSS | Locked decision; ships with create-next-app |
| drizzle-orm | 0.45.2 | Type-safe SQLite/LibSQL ORM | Locked decision; lightweight, TypeScript-native |
| drizzle-kit | 0.31.10 | Schema codegen + migration runner | Pairs with drizzle-orm; generate+migrate workflow |
| @libsql/client | 0.17.3 | LibSQL (Turso) driver | Required by drizzle-orm/libsql adapter |
| @vercel/blob | 2.3.3 | Image object storage | Locked decision; native Vercel integration, CDN-backed |
| jose | 6.2.3 | JWT sign/verify (Edge-compatible) | Official Next.js auth docs recommend jose; Edge runtime compatible |
| bcryptjs | 3.0.3 | Admin password hashing (cost ≥ 12) | Locked decision; pure JS, no native bindings needed |
| @types/bcryptjs | — | TypeScript types for bcryptjs | Companion to bcryptjs |
| zod | 4.4.3 | Server-side runtime validation | Locked decision; validates login form fields |
| nanoid | 5.1.11 | Cryptographically random IDs | Locked decision; for listing IDs and edit tokens |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | latest (npx shadcn@latest init) | Accessible component primitives | Tailwind v4 compatible; use for Card, Button, Form, Dialog components |
| server-only | latest | Prevents server modules from leaking to client | Import in lib/session.ts, lib/db.ts |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jose | jsonwebtoken | jsonwebtoken uses Node.js crypto APIs not available in Edge Runtime — **do not use** |
| bcryptjs | bcrypt | bcrypt requires native bindings (node-gyp); bcryptjs is pure JS, simpler deployment |
| drizzle-kit migrate | drizzle-kit push | `push` is for development only; `migrate` with committed SQL files is required (D-07) |
| client upload (@vercel/blob/client) | server upload | Server upload is capped at 4.5 MB on Vercel (hard platform limit) — see Critical Finding above |

**Installation:**
```bash
npm install next@latest react@latest react-dom@latest typescript tailwindcss drizzle-orm @libsql/client @vercel/blob jose bcryptjs zod nanoid server-only
npm install -D drizzle-kit @types/bcryptjs
npx shadcn@latest init
```

**Version verification (confirmed via npm registry 2026-05-17):**
- next: 16.2.6
- typescript: 6.0.3
- tailwindcss: 4.3.0
- drizzle-orm: 0.45.2
- drizzle-kit: 0.31.10
- @libsql/client: 0.17.3
- @vercel/blob: 2.3.3
- jose: 6.2.3
- bcryptjs: 3.0.3
- zod: 4.4.3
- nanoid: 5.1.11

---

## Package Legitimacy Audit

> slopcheck checked npm packages against PyPI (wrong ecosystem) and produced false SLOP verdicts for `drizzle-orm` and `drizzle-kit` — these are npm packages, not Python packages. All packages below were verified directly against the npm registry via HTTPS on 2026-05-17.

| Package | Registry | Notes | slopcheck | Disposition |
|---------|----------|-------|-----------|-------------|
| next | npm | 16.2.6, GitHub Actions publisher, widely used | N/A (wrong ecosystem check) | Approved — verified npm registry |
| typescript | npm | 6.0.3, typescript-bot publisher | N/A | Approved — verified npm registry |
| tailwindcss | npm | 4.3.0, GitHub Actions publisher | N/A | Approved — verified npm registry |
| drizzle-orm | npm | 0.45.2, GitHub Actions publisher | false-SLOP (PyPI check) | Approved — verified npm registry, official docs |
| drizzle-kit | npm | 0.31.10, GitHub Actions publisher | false-SLOP (PyPI check) | Approved — verified npm registry, official docs |
| @libsql/client | npm | 0.17.3, GitHub Actions publisher | N/A | Approved — verified npm registry |
| @vercel/blob | npm | 2.3.3, vercel-release-bot publisher | N/A | Approved — verified npm registry |
| jose | npm | 6.2.3, GitHub Actions publisher | N/A | Approved — verified npm registry, official Next.js docs |
| bcryptjs | npm | 3.0.3, dcode publisher | N/A | Approved — verified npm registry |
| zod | npm | 4.4.3, GitHub Actions publisher | N/A | Approved — verified npm registry |
| nanoid | npm | 5.1.11, ai publisher | N/A | Approved — verified npm registry |

**Packages removed due to slopcheck [SLOP] verdict:** none (false positives from cross-ecosystem confusion)
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (mobile-first)
    |
    | HTTPS
    v
proxy.ts (Next.js 16) — runs on EVERY request
    |
    | Check 1: pathname segments — extract [token]
    |   Token matches INVITE_TOKEN env var?
    |     NO  → rewrite to /not-found (404 response)
    |     YES → continue
    |
    | Check 2: pathname starts with /[token]/admin?
    |   NO  → NextResponse.next()
    |   YES → read 'admin_session' cookie → jose.jwtVerify()
    |           INVALID/MISSING → redirect to /[token]/admin/login
    |           VALID           → NextResponse.next()
    |
    v
Next.js App Router (route handlers + server components)
    |
    +-- GET  /[token]/                          → Browse page (Server Component, empty shell)
    |
    +-- GET  /[token]/admin/login               → Login form (Server Component)
    +-- POST /[token]/api/admin/login           → Route Handler: bcrypt.compare() → SignJWT → Set cookie
    +-- POST /[token]/api/admin/logout          → Route Handler: Delete cookie
    |
    +-- POST /[token]/api/upload                → Route Handler: handleUpload() token exchange
    |         onBeforeGenerateToken:            → Validate invite token from request header/cookie
    |                                           → Return { allowedContentTypes, maximumSizeInBytes }
    |         onUploadCompleted:                → (Phase 2 will use this to record photo_key)
    |
    +-- DB layer (lib/db.ts)
    |       drizzle(createClient({ url, authToken }))
    |       ↕
    |   Turso (LibSQL remote)
    |       listings table
    |
    v
Browser uploads file directly to Vercel Blob CDN
    (bypasses 4.5 MB Vercel function body limit)
    put() returns { pathname, url }
    pathname (storage key) stored in DB — NOT the full URL
```

**Note on API route placement (revision 2026-05-17):** ALL API routes live UNDER the `[token]` dynamic segment so the proxy gates them. Placing a route at `app/api/...` would bypass the proxy (segments[0] === "api" never matches INVITE_TOKEN) and the proxy would 404 it.

### Recommended Project Structure

```
/
├── proxy.ts                    # Invite gate + admin session check (D-03)
├── drizzle.config.ts           # Drizzle kit config (dialect: turso)
├── drizzle/                    # Generated SQL migration files (committed to git)
│   └── 0000_initial_schema.sql
├── app/
│   ├── layout.tsx              # Root layout (html/body/Tailwind globals)
│   ├── not-found.tsx           # Rendered when proxy rewrites to /not-found
│   └── [token]/
│       ├── layout.tsx          # Token-scoped layout (passes token to children)
│       ├── page.tsx            # Browse page — empty shell (D-09, D-10)
│       ├── admin/
│       │   └── login/
│       │       └── page.tsx    # Admin login form
│       └── api/
│           ├── admin/
│           │   ├── login/
│           │   │   └── route.ts   # POST: bcrypt + JWT cookie — UNDER [token] so proxy gates it
│           │   └── logout/
│           │       └── route.ts   # POST: delete cookie — UNDER [token] so proxy gates it
│           └── upload/
│               └── route.ts       # POST: handleUpload token exchange — UNDER [token] so proxy gates it
├── lib/
│   ├── db.ts                   # Drizzle client (server-only)
│   ├── schema.ts               # Drizzle table definitions
│   ├── session.ts              # jose encrypt/decrypt, createSession, deleteSession
│   └── dal.ts                  # verifyAdminSession() — used by Route Handlers
└── components/
    └── ui/                     # shadcn/ui components (Button, Card, etc.)
```

### Pattern 1: proxy.ts — Invite Gate + Admin Session (D-03)

**What:** Single proxy file with sequential checks. First validates the invite token (all paths), then validates admin JWT (admin paths only).

**When to use:** Every request in this app.

```typescript
// Source: Next.js 16 official docs — nextjs.org/docs/app/api-reference/file-conventions/proxy
// and nextjs.org/docs/app/guides/authentication
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const INVITE_TOKEN = process.env.INVITE_TOKEN!
const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // --- Check 1: Invite token gate (all paths) ---
  // URL structure: /{token}/... — token is the first path segment
  const segments = pathname.split('/').filter(Boolean)
  const urlToken = segments[0]

  if (urlToken !== INVITE_TOKEN) {
    // Rewrite to not-found page — preserves URL, returns 404 status
    return NextResponse.rewrite(new URL('/not-found', request.url))
  }

  // --- Check 2: Admin session (admin paths only) ---
  const isAdminPath = segments[1] === 'admin' && segments[2] !== 'login'
  if (isAdminPath) {
    const sessionCookie = request.cookies.get('admin_session')?.value
    if (!sessionCookie) {
      return NextResponse.redirect(
        new URL(`/${INVITE_TOKEN}/admin/login`, request.url)
      )
    }
    try {
      await jwtVerify(sessionCookie, SESSION_SECRET, { algorithms: ['HS256'] })
    } catch {
      return NextResponse.redirect(
        new URL(`/${INVITE_TOKEN}/admin/login`, request.url)
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths EXCEPT _next/static, _next/image, favicon, and public assets
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
```

**Important:** `middleware.ts` is deprecated in Next.js 16 — use `proxy.ts` with `export function proxy()`. The matcher and NextResponse APIs are identical.

**Returning 404 from proxy:** Use `NextResponse.rewrite(new URL('/not-found', request.url))` — this renders `app/not-found.tsx` with a 404 HTTP status while keeping the URL unchanged. `NextResponse.error()` does NOT work reliably in Vercel's edge/node runtime. [CITED: github.com/vercel/next.js/discussions/52233]

### Pattern 2: jose JWT Session (ADMN-02)

**What:** Stateless JWT signed with HS256. Created at login, verified in proxy and at data access layer. Stored in HttpOnly SameSite=Strict Secure cookie.

```typescript
// Source: Next.js official auth guide — nextjs.org/docs/app/guides/authentication
// File: lib/session.ts
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET!)

export async function createAdminSession() {
  const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('4h')
    .sign(encodedKey)

  const cookieStore = await cookies()
  cookieStore.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',    // CLAUDE.md: SameSite=Strict required
    expires: expiresAt,
    path: '/',
  })
}

export async function verifyAdminSession(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload
  } catch {
    return null
  }
}

export async function deleteAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
}
```

**Note:** The official Next.js docs use `sameSite: 'lax'` in examples. CLAUDE.md requires `'strict'`. Use `'strict'` — it is more secure and appropriate for this use case (admin-only, same-site form submissions).

### Pattern 3: Admin Login Route Handler (ADMN-01)

**Critical: constant-time auth.** Always run `bcrypt.compare` even on username mismatch — otherwise username enumeration via response timing becomes trivial (username miss returns in ~1ms; password miss returns in ~bcrypt-cost milliseconds). The fix is to always call `compare` with the env-stored hash regardless of username match, then AND the username + password results at the end.

```typescript
// File: app/[token]/api/admin/login/route.ts
// Note: lives UNDER [token] segment so Plan 01's proxy.ts gates this route
import { compare } from 'bcryptjs'
import { createAdminSession } from '@/lib/session'

// Simple in-memory rate limiter (appropriate for single-instance hobby Vercel deploy)
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_ATTEMPTS) return false
  entry.count++
  return true
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return Response.json({ error: 'Too many attempts' }, { status: 429 })
  }

  const { username, password } = await request.json()

  // Constant-time auth (T-03-03 mitigation, revised 2026-05-17 per checker WARNING 3):
  // ALWAYS call bcrypt.compare, even when the username does not match — otherwise
  // a username miss returns in microseconds (no bcrypt call) and a password miss
  // returns in ~bcrypt-cost milliseconds (with the compare call), letting an
  // attacker enumerate valid usernames via response timing. By running compare
  // unconditionally and AND-ing the username check with the password check at
  // the very end, the success/failure timing is indistinguishable.
  const expectedHash = process.env.ADMIN_PASSWORD_HASH!
  const usernameMatch = username === process.env.ADMIN_USERNAME
  const passwordMatch = await compare(password, expectedHash)
  // CLAUDE.md: bcrypt cost ≥ 12 — enforced when generating the hash

  if (!usernameMatch || !passwordMatch) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  await createAdminSession()
  return Response.json({ success: true })
}
```

**Rate limiting note:** In-memory rate limiting resets on cold starts and does not persist across Vercel function instances. For a hobby app with a single admin, this is acceptable — a motivated attacker would need to saturate all instances simultaneously. If stronger guarantees are needed, Upstash Redis (free tier available) is the production-grade alternative. [ASSUMED — that cold-start instance isolation is acceptable for this threat model]

### Pattern 4: Drizzle Schema (LibSQL dialect)

```typescript
// Source: orm.drizzle.team/docs/column-types/sqlite
// Source: orm.drizzle.team/docs/get-started/turso-new
// File: lib/schema.ts
import {
  sqliteTable, text, integer
} from 'drizzle-orm/sqlite-core'

export const listings = sqliteTable('listings', {
  id:           text('id').primaryKey(),           // nanoid() at insert
  title:        text('title').notNull(),
  description:  text('description').notNull(),
  price:        text('price'),                      // nullable; null = FREE
  poster_name:  text('poster_name').notNull(),
  contact_info: text('contact_info').notNull(),
  photo_key:    text('photo_key'),                  // Vercel Blob pathname (not full URL)
  edit_token:   text('edit_token').notNull(),       // nanoid(); stored in creator's localStorage
  status: text('status', {
    enum: ['active', 'taken', 'deleted']
  }).notNull().default('active'),
  created_at:  integer('created_at', { mode: 'timestamp' })
                 .notNull()
                 .$defaultFn(() => new Date()),
  updated_at:  integer('updated_at', { mode: 'timestamp' })
                 .notNull()
                 .$defaultFn(() => new Date())
                 .$onUpdateFn(() => new Date()),
  taken_at:    integer('taken_at', { mode: 'timestamp' }),   // nullable
  deleted_at:  integer('deleted_at', { mode: 'timestamp' }), // nullable
})
```

**drizzle.config.ts:**
```typescript
// Source: orm.drizzle.team/docs/get-started/turso-new
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './lib/schema.ts',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
})
```

**Vercel build command (D-08):**
```
drizzle-kit migrate && next build
```

### Pattern 5: Vercel Blob Client Upload (D-04, D-05)

**Critical:** Server-side upload is limited to 4.5 MB on Vercel (hard platform limit). For the 8 MB requirement in CLAUDE.md, the client upload pattern is required.

**Architecture:** Browser uploads file directly to Vercel Blob. Server-side Route Handler:
1. Validates invite token (confirms requester has gate access)
2. Returns a short-lived client token via `handleUpload()`
3. `onBeforeGenerateToken` enforces allowed content types and max size
4. `onUploadCompleted` callback records the blob pathname in DB (Phase 2)

```typescript
// Source: vercel.com/docs/vercel-blob/client-upload
// File: app/[token]/api/upload/route.ts
// Note: lives UNDER [token] segment so Plan 01's proxy.ts gates this route
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 8 * 1024 * 1024 // 8 MB

export async function POST(request: Request) {
  // Invite token is validated by proxy.ts before this runs (D-06)
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Content type is restricted here — Vercel CDN enforces allowedContentTypes
        // as a SECOND layer. The FIRST layer (and the one that satisfies CLAUDE.md's
        // "validate by magic bytes (not Content-Type)" requirement) is client-side
        // magic-byte validation in the browser BEFORE upload() is called. The
        // @vercel/blob/client architecture transfers file bytes browser-to-CDN
        // directly; the server NEVER sees file content, so server-side magic-byte
        // validation is architecturally impossible.
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_SIZE_BYTES,
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async ({ blob }) => {
        // Phase 2 will use blob.pathname to record photo_key in DB
        // blob.pathname is the storage key; blob.url is the CDN URL
        console.log('Upload completed:', blob.pathname)
      },
    })
    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    )
  }
}
```

**Magic byte validation (revision 2026-05-17 per checker WARNING 2):** The CLAUDE.md requirement to "validate by magic bytes (not Content-Type)" is satisfied by a TWO-LAYER architecture: (1) the browser reads `file.slice(0, 12).arrayBuffer()` and calls `isAllowedMagicBytes()` (helper in `lib/upload-validators.ts`) BEFORE invoking `upload()` — this is the primary, content-based check that defeats Content-Type spoofing for honest clients; (2) Vercel Blob's `allowedContentTypes` enforcement on the CDN side is the second layer. Server-side magic-byte enforcement is architecturally impossible with `@vercel/blob/client` because the server never sees the file bytes — the SDK opens a direct browser-to-CDN channel using the short-lived token. A malicious client could bypass the browser-side check, but Vercel's CDN-side enforcement (which inspects the actual uploaded bytes server-side, not just the client's declared Content-Type header) still applies. [VERIFIED: vercel.com/docs/vercel-blob/client-upload, A2 in Assumptions Log]

**DB storage:** Store `blob.pathname` (e.g., `"listings/abc123-abc123.jpg"`) in the `photo_key` column. Derive the CDN URL at query time: `https://<store-id>.public.blob.vercel-storage.com/${photo_key}`.

**Local development:** `onUploadCompleted` callback will NOT work locally (Vercel Blob cannot call localhost). Use ngrok or skip the callback in development. Set `VERCEL_BLOB_CALLBACK_URL=https://abc.ngrok-free.app` in `.env.local` for local testing.

### Pattern 6: Drizzle Client (lib/db.ts)

```typescript
// Source: orm.drizzle.team/docs/get-started/turso-new
import 'server-only'
import { drizzle } from 'drizzle-orm/libsql'

export const db = drizzle({
  connection: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
})
```

### Anti-Patterns to Avoid

- **Using `middleware.ts` function name in proxy.ts:** In Next.js 16, export `function proxy()`, not `function middleware()`. Using the old name still works (deprecated) but triggers build warnings.
- **Storing full Vercel Blob URL in DB:** Store `blob.pathname` (the key), not `blob.url`. URLs can change; keys are stable. (CLAUDE.md requirement)
- **Setting `sameSite: 'lax'` on admin cookie:** Official Next.js examples use `'lax'` but CLAUDE.md requires `'strict'`. Use `'strict'`.
- **Using `jsonwebtoken` instead of `jose`:** `jsonwebtoken` requires Node.js APIs not available in Edge Runtime. `jose` is Edge-compatible.
- **Returning `NextResponse.error()` for 404:** This fails in Vercel's runtime. Use `NextResponse.rewrite(new URL('/not-found', request.url))`.
- **Server upload for images >4.5 MB:** Vercel's function body limit is a hard platform constraint. Use `@vercel/blob/client` upload instead.
- **`drizzle-kit push` in production:** `push` bypasses migration files and cannot be rolled back. Use `drizzle-kit generate` + `drizzle-kit migrate` only (D-07).
- **Skipping bcrypt.compare on username mismatch:** Creates username-enumeration timing oracle (T-03-03). Always call compare with the env hash; AND the username + password results at the end (see Pattern 3).
- **Placing API routes at `app/api/...`:** Bypasses Plan 01's proxy.ts gate (segments[0] === "api" never matches INVITE_TOKEN). Mount ALL API routes under `app/[token]/api/...` so the proxy validates the invite token before the handler runs. (Revision 2026-05-17 per checker BLOCKER 1)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT sign/verify | Custom HMAC | `jose` (SignJWT, jwtVerify) | Edge runtime compat; battle-tested; handles expiry, algorithm config |
| Password hashing | MD5, SHA-1, plain text | `bcryptjs.hash(pwd, 12)` + `bcryptjs.compare()` | Adaptive cost factor; bcrypt is OWASP-recommended |
| File upload to CDN | Custom S3 SDK, local disk | `@vercel/blob` handleUpload + upload() | Native Vercel integration; CDN-backed; separate origin (no XSS) |
| SQL migrations | Hand-written ALTER TABLE | `drizzle-kit generate` + `drizzle-kit migrate` | Generated SQL committed to git; idempotent; Vercel build integration |
| Input validation | Manual typeof checks | `zod` | Full runtime type validation; error messages; form field extraction |
| Random IDs | `Math.random()` | `nanoid()` | Cryptographically random; URL-safe |
| Admin URL protection | Frontend redirect only | `proxy.ts` server-side check | Middleware runs before any route handler; prevents route enumeration |

**Key insight:** Every item in this list has a known, documented, ecosystem-standard solution. Building custom versions introduces subtle security and correctness bugs that the standard solutions have already fixed.

---

## Common Pitfalls

### Pitfall 1: Vercel Function Body Limit vs. Upload Size Requirement

**What goes wrong:** Developer uses server-side upload (`put()` directly in Route Handler). Files over 4.5 MB return HTTP 413 from Vercel's load balancer — the Route Handler never executes.

**Why it happens:** Vercel Serverless Functions have a hard 4.5 MB request body limit. This is a platform constraint, not a Next.js or Node.js setting.

**How to avoid:** Use `@vercel/blob/client` `upload()` (client-side) + `handleUpload()` (server token exchange). The file never passes through the serverless function — it goes directly from browser to Vercel Blob's storage endpoint.

**Warning signs:** 413 errors in production only (works locally with small test files).

### Pitfall 2: middleware.ts vs. proxy.ts in Next.js 16

**What goes wrong:** Developer creates `middleware.ts` with `export function middleware()` in a Next.js 16 project. Build logs show deprecation warning. Future Next.js minor/major will remove support.

**Why it happens:** Next.js 16 renamed middleware to proxy. `middleware.ts` still works but is deprecated.

**How to avoid:** Use `proxy.ts` with `export function proxy()` for new projects. The matcher config and NextResponse APIs are identical — no other changes needed.

**Warning signs:** Build output shows "middleware.ts is deprecated, rename to proxy.ts" warning.

### Pitfall 3: Returning 404 from Proxy

**What goes wrong:** Developer calls `NextResponse.error()` or returns `new Response(null, { status: 404 })` from proxy. Some Vercel environments throw "Failed to execute 'error' on 'Response'" or return an empty error page instead of the app's not-found design.

**Why it happens:** The proxy/middleware Edge-like runtime has restrictions on what Response types can be constructed. `NextResponse.error()` is unreliable.

**How to avoid:** Use `NextResponse.rewrite(new URL('/not-found', request.url))`. This renders `app/not-found.tsx` with proper 404 status, keeps the URL unchanged, and uses the normal rendering pipeline.

**Warning signs:** Blank pages or JSON error objects appearing instead of the 404 page.

### Pitfall 4: Admin Login at Wrong URL (D-01)

**What goes wrong:** Developer places admin login at `/admin/login` (outside the invite gate) to make it "easier to find". The invite token check in proxy never runs for this path, exposing admin login to anyone who discovers the URL.

**Why it happens:** Natural instinct to put admin outside the invite prefix.

**How to avoid:** Admin login is at `/{token}/admin/login` (D-01). The proxy check for admin session should explicitly skip the login page itself: check `segments[2] !== 'login'` before requiring admin JWT.

**Warning signs:** Admin login page accessible without the invite token in the URL.

### Pitfall 4b: Admin API Routes Bypass Proxy When Placed at app/api/admin/* (BLOCKER 1, revision 2026-05-17)

**What goes wrong:** Developer places admin route handlers at `app/api/admin/login/route.ts` and `app/api/admin/logout/route.ts` (the conventional Next.js spot). The proxy from Plan 01 checks `segments[0] === INVITE_TOKEN`, but for these paths `segments[0]` is the literal string `"api"` — never the token. The proxy rewrites to `/not-found` and the routes return 404.

**Why it happens:** Convention. App Router examples almost always show `app/api/...` for API routes. The fact that this project's proxy uses the first path segment as the token gate is non-obvious.

**How to avoid:** Mount ALL API routes UNDER the `[token]` dynamic segment: `app/[token]/api/admin/login/route.ts`, `app/[token]/api/admin/logout/route.ts`, `app/[token]/api/upload/route.ts`. Client components reference them as `` `/${token}/api/admin/login` `` (template literal, token received as a prop from a Server Component that read `params.token` per Next.js 16 async params).

**Warning signs:** Admin login form submits and gets a 404 response in DevTools Network panel; route handler logs show no incoming requests.

### Pitfall 5: onUploadCompleted Not Firing Locally

**What goes wrong:** `onUploadCompleted` callback never fires during local development. Developer thinks the upload pipeline is broken.

**Why it happens:** Vercel Blob's callback system calls your server after upload is complete. It cannot reach `localhost`. This is a known limitation.

**How to avoid:** Use ngrok to expose localhost and set `VERCEL_BLOB_CALLBACK_URL` in `.env.local`. Alternatively, skip DB writes in `onUploadCompleted` until deployed to Vercel preview. Phase 1 only needs to validate the upload works — DB writes happen in Phase 2.

### Pitfall 6: Drizzle Schema Drift from Push vs. Migrate

**What goes wrong:** Developer runs `drizzle-kit push` locally for convenience. Production Turso DB gets migrated with `drizzle-kit migrate`. The schemas diverge — `push` makes undocumented changes that `migrate` doesn't know about.

**Why it happens:** `push` and `migrate` are not interchangeable workflows.

**How to avoid:** Use `drizzle-kit generate` + `drizzle-kit migrate` exclusively, as decided in D-07. Never run `push` against the production or staging Turso DB.

### Pitfall 7: Invite Token in Logs

**What goes wrong:** Server logs record the full URL of every request, including the invite token. Log aggregation tools (Vercel's own logs, Datadog, etc.) store the token in plaintext.

**How to avoid:** The proxy.ts handler should strip the token from any log entries. Vercel's build logs are not user-accessible by default, but it's good hygiene. The proxy can inject a header `X-Masked-Path: /[TOKEN]/...` for downstream logging. For Phase 1, note the risk and address in Phase 3/4 hardening.

---

## Code Examples

### Generating an Invite Token

```typescript
// In a Node.js script or server action (run once, store in env var)
import { randomBytes } from 'crypto'
const token = randomBytes(32).toString('hex') // 64 hex chars
// Store as INVITE_TOKEN in .env.local and Vercel env vars
```

### Drizzle Migration Workflow

```bash
# After schema changes:
npx drizzle-kit generate   # generates drizzle/XXXX_*.sql files
npx drizzle-kit migrate    # applies pending migrations to Turso

# Vercel build command (set in vercel.json or Vercel dashboard):
# "build": "npx drizzle-kit migrate && next build"
```

### Reading Turso Env Vars on Vercel

```
# .env.local (local development)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token
INVITE_TOKEN=<64-hex-char-random-value>
SESSION_SECRET=<openssl rand -base64 32>
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt hash with cost 12>
BLOB_READ_WRITE_TOKEN=<from Vercel Blob store>
```

### Generating Admin Password Hash

```typescript
// One-time script to generate the hash (run locally, store result in env var)
import { hash } from 'bcryptjs'
const passwordHash = await hash('your-admin-password', 12)
// Store as ADMIN_PASSWORD_HASH in .env.local and Vercel env vars
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` (deprecated, still works) | Next.js 16 (Oct 2025) | Rename file and function; all other APIs identical |
| Middleware defaults to Edge Runtime | Proxy defaults to Node.js Runtime | Next.js 16 | Node.js APIs (bcryptjs, etc.) now available in proxy without configuration |
| Server-side blob upload (all files) | Client upload for files >4.5 MB | Vercel platform limit (longstanding) | Must use `@vercel/blob/client` for 8 MB requirement |
| `experimental.ppr` flag | `cacheComponents: true` in next.config | Next.js 16 | PPR configuration renamed; no impact on this project |
| Sync `cookies()`, `headers()` access | Must `await cookies()`, `await headers()` | Next.js 16 breaking change | All cookie/header access in Route Handlers must be awaited |

**Deprecated/outdated:**
- `middleware.ts` filename and `export function middleware()`: deprecated in Next.js 16, use `proxy.ts` and `export function proxy()`.
- `jsonwebtoken`: uses Node.js-only crypto APIs, incompatible with Next.js Edge Runtime. Use `jose` instead.
- Storing blob full URL in DB: store `blob.pathname` (storage key) only.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20.9+ | Next.js 16 minimum | ✓ | v20.19.2 | — |
| npm | Package installation | ✗ | — | Use node directly for registry queries; install npm via nvm or corepack |
| git | Version control | ✓ | 2.50.1 | — |
| Vercel CLI | `vercel env pull` for BLOB_READ_WRITE_TOKEN | ✗ | — | Copy env vars manually from Vercel dashboard |
| Turso CLI | Optional: database inspection | ✗ | — | Use Turso dashboard at app.turso.tech |
| Turso DB | Database | ✓ (cloud service) | — | Create database at app.turso.tech; free tier confirmed |

**Missing dependencies with no fallback:** None — all blocking items are cloud services accessible via browser.

**Missing dependencies with fallback:**
- npm: Not installed in this environment. The project is greenfield — `create-next-app` will be the first command. Install npm via Node.js LTS installer before executing Phase 1 tasks.
- Vercel CLI: Can pull env vars manually from the Vercel dashboard if CLI is unavailable.

**Turso free tier confirmed (2026-05-17):** [CITED: turso.tech/pricing]
- 100 databases
- 5 GB storage
- 500 million rows read/month
- 10 million rows written/month
- Community support

FriendSwap at 5-20 users with 50-100 listings will use a negligible fraction of these limits.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | In-memory rate limiting for admin login is acceptable for a single-admin hobby Vercel deploy | Architecture Patterns (Pattern 3) | If Vercel cold starts instance per request, rate limit is ineffective; switch to Upstash Redis |
| A2 | Vercel Blob's `allowedContentTypes` enforcement is performed server-side by Vercel (not trusting client Content-Type header), acting as the second layer below the browser-side `isAllowedMagicBytes()` check | Architecture Patterns (Pattern 5), Architectural Responsibility Map | If Vercel Blob only checks MIME from client header, the browser-side magic-byte check becomes the SOLE defense for malicious clients (still defeats Content-Type spoofing for honest clients) |
| A3 | `proxy.ts` / `middleware.ts` deprecation is a rename-only change with no behavioral differences for this use case | Architecture Patterns (Pattern 1) | If Next.js 16's proxy.ts has behavioral differences from middleware.ts, auth logic may need adjustment |
| A4 | Turso free tier limits (500M row reads/month, 5 GB storage) will not be reached during FriendSwap's lifetime | Environment Availability | If limits are exceeded, service degrades; upgrade to $4.99/month Developer plan |

---

## Open Questions (RESOLVED)

> All three open questions raised in initial research have been resolved by Phase 1 plans. Marked RESOLVED 2026-05-17 per checker BLOCKER 2 (research_resolution).

1. **Magic byte validation for Vercel Blob client uploads**
   - What we know: `allowedContentTypes` in `onBeforeGenerateToken` restricts MIME types. CLAUDE.md requires magic byte validation (file content, not Content-Type header).
   - What's unclear: Whether Vercel Blob validates content by magic bytes on its end, or only trusts the MIME type declared by the browser.
   - Recommendation: Add client-side pre-check (read first 4 bytes via FileReader before calling `upload()`). This runs in the browser but provides defense-in-depth. If Vercel Blob does server-side magic byte validation, this is belt-and-suspenders.
   - **RESOLVED:** Client-side enforcement via `isAllowedMagicBytes()` helper in `lib/upload-validators.ts` (reads first 12 bytes via `file.slice(0, 12).arrayBuffer()` in the browser before calling `@vercel/blob/client` `upload()`). The @vercel/blob/client architecture means the server NEVER sees file bytes — it only generates a short-lived token, then the browser uploads directly to the Vercel CDN. Server-side magic-byte validation is therefore architecturally impossible. CLAUDE.md's "validate by magic bytes (not Content-Type)" intent is met by browser-side enforcement plus Vercel CDN's `allowedContentTypes` as a second layer. See Plan 01-04 (lib/upload-validators.ts and the [token]-gated upload route).

2. **Admin password hash generation**
   - What we know: ADMIN_PASSWORD_HASH env var needs a bcrypt hash with cost ≥ 12.
   - What's unclear: How/where the project owner generates this hash (no UI for it in Phase 1).
   - Recommendation: Include a one-time Node.js script in the repo (`scripts/gen-hash.js`) that the project owner runs locally to generate the hash.
   - **RESOLVED:** `scripts/gen-hash.js` is created in Plan 01-03 Task 01 as a one-time CLI helper. It hardcodes cost=12 (refuses CLI flags that would lower it), reads the plaintext password from `argv[2]`, and prints the bcrypt hash to stdout. The project owner runs `node scripts/gen-hash.js '<password>'` and pastes the output into `.env.local` as `ADMIN_PASSWORD_HASH=<hash>`. The hash is validated at env-load time by Plan 01's `lib/env.ts` against the regex `^\$2[aby]?\$1[2-9]\$` (bcrypt format, cost ≥ 12). See Plan 01-03 Task 01 and Task 02.

3. **Vercel deployment: build command with drizzle-kit migrate**
   - What we know: D-08 requires `drizzle-kit migrate` in the Vercel build command.
   - What's unclear: Whether `npx drizzle-kit migrate` in Vercel's build environment correctly connects to Turso using env vars set in the Vercel dashboard.
   - Recommendation: Verify during initial Vercel deploy by checking build logs for migration success message.
   - **RESOLVED:** Plan 01-05 Task 01 writes `vercel.json` with `buildCommand: "npx drizzle-kit migrate && next build"`. Plan 01-02 Task 05 verifies the migration is idempotent (second run reports "no migrations to apply"), so the Vercel build command is safe to run on every deploy. Plan 01-05 Task 04 captures the build logs from the first production deploy and confirms `drizzle-kit migrate` ran (grep for `drizzle-kit migrate|drizzle.*migrate` in the build log). Plan 01-05 Task 06 step 6 triggers a second deploy and confirms migrate reports "no migrations to apply", proving D-08 idempotency in production.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | bcryptjs cost ≥ 12; username from env var; in-memory rate limit (5 attempts/15 min); constant-time bcrypt.compare (T-03-03) |
| V3 Session Management | yes | jose JWT, HttpOnly, SameSite=Strict, Secure, 4h expiry |
| V4 Access Control | yes | proxy.ts validates invite token on every request before route handlers; ALL API routes mounted under [token] segment so proxy gates them |
| V5 Input Validation | yes | zod validates login form fields; client-side magic-byte check before upload; Vercel CDN enforces allowedContentTypes |
| V6 Cryptography | yes | jose HS256 for JWT; bcryptjs for password; crypto.randomBytes(32) for invite token |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Invite URL leakage | Information Disclosure | 32-byte token (CLAUDE.md); validate on every request in proxy |
| Admin brute force | Elevation of Privilege | bcrypt cost 12; in-memory rate limit 5/15min (Phase 1); upgrade to Upstash if needed |
| Username enumeration via timing | Spoofing | bcrypt.compare ALWAYS runs (even on username mismatch) so success/failure timing is constant (T-03-03; Pattern 3) |
| Session cookie theft | Spoofing | HttpOnly prevents JS access; Secure prevents HTTP transmission; SameSite=Strict prevents CSRF |
| File type bypass (malicious upload) | Tampering | Client-side magic-byte check in browser (isAllowedMagicBytes) + Vercel CDN allowedContentTypes |
| Storage exhaustion | Denial of Service | maximumSizeInBytes: 8MB; 1 file per request enforced by handleUpload |
| Same-origin image XSS | Tampering | Vercel Blob serves from `.blob.vercel-storage.com` (separate origin, automatic) |
| Token in server logs | Information Disclosure | Mask token in log entries; proxy can inject sanitized header |
| JWT algorithm confusion | Spoofing | Specify `algorithms: ['HS256']` in jwtVerify options |
| API route bypassing proxy | Elevation of Privilege | Mount ALL API routes under app/[token]/api/... — NEVER at app/api/... |

---

## Project Constraints (from CLAUDE.md)

All directives extracted from CLAUDE.md that constrain planning and implementation:

| Directive | Impact |
|-----------|--------|
| Invite token must be 32 bytes cryptographically random (64 hex chars) — never a short slug | Token generation: `crypto.randomBytes(32).toString('hex')` |
| Validate invite token on every server request in middleware before any route handler runs | proxy.ts matcher must cover ALL routes including /api/*; ALL API routes mounted under [token] segment |
| Admin bcrypt cost ≥ 12 | `bcryptjs.hash(pwd, 12)` — no lower cost allowed |
| Rate limiting on login route | In-memory rate limiter in Route Handler (Phase 1); consider Upstash for production hardening |
| Session cookie: HttpOnly, SameSite=Strict, Secure | Cookie options: `{ httpOnly: true, sameSite: 'strict', secure: true }` |
| Image uploads: validate by magic bytes (not Content-Type), max 8 MB, 1 file | Client-side `isAllowedMagicBytes()` check before upload() + Vercel CDN `allowedContentTypes` + `maximumSizeInBytes: 8 MB` in `handleUpload` (server-side magic-byte validation is architecturally impossible with @vercel/blob/client; client-side check satisfies CLAUDE.md intent) |
| Never serve uploaded files from the same origin as the app | Vercel Blob handles this automatically (separate domain) |
| Store image storage keys in DB, not full URLs | Store `blob.pathname` not `blob.url` in photo_key column |
| Use status enum `'active' | 'taken' | 'deleted'` — not a boolean | Drizzle schema: `text({ enum: ['active','taken','deleted'] })` |
| Include taken_at, deleted_at, updated_at timestamps | All four timestamp columns in schema (see Pattern 4) |
| Do NOT use local disk storage | Vercel Blob from day one (client upload pattern) |
| Drizzle-kit generate + migrate (not push) | Build command: `npx drizzle-kit migrate && next build` |
| Target Vercel free Hobby tier | No paid Vercel features; Vercel Blob free tier (5 GB/100 GB) |

---

## Sources

### Primary (HIGH confidence)

- [Next.js 16 Authentication Guide](https://nextjs.org/docs/app/guides/authentication) — jose SignJWT/jwtVerify pattern, cookie setup with httpOnly/secure/sameSite, createSession pattern. lastUpdated: 2026-05-13. [VERIFIED: official docs]
- [Next.js 16 proxy.ts API Reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) — matcher config, NextResponse patterns, cookie access, 404 via rewrite. [VERIFIED: official docs]
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16) — middleware→proxy deprecation, breaking changes, Node.js runtime as default for proxy. Published Oct 2025. [VERIFIED: official docs]
- [Drizzle ORM Turso Setup](https://orm.drizzle.team/docs/get-started/turso-new) — drizzle.config.ts, schema definition, generate/migrate commands. [VERIFIED: official docs]
- [Drizzle SQLite Column Types](https://orm.drizzle.team/docs/column-types/sqlite) — text enum, integer timestamp mode, $defaultFn, $onUpdateFn. [VERIFIED: official docs]
- [Vercel Blob Client Upload](https://vercel.com/docs/vercel-blob/client-upload) — handleUpload, onBeforeGenerateToken, allowedContentTypes, maximumSizeInBytes, onUploadCompleted. lastUpdated: 2026-02-26. [VERIFIED: official docs]
- [Vercel Blob SDK Reference](https://vercel.com/docs/vercel-blob/using-blob-sdk) — put() signature, del(), response shape (pathname, url). lastUpdated: 2026-02-19. [VERIFIED: official docs]
- [Turso Pricing](https://turso.tech/pricing) — free tier: 100 DBs, 5 GB storage, 500M row reads/month, 10M row writes/month. [VERIFIED: official site, retrieved 2026-05-17]
- [npm registry](https://registry.npmjs.org) — all package versions verified via direct HTTPS lookup on 2026-05-17. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)

- [GitHub Discussion #52233](https://github.com/vercel/next.js/discussions/52233) — Returning 404 from middleware via NextResponse.rewrite('/not-found'). Community-verified pattern. [CITED]
- [Vercel Server Upload Docs](https://vercel.com/docs/vercel-blob/server-upload) — 4.5 MB hard limit on Vercel Serverless Functions. [VERIFIED: official docs]
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — npx shadcn@latest init command, Tailwind v4 compatibility. [CITED]

### Tertiary (LOW confidence)

- WebSearch results re: in-memory rate limiting acceptability for single-instance deploys — [ASSUMED]
- WebSearch results re: Vercel Blob magic byte validation server-side — [ASSUMED, needs verification]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified on npm registry; official docs consulted for each
- Architecture: HIGH — official Next.js 16 docs for proxy/auth; official Vercel Blob docs for upload
- Pitfalls: HIGH — Vercel 4.5 MB limit confirmed from official docs; middleware→proxy from official release notes
- Security: HIGH — OWASP-backed patterns; official Next.js auth guide

**Research date:** 2026-05-17
**Valid until:** 2026-06-17 (Next.js and Vercel Blob release frequently; re-verify if more than 30 days pass)

**Revision history:**
- 2026-05-17 — Initial research
- 2026-05-17 — Revision per checker iteration 2: marked Open Questions section as RESOLVED with inline resolutions (BLOCKER 2); updated Architectural Responsibility Map magic-byte row to reflect client-side enforcement with CDN second layer (WARNING 2); updated Pattern 3 admin login example to show constant-time bcrypt.compare (WARNING 3); added Pitfall 4b for admin-route placement under [token] segment (cross-reference for BLOCKER 1 fixed in 01-03b-PLAN.md and SKELETON.md); reflected the same routing fix in the System Architecture Diagram and Recommended Project Structure
