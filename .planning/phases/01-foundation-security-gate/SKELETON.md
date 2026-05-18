---
type: walking-skeleton
phase: 01-foundation-security-gate
created: 2026-05-17
revised: 2026-05-17
---

# Walking Skeleton: FriendSwap

This is the architectural baseline that every subsequent phase builds on without renegotiating. The skeleton is the thinnest possible end-to-end stack: project + routing + one real DB round-trip + one real UI interaction + dev deployment.

## Phase Goal (User Story)

**As a** trusted friend invited via a private URL, **I want to** open the invite link on my phone and see the FriendSwap home shell (with the admin able to log in via the same gate), **so that** I know the group has a working private space that will accept listings in the next phase.

## The Minimal End-to-End Path

**Wave 1 (Plan 01) ships the working skeleton:**

```
Browser (phone)
  -> https://{deployment}/{INVITE_TOKEN}/
  -> proxy.ts: validate INVITE_TOKEN env var matches first path segment
       miss -> NextResponse.rewrite('/not-found') (404)
       match -> NextResponse.next()
  -> app/[token]/page.tsx (Server Component)
  -> Renders styled shell: "FriendSwap" header + "Nothing here yet" empty state
     + disabled "Post an item" button placeholder
```

**One real DB round-trip (Plan 02):** A health server component runs `db.run("SELECT 1")` against Turso during the Plan 02 verification task. Confirms the LibSQL driver, env vars, and migrations all work end-to-end.

**One real UI interaction (Plan 03 + Plan 03b):** Admin login form at `/{token}/admin/login` accepts credentials, posts to `/{token}/api/admin/login`, sets an `admin_session` jose JWT cookie, redirects to `/{token}/admin`. Logout at `/{token}/api/admin/logout` clears the cookie. ALL admin API routes live UNDER the `[token]` dynamic segment so the proxy gates them — placing them at `/api/admin/*` would bypass the proxy and 404.

**Dev deployment (Plan 05):** Production Vercel URL responds 200 on `/{token}/` after a cold start with all env vars (INVITE_TOKEN, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, SESSION_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD_HASH, BLOB_READ_WRITE_TOKEN) set in the Vercel dashboard.

## "It Works" Locally

```bash
# 1. Install
npm install

# 2. Provision env vars (.env.local)
# INVITE_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# SESSION_SECRET=$(openssl rand -base64 32)
# TURSO_DATABASE_URL=libsql://...
# TURSO_AUTH_TOKEN=...
# ADMIN_USERNAME=admin
# ADMIN_PASSWORD_HASH=$(node scripts/gen-hash.js <password>)
# BLOB_READ_WRITE_TOKEN=...   (Plan 04 / Plan 05)

# 3. Generate + apply migrations against Turso
npx drizzle-kit generate
npx drizzle-kit migrate

# 4. Run dev server
npm run dev

# 5. Verify (Plan 01 done)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/                                  # -> 404
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/wrong-token/                      # -> 404
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/$INVITE_TOKEN/                    # -> 200
curl -s http://localhost:3000/$INVITE_TOKEN/ | grep -c FriendSwap                                # -> >=1

# 6. Verify admin slice (Plan 03 + Plan 03b done) — note the /{INVITE_TOKEN}/ prefix on the API route
curl -s -X POST http://localhost:3000/$INVITE_TOKEN/api/admin/login \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"admin\",\"password\":\"<password>\"}" -i | grep -i set-cookie | grep -c admin_session   # -> 1

# 7. Verify upload slice (Plan 04 done) — see plan for handleUpload smoke test
#    Note: upload route is at /{INVITE_TOKEN}/api/upload (inside the invite gate)
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/$INVITE_TOKEN/api/upload \
  -H 'Content-Type: application/json' -d '{}'                                                     # -> 400 (route reached; empty body rejected)
```

## "It Works" on Vercel

```bash
# After Plan 05:
# 1. Vercel project linked, env vars set in dashboard for Production environment
# 2. Push to main triggers build:  drizzle-kit migrate && next build
# 3. Build logs show migration ran (no errors)
# 4. Cold-start verification:
curl -s -o /dev/null -w "%{http_code}\n" https://<deployment>.vercel.app/                        # -> 404
curl -s -o /dev/null -w "%{http_code}\n" https://<deployment>.vercel.app/$INVITE_TOKEN/          # -> 200
curl -s https://<deployment>.vercel.app/$INVITE_TOKEN/ | grep -c FriendSwap                      # -> >=1
```

A 200 from the production URL with the correct token, and a 404 with no/wrong token, on a cold function instance with no runtime errors in logs, defines "the skeleton walks."

## Architectural Decisions Locked by the Skeleton

These are set in stone after Phase 1. Subsequent phases inherit them without revisiting.

