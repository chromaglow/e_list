# Technology Stack

**Project:** FriendSwap
**Researched:** 2026-05-17
**Overall confidence:** HIGH (core framework/hosting), MEDIUM (DB/ORM version pinning)

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.x (App Router) | Full-stack web framework | Single repo for UI + API routes + server actions. App Router makes file-based routing, server components, and route handlers trivially easy. No separate backend process needed for a solo dev. |
| React | 19.x | UI rendering | Bundled with Next.js; no separate install needed. |
| TypeScript | 5.x | Type safety | Catches shape errors on listing/form data early; Next.js ships TS config out of the box. |

**Why Next.js over alternatives:**
- **SvelteKit** — excellent but smaller ecosystem; TypeScript support is good but component library options (Radix, shadcn) are React-first. Solo dev benefits from the larger React hiring/help pool.
- **Remix** — strong routing model but Vercel/Cloudflare deployment story requires more config than Next.js on Vercel. Overkill for this scale.
- **Express/Hono + separate React SPA** — two deployment targets, two build pipelines, CORS config. Unnecessary complexity for one developer.
- **Plain HTML + minimal server** — tempting at this scale but you lose automatic image optimization, mobile-friendly component libraries, and TypeScript tooling.

**Decision:** Next.js 15 App Router. File-based routing, server actions handle form submissions natively, and Route Handlers cover the admin API. One repo, one `vercel deploy`.

---

### Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | v4.3 | Utility-first CSS | Current stable (confirmed May 2026). Zero-runtime, ships lean CSS. Mobile-first by default — essential for phone users. v4 uses a Vite plugin model; Next.js integration is via PostCSS (still works cleanly). |
| shadcn/ui | latest | Accessible component primitives | Copy-paste components built on Radix UI. Provides a card grid, dialogs, and form inputs that are mobile-accessible without reinventing them. Not a dependency — source lives in your repo. |

**Why not CSS Modules or styled-components:** Tailwind + shadcn is the 2025 default for React apps. It avoids runtime style injection and the class-based approach pairs well with server components.

---

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| SQLite (via better-sqlite3) | 3.x / 9.x | Primary data store | The entire dataset at 5–20 users is trivially small. SQLite is a single file, zero-config, zero-cost, and has no network hop. No Postgres instance to provision, no connection pooling to configure. |
| Drizzle ORM | 0.3x | SQL query builder + migrations | Lightweight, TypeScript-first, excellent SQLite support. Generates SQL you can read. Drizzle Kit handles migrations (`drizzle-kit push` for development). |

**Why not Postgres/PlanetScale/Supabase:** Any hosted Postgres adds a free-tier connection limit, a cold-start latency hit on serverless, and a monthly cost cliff once free tiers expire. For 5–20 friends and a handful of listings, SQLite is not a compromise — it is the right tool.

**Important hosting note:** SQLite as a file on disk only works when you control the server filesystem (Railway, Render, VPS, or a Fly.io machine). On Vercel's serverless functions, the filesystem is ephemeral per invocation — SQLite will not persist. See the Hosting section below.

**Why not Prisma:** Prisma's query engine adds ~30 MB cold-start overhead to serverless bundles and requires a separate binary. Drizzle compiles to plain JS and is significantly lighter.

---

### Image Storage

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel Blob | @vercel/blob (latest) | User-uploaded listing photos | Object storage backed by S3 with a global CDN. Free Hobby tier includes 5 GB storage + 100 GB/month bandwidth — vastly more than needed for 5–20 users posting one photo per listing. Photos are served as public blobs (anyone with the URL can view), which is correct for this app. |

**Why not local disk:** Photos saved to the server filesystem will be wiped on Vercel deployments (ephemeral). Even on a VPS, serving images from disk puts them behind your app server; a CDN is faster and survives deploys.

**Why not Cloudflare R2:** Also excellent and free-tier-friendly (~10 GB free storage, zero egress fees). R2 requires a Cloudflare account and slightly more setup (S3-compatible SDK). Vercel Blob is the simpler choice when already deploying to Vercel — one dashboard, `@vercel/blob` SDK, done. If not using Vercel, R2 is the best alternative.

**Why not AWS S3:** Requires IAM setup, no free tier on storage, egress costs add up. Overkill.

**Photo flow:** Browser submits multipart form → Next.js Route Handler receives file via `request.formData()` → `put()` uploads to Vercel Blob → returns public URL stored in SQLite listing row.

---

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| jose | ^5.x | JWT signing/verification for admin session | Edge-compatible (runs in Next.js Middleware). Used exactly as described in Next.js official auth docs. No external service needed for a single admin credential. |
| next/headers + cookies() | built-in | Stateless session cookie | HttpOnly, Secure, SameSite=lax cookie stores a signed JWT. Admin checks in Middleware redirect unauthenticated requests away from `/admin/*` routes. |

**Auth model:**
- General visitors: zero auth — any request with the invite token in the URL path (or session) is allowed to browse and post. The invite token is a 256-bit random hex string stored in an env var.
- Admin: single hardcoded credential (password stored as a bcrypt hash in env var). On login, a 7-day JWT cookie is issued via `jose`. Middleware checks the cookie on `/admin/*` routes.

**Why not NextAuth/Clerk/Auth0:** These are built for multi-user auth systems with OAuth, social login, and user tables. For a single admin credential and invite-link access, a ~50-line custom session is less surface area than wiring up an auth SaaS.

