---
phase: 01-foundation-security-gate
plan: 03b
subsystem: auth
tags:
  - auth
  - routes
  - admin-ui
  - constant-time
requires:
  - 01-01-SUMMARY.md
  - 01-03-SUMMARY.md
provides:
  - POST /{token}/api/admin/login — rate-limit + constant-time bcrypt + cookie issuance
  - POST /{token}/api/admin/logout — cookie clear
  - /{token}/admin/login — login form page
  - /{token}/admin — admin landing page (DAL verify + logout)
affects:
  - proxy.ts (NOT modified — additive plan; proxy already gates /admin/* except /admin/login)
tech-stack:
  added: []
  patterns:
    - Server Component passes token prop to Client Component for proxy-safe fetch URLs
    - DAL re-verification (verifyAdminSession) as secondary tier after proxy gate
    - Constant-time auth: bcrypt.compare always runs regardless of username match (T-03-03)
key-files:
  created:
    - app/[token]/api/admin/login/route.ts
    - app/[token]/api/admin/login/route.test.ts
    - app/[token]/api/admin/logout/route.ts
    - app/[token]/api/admin/logout/route.test.ts
    - app/[token]/admin/login/page.tsx
    - app/[token]/admin/page.tsx
    - components/admin/LoginForm.tsx
    - components/admin/LogoutButton.tsx
  modified: []
key-decisions:
  - D-01 satisfied: login at /{token}/admin/login (inside invite gate); API routes also under /{token}/api/admin/*
  - D-03 satisfied: cookie attributes set by createAdminSession match proxy expectations
  - Routes under [token] segment so proxy.ts gates them (placing at /api/admin/* would 404)
  - token prop forwarded Server Component → Client Component so fetch URLs include the invite token
requirements-completed:
  - ADMN-02
duration: 12 min
completed: 2026-05-18
---

# Phase 01 Plan 03b: Admin Login Vertical Slice Summary

Composed Plan 03's auth primitives into the end-to-end admin login flow: rate-limited + constant-time bcrypt login route, one-liner logout route, login form page, and protected admin landing page with DAL re-verification.

**Duration:** ~12 min | **Tasks:** 4 auto + 1 human-verify pending | **Files:** 8 created, 0 modified

## Tasks Completed

| Task | Files | Commit | Status |
|------|-------|--------|--------|
| 01 — Login route (TDD) | route.ts + route.test.ts | 364d2d1 | ✓ |
| 02 — Logout route (TDD) | route.ts + route.test.ts | e4dc337 | ✓ |
| 03 — LoginForm + login page | LoginForm.tsx + login/page.tsx | 0e2f24c | ✓ |
| 04 — Admin page + LogoutButton | admin/page.tsx + LogoutButton.tsx | 86b4066 | ✓ |
| 05 — Human verification | (localhost manual verify) | — | ⏳ pending |

## Route Response Shapes

`POST /{token}/api/admin/login`:
- `200` → `{ success: true }` + `Set-Cookie: admin_session=<jwt>; HttpOnly; SameSite=Strict; Path=/`
- `400` → `{ error: 'Invalid request' }` (malformed JSON or zod validation failure)
- `401` → `{ error: 'Invalid credentials' }` (wrong username or password)
- `429` → `{ error: 'Too many attempts' }` (rate-limit exceeded)

`POST /{token}/api/admin/logout`:
- `200` → `{ success: true }` (unconditionally — deletes admin_session cookie)

## Cookie Attributes

Set by `createAdminSession()` (lib/session.ts, Plan 03):
- Name: `admin_session`
- `httpOnly: true`
- `sameSite: 'strict'`
- `secure: true` (production only)
- `path: '/'`
- Expiry: 4 hours from issuance
- Algorithm: HS256 via jose

## Security Properties Verified

| Threat | Mitigation | Verification |
|--------|-----------|-------------|
| T-03-01 brute force | checkRateLimit(ip) before any password work | Unit test: 429 on 6th attempt |
| T-03-03 username enumeration timing | bcrypt.compare always runs (T-03-03 unit test: spy confirms compare called even on username mismatch) | ✓ |
| T-03-05 password in logs | No console.log; generic error responses | grep check: no console.log |
| T-03-08 DAL bypass | admin/page.tsx re-verifies cookie with verifyAdminSession | grep check + acceptance criteria |
| T-03-10 proxy bypass via route location | Routes under app/[token]/api/admin/* not app/api/admin/* | test -f / test ! -f checks |

## Proxy Contract Verified

`git diff proxy.ts` → 0 lines changed. Additive plan contract held. proxy.ts is unchanged from Plan 01.

## Test Results

```
Test Files  8 passed (8)
Tests  87 passed (87)
```

87 tests total (75 from Plans 01–03 + 12 new from Plan 03b).

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All plan-level verification guards passed:
- ✓ Route files at app/[token]/api/admin/login/route.ts and app/[token]/api/admin/logout/route.ts
- ✓ app/api/admin/login/route.ts and app/api/admin/logout/route.ts do NOT exist
- ✓ LoginForm fetches `/${token}/api/admin/login` (template literal)
- ✓ LogoutButton fetches `/${token}/api/admin/logout` (template literal)
- ✓ No bare `/api/admin/*` fetch paths
- ✓ checkRateLimit + compare + status:429 in login route
- ✓ verifyAdminSession in admin page
- ✓ token prop wiring: LoginForm token={token} and LogoutButton token={token}
- ✓ proxy.ts unchanged (git diff = 0 lines)
- ✓ lib/env.ts unchanged (git diff = 0 lines)
- ✓ npm test: 87/87 passing
- ✓ npm run build: compiled successfully, all 6 routes present

## Hand-off to Phase 3

- Import `createAdminSession` from `lib/session.ts` (already exported via Plan 03) — no changes needed
- Admin API routes live at `/{token}/api/admin/*` — Phase 3 delete + rotate routes should follow the same pattern
- Do NOT modify these route handlers — Phase 3 owns new routes, not modifications to existing ones
- Admin landing page (`app/[token]/admin/page.tsx`) is intentionally minimal — Phase 3 will add delete + rotate actions

## Next Step

**Task 05 (human verification)** — start dev server and run the curl + browser checks detailed in the plan.
