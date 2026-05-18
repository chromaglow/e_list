# FriendSwap — Handoff Document

**Updated:** 2026-05-18
**Context:** Phase 01 Plans 01-01 through 01-03 complete and committed. Resuming at Plan 01-03b.

---

## What Was Accomplished This Session

### Plan 01-01 — Walking Skeleton (COMPLETE, committed)
All code written and verified. Bug fixed: proxy rewrite changed from `/not-found` to `/_not-found` with `{ status: 404 }` — the original route matched `[token]` dynamic route and returned HTTP 200 with the browse shell instead of a real 404.

**Commit:** `97c16d1`

### Plan 01-02 — Drizzle + Turso Schema (COMPLETE, committed)
- `lib/schema.ts` — listings table, 13 columns, status enum CHECK constraint, soft-delete timestamps
- `lib/db.ts` — server-only Drizzle client
- `drizzle.config.ts` — turso dialect, loads `.env.local`
- Migration applied to live Turso DB (`friendswap-chromaglow.aws-us-west-2.turso.io`)
- Smoke test confirmed: 0 listings in table

**Deviation:** `server-only` removed from `lib/schema.ts` (drizzle-kit cannot import it); guard remains on `lib/db.ts`.

**Commit:** `a89ab86`

### Plan 01-03 — Admin Auth Primitives (COMPLETE, committed)
- `scripts/gen-hash.js` — cost-12 bcrypt hash generator
- `lib/session.ts` — extended with `createAdminSession` + `deleteAdminSession` (HS256 JWT, httpOnly/SameSite=Strict cookie, 4h expiry)
- `lib/rate-limit.ts` — in-memory limiter, max=5/15min
- `lib/admin-validators.ts` — zod `loginSchema`
- 75/75 tests passing

**Commit:** `77f6342`

---

## Current State

| Item | Value |
|------|-------|
| Branch | `main` |
| Tests | 75/75 passing |
| Dev server | Not running (was stopped) |
| `.env.local` | Fully populated — all 7 vars set |
| Admin password | `FriendSwap2026!` (hash in `.env.local`) |
| Admin username | `admin` |
| Turso DB | Live — `listings` table migrated, 0 rows |

---

## Next Step: Plan 01-03b

**File:** `.planning/phases/01-foundation-security-gate/01-03b-PLAN.md`

**What it builds:**
- `app/api/admin/login/route.ts` — POST handler: zod parse → bcrypt.compare → rate-limit → createAdminSession
- `app/api/admin/logout/route.ts` — POST handler: deleteAdminSession → redirect
- `app/[token]/admin/login/page.tsx` — Login form UI (server component + client form)
- `app/[token]/admin/page.tsx` — Admin landing page (protected, requires valid session)

**Primitives already in place (from 01-03):**
- `createAdminSession` / `deleteAdminSession` from `lib/session.ts`
- `checkRateLimit` from `lib/rate-limit.ts`
- `loginSchema` from `lib/admin-validators.ts`
- `verifyAdminSession` already used by `proxy.ts`

**Human verification needed after 01-03b:**
- Navigate to `http://localhost:3000/<INVITE_TOKEN>/admin/login`
- Login with `admin` / `FriendSwap2026!`
- Confirm redirect to admin landing page
- Confirm session persists on browser refresh
- Confirm logout clears cookie and redirects to login

---

## Environment

| Variable | Status |
|----------|--------|
| `INVITE_TOKEN` | `16b4c3a92917864568e2921359f8824bca37764fa2498000fa5da1728215d282` |
| `SESSION_SECRET` | Set (base64, 32 bytes) |
| `TURSO_DATABASE_URL` | `libsql://friendswap-chromaglow.aws-us-west-2.turso.io` |
| `TURSO_AUTH_TOKEN` | Set (JWT) |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD_HASH` | Set (`$2b$12$...`) |
| `BLOB_READ_WRITE_TOKEN` | Placeholder (needed in Plan 01-04) |

---

## Key Architecture Decisions (locked)

| Decision | Choice |
|----------|--------|
| Access gate | `proxy.ts` rewrite to `/_not-found` with `{ status: 404 }` |
| JWT | HS256-only via jose, SESSION_SECRET ≥32 bytes |
| Session cookie | httpOnly, SameSite=Strict, 4h, Secure in prod |
| Rate limit | 5 attempts / 15 min, in-memory (accept cold-start trade-off) |
| DB | Turso LibSQL + Drizzle ORM, generate+migrate only (no push) |
| Schema | status enum `active/taken/deleted` + CHECK constraint + soft-delete timestamps |

---

## How to Resume

```bash
cd "C:\Users\ezras\OneDrive\Documents\work\GitHub\e_list"
npm install   # already done, but safe to re-run
npm test      # should show 75/75
# Then: /gsd:execute-phase 1  or just tell Claude to continue with Plan 01-03b
```