**Why bcrypt for the admin password:** Even though it's one account, bcrypt prevents timing attacks on the comparison and is standard practice. `bcryptjs` (pure JS, no native bindings) is easiest on Vercel.

---

### Hosting & Deployment

| Platform | Tier | Why |
|----------|------|-----|
| Vercel | Hobby (free) | Zero-config Next.js deployment, global CDN, automatic HTTPS, preview deploys on push. Integrates natively with Vercel Blob. |

**SQLite on Vercel — the problem:** Vercel's serverless functions use ephemeral containers; a SQLite file written in one invocation will not exist in the next. Solutions:

1. **Vercel KV (Upstash Redis)** — for simple key-value data, but requires rethinking the relational schema.
2. **Turso (LibSQL)** — SQLite-compatible, edge-native database with a generous free tier (500 DBs, 9 GB storage). Drop-in replacement via `@libsql/client`. Strongly recommended for Vercel deployments.
3. **Railway / Render / Fly.io** — deploy as a persistent Node.js server where a local SQLite file survives across requests. Gives you true filesystem persistence.

**Recommendation:** Use **Turso** for the database if deploying to Vercel. Turso speaks the SQLite wire protocol, Drizzle has a `libsql` driver, and the Hobby tier is free. This keeps the entire stack on Vercel+Turso with zero infrastructure cost.

If you prefer a traditional server (more control, simpler mental model), deploy to **Railway** ($5/month Developer plan) and use a plain SQLite file on disk. Railway gives you a persistent filesystem and is the simplest full-stack Node.js host after Vercel.

---

### Supporting Libraries

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `zod` ^3.x | Runtime validation of form inputs on the server | Always — validates listing fields (title required, price is a number, etc.) and admin login before touching the DB |
| `bcryptjs` ^2.4 | Admin password hashing | Single use on admin login route — pure-JS bcrypt, no native addon needed on Vercel |
| `sharp` (optional) | Server-side image resizing before upload | If you want to cap photo file size — resize to max 1200px wide on the server before sending to Vercel Blob. Optional for MVP. |
| `nanoid` ^5 | Generating the invite token and listing IDs | Cryptographically random, URL-safe, 21-character IDs. Smaller than uuid. |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 15 | SvelteKit | Smaller ecosystem; shadcn/ui not available; solo React dev benefits from larger community |
| Framework | Next.js 15 | Remix | More Vercel config required; same server-action model without the ecosystem advantage |
| Framework | Next.js 15 | Express + React SPA | Two repos, two deploys, CORS config, no server components |
| Styling | Tailwind v4 + shadcn | CSS Modules | More verbose, no mobile primitives out of the box |
| Database | SQLite + Turso | Postgres (Neon/Supabase) | Connection pooling overhead, free tier limits, unnecessary complexity at this scale |
| ORM | Drizzle | Prisma | Prisma binary adds cold-start latency; Drizzle is lighter and TypeScript-native |
| Image Storage | Vercel Blob | Cloudflare R2 | R2 is excellent but requires extra account setup; Blob integrates natively with Vercel |
| Image Storage | Vercel Blob | Local disk | Ephemeral on serverless; no CDN; images lost on redeploy |
| Auth | Custom JWT (jose) | NextAuth.js | NextAuth is overbuilt for one admin credential; adds 3+ config files and an auth DB table |

---

## Installation

```bash
# Bootstrap
npx create-next-app@latest friendswap --typescript --tailwind --app --src-dir --import-alias "@/*"
cd friendswap

# Database (Turso/LibSQL path)
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit

# Database (local SQLite path, for Railway/VPS)
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3

# Image storage
npm install @vercel/blob

# Auth & validation
npm install jose bcryptjs zod nanoid
npm install -D @types/bcryptjs

# UI components (shadcn bootstraps itself)
npx shadcn@latest init
```

---

## Confidence Notes

| Area | Confidence | Basis |
|------|------------|-------|
| Next.js 15 + App Router | HIGH | Confirmed v16.2.6 from official Next.js docs (lastUpdated 2026-05-13); App Router is the documented current default |
| Tailwind CSS v4.3 | HIGH | Confirmed from official Tailwind docs |
| Vercel Blob + pricing | HIGH | Confirmed from Vercel official docs (lastUpdated 2026-03-04); free Hobby tier verified |
| Drizzle ORM version | MEDIUM | Official docs confirm SQLite/libsql support; specific semver not independently verified (npm registry blocked) — use `drizzle-orm@latest` and pin after install |
| jose version | MEDIUM | Used in official Next.js auth docs example; specific semver not independently verified |
| Turso free tier | MEDIUM | Based on training data + knowledge of Turso positioning; verify current limits at turso.tech/pricing before committing |
| shadcn/ui | MEDIUM | Stable ecosystem, widely used with Next.js App Router; specific version is managed by npx init |

---

## Sources

- Next.js 15 docs — https://nextjs.org/docs (version 16.2.6, lastUpdated 2026-05-13)
- Next.js authentication guide — https://nextjs.org/docs/app/guides/authentication
- Next.js Route Handlers — https://nextjs.org/docs/app/api-reference/file-conventions/route
- Tailwind CSS v4 docs — https://tailwindcss.com/docs/installation
- Vercel Blob docs — https://vercel.com/docs/vercel-blob (lastUpdated 2026-02-19)
- Vercel Blob pricing — https://vercel.com/docs/vercel-blob/usage-and-pricing (lastUpdated 2026-03-04)