| Decision | Choice | Source |
|----------|--------|--------|
| Framework | Next.js 16 App Router (proxy.ts, awaited cookies/headers) | RESEARCH.md (latest stable 16.2.6) |
| Runtime | Node.js (proxy.ts defaults to Node in Next.js 16) | RESEARCH.md |
| Language | TypeScript (strict) | CLAUDE.md, scaffold default |
| Styling | Tailwind CSS v4 + shadcn/ui primitives | CONTEXT.md D-09, RESEARCH.md |
| Database | Turso (LibSQL) via @libsql/client | CLAUDE.md, RESEARCH.md |
| ORM | Drizzle ORM (drizzle-orm/libsql) | CLAUDE.md, RESEARCH.md |
| Migrations | drizzle-kit generate + migrate; SQL files in /drizzle committed to git; never push | CONTEXT.md D-07 |
| Migration runtime | Run at Vercel build time via `drizzle-kit migrate && next build` | CONTEXT.md D-08 |
| Image storage | Vercel Blob via @vercel/blob/client (handleUpload + browser upload) | RESEARCH.md (4.5 MB body limit) |
| Upload route location | `app/[token]/api/upload/route.ts` — UNDER the [token] segment so proxy.ts gates it (D-06) | CONTEXT.md D-06, revision 2026-05-17 |
| Admin route location | `app/[token]/api/admin/login/route.ts` AND `app/[token]/api/admin/logout/route.ts` — UNDER the [token] segment so proxy.ts gates them (same reasoning as upload route; placing them at `app/api/admin/*` would bypass the proxy since segments[0] would be the literal "api" not INVITE_TOKEN, and the routes would 404) | CONTEXT.md D-01, revision 2026-05-17 (BLOCKER 1 fix) |
| Magic byte validation | Client-side check (browser reads first 12 bytes via FileReader/arrayBuffer) BEFORE calling @vercel/blob/client `upload()`; helper exported from `lib/upload-validators.ts` | CLAUDE.md "validate by magic bytes (not Content-Type)" + @vercel/blob/client architecture (server never sees file bytes) |
| Auth | Stateless jose JWT (HS256) in admin_session cookie | CLAUDE.md, CONTEXT.md D-02 |
| Cookie flags | httpOnly: true, sameSite: 'strict', secure: NODE_ENV==='production', path: '/' | CLAUDE.md |
| Password hashing | bcryptjs cost >= 12 | CLAUDE.md |
| Constant-time auth | bcrypt.compare runs on every well-formed login attempt (even on username mismatch) so success/failure timing is indistinguishable | CLAUDE.md (rate limiting) + STRIDE T-03-03 |
| Access gate | proxy.ts validates 64-hex-char INVITE_TOKEN env var as first URL path segment on every request | CLAUDE.md, CONTEXT.md D-03 |
| 404 mechanism | NextResponse.rewrite(new URL('/not-found', request.url)) — never NextResponse.error() | RESEARCH.md (Pitfall 3) |
| Admin gate | Same proxy.ts performs admin JWT check for /{token}/admin/* (excluding /login) | CONTEXT.md D-03 |
| Listings ID | nanoid() generated at insert time | RESEARCH.md |
| Status column | text enum 'active' \| 'taken' \| 'deleted' (default 'active') | CLAUDE.md schema notes |
| Timestamps | integer timestamp-mode columns with $defaultFn/$onUpdateFn; include taken_at + deleted_at + updated_at | CLAUDE.md schema notes |
| Photo storage | Store `blob.pathname` (key) in `photo_key`, never the full URL | CLAUDE.md |
| Edit ownership | One-time nanoid edit_token column issued at create (used in Phase 3) | CONTEXT.md D-10, CLAUDE.md |
| Hosting | Vercel Hobby tier | CLAUDE.md |
| Rate limiting | In-memory map keyed by x-forwarded-for on /{token}/api/admin/login (5 attempts / 15 min) | RESEARCH.md Pattern 3 |
| Env var loader | `lib/env.ts` declares ALL seven env var getters as one frozen skeleton in Plan 01 (no per-plan additions); downstream plans verify presence, not declare new keys | Revision 2026-05-17 — avoids Wave 2 parallel write conflict |

## Directory Layout (Locked)

```
/
├── proxy.ts                          # Invite gate + admin JWT check (Plan 01)
├── drizzle.config.ts                 # dialect: 'turso' (Plan 02)
├── drizzle/                          # generated migration SQL (Plan 02; committed to git)
├── vercel.json                       # buildCommand: drizzle-kit migrate && next build (Plan 05)
├── scripts/
│   ├── gen-invite-token.js           # one-off invite-token generator (Plan 01)
│   ├── gen-hash.js                   # one-off bcrypt hasher for ADMIN_PASSWORD_HASH (Plan 03)
│   ├── db-smoke-test.ts              # Turso round-trip verifier (Plan 02)
│   ├── upload-smoke-test.ts          # Vercel Blob token-exchange verifier (Plan 04)
│   └── cold-start-verify.sh          # Production URL cold-start verifier (Plan 05)
├── app/
│   ├── layout.tsx                    # root <html>/<body>, Tailwind globals (Plan 01)
│   ├── not-found.tsx                 # rendered by proxy rewrite on invalid token (Plan 01)
│   ├── globals.css                   # tailwind base/components/utilities (Plan 01)
│   └── [token]/
│       ├── layout.tsx                # token-scoped layout (Plan 01)
│       ├── page.tsx                  # styled empty shell, disabled CTA (Plan 01, D-09/D-10)
│       ├── admin/
│       │   ├── page.tsx              # placeholder admin landing (Plan 03b)
│       │   └── login/
│       │       └── page.tsx          # login form (Plan 03b)
│       └── api/
│           ├── admin/
│           │   ├── login/route.ts    # bcrypt + JWT cookie + rate limit (Plan 03b) — UNDER [token] so proxy gates it
│           │   └── logout/route.ts   # clear cookie (Plan 03b) — UNDER [token] so proxy gates it
│           └── upload/route.ts       # handleUpload token exchange — UNDER [token] so proxy gates it (Plan 04, D-06)
├── lib/
│   ├── db.ts                         # drizzle(libsql) client, server-only (Plan 02)
│   ├── schema.ts                     # listings table (Plan 02)
│   ├── session.ts                    # jose SignJWT/jwtVerify + cookie helpers (Plan 01 for verify; Plan 03 for issue/delete)
│   ├── env.ts                        # typed env var loader for ALL seven env vars, throws on missing (Plan 01 — single source)
│   ├── rate-limit.ts                 # in-memory limiter (Plan 03)
│   ├── admin-validators.ts           # zod loginSchema (Plan 03)
│   └── upload-validators.ts          # ALLOWED_TYPES, MAX_SIZE_BYTES, isAllowedMagicBytes (Plan 04)
└── components/
    ├── ui/                           # shadcn/ui primitives (Button, Card) (Plan 01)
    ├── shell/
    │   ├── AppHeader.tsx             # "FriendSwap" header (Plan 01)
    │   └── EmptyState.tsx            # "Nothing here yet" panel (Plan 01)
    └── admin/
        ├── LoginForm.tsx             # client component, receives token prop, POSTs to /{token}/api/admin/login (Plan 03b)
        └── LogoutButton.tsx          # client component, receives token prop, POSTs to /{token}/api/admin/logout (Plan 03b)
```

**Note on route placement (revision 2026-05-17, BLOCKER 1 fix):** Every API route in this project lives UNDER the `[token]` dynamic segment — `app/[token]/api/...`, NOT `app/api/...`. This includes:

- `app/[token]/api/upload/route.ts` (Plan 04)
- `app/[token]/api/admin/login/route.ts` (Plan 03b)
- `app/[token]/api/admin/logout/route.ts` (Plan 03b)

Placing any route at `app/api/...` would bypass the proxy gate from Plan 01 (the proxy checks `segments[0] === INVITE_TOKEN`; routes at `app/api/...` have `segments[0] === "api"` which never matches the 64-hex-char token, so the proxy 404s them).

Client components (LoginForm, LogoutButton) receive the `token` value as a prop from their parent Server Component (which reads `params.token` per Next.js 16 async params) and construct `fetch` URLs as `/${token}/api/...` with template literal interpolation.

## Env Var Contract (Locked)

| Var | Required In | Format | Purpose |
|-----|-------------|--------|---------|
| INVITE_TOKEN | Plan 01+ | 64 hex chars (32 random bytes) | First path segment gate |
| SESSION_SECRET | Plan 01+ | >=32 bytes random (base64) | jose HS256 signing key |
| TURSO_DATABASE_URL | Plan 02+ | libsql://...turso.io | Drizzle connection |
| TURSO_AUTH_TOKEN | Plan 02+ | JWT from Turso dashboard | Drizzle auth |
| ADMIN_USERNAME | Plan 03+ | string | Admin login username |
| ADMIN_PASSWORD_HASH | Plan 03+ | bcrypt hash, cost >=12 | Admin login password (hash, not plaintext) |
| BLOB_READ_WRITE_TOKEN | Plan 04+ | Vercel Blob store token | handleUpload server-side auth |

**All seven env var getters are declared in `lib/env.ts` by Plan 01** as a single skeleton, so Wave 2 plans can read the file without modifying it. Plan 01 declares getters with placeholder-tolerant validation (e.g., TURSO_DATABASE_URL accepts the literal `REPLACE_ME` until Plan 02 fills it in); Wave 2 plans replace placeholders in `.env.local` and verify their var passes validation when the real value is in place.

## What This Skeleton Does NOT Include (Out of Scope for Phase 1)

- Listing creation form, browse cards, status updates (Phase 2 / Phase 3)
- Invite token rotation UI (Phase 3 / ADMN-04)
- Photo display on browse page (Phase 2)
- localStorage edit token issuance UI (Phase 2)
- Admin delete UI (Phase 3)
- Multiple admins / user accounts (out of v1)

The skeleton's contract with Phase 2: "The invite gate exists, the schema exists, the upload endpoint accepts tokens, the admin can log in. Build listing UI on top of these primitives — do not change them."
