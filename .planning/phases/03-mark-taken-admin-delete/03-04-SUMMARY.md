---
phase: 03-mark-taken-admin-delete
plan: 04
subsystem: infra
tags: [middleware, drizzle, turso, libsql, nodejs-runtime]

requires:
  - phase: 03-01
    provides: settings table schema + settings-service getSetting/setSetting

provides:
  - proxy.ts with DB-backed invite token cache (60s TTL, env fallback)
  - middleware.ts Next.js entry point re-exporting proxy + config
  - export const runtime = 'nodejs' on both files (required for LibSQL in middleware)
  - settings table pushed to live Turso DB
  - invite_token row seeded in settings table

affects:
  - 03-05-UI-wiring
  - admin regen invite flow (end-to-end)

tech-stack:
  added: []
  patterns:
    - "Module-level tokenCache variable with expiresAt timestamp for 60s TTL"
    - "Dynamic import of db/schema inside getInviteToken() to avoid Edge Runtime"
    - "env fallback (row?.value ?? env.INVITE_TOKEN) guards against missing DB row"

key-files:
  created:
    - middleware.ts (Next.js entry point — re-exports proxy as middleware + config)
  modified:
    - proxy.ts (added runtime='nodejs', tokenCache, getInviteToken(), replaced env.INVITE_TOKEN calls)

key-decisions:
  - "proxy.ts unchanged in name; middleware.ts created at root as Next.js entry point"
  - "runtime='nodejs' added to both proxy.ts and middleware.ts for redundancy"
  - "Dynamic imports inside getInviteToken() isolate LibSQL from Edge Runtime constraints"
  - "env.INVITE_TOKEN fallback retained in getInviteToken() — Pitfall 6 guard"

patterns-established:
  - "DB-backed hot-swap config: module-level cache + TTL + env fallback pattern"

requirements-completed:
  - ADMN-04

duration: ~10min (including human checkpoint)
completed: 2026-05-19
---

# Phase 03-04: Middleware DB Cache + Schema Push Summary

**proxy.ts upgraded to read invite token from Turso DB with 60s cache; middleware.ts wired as Next.js entry point; settings table pushed and seeded in live Turso DB**

## Performance

- **Duration:** ~10 min (including human checkpoint for drizzle-kit push)
- **Completed:** 2026-05-19
- **Tasks:** 2 (1 auto + 1 human checkpoint)
- **Files modified:** 2

## Accomplishments
- `proxy.ts` now reads invite token from `settings` DB table via `getInviteToken()` with 60s in-memory cache — token regeneration takes effect within 60s without redeploy
- `middleware.ts` created at project root as the required Next.js middleware entry point, re-exporting `proxy as middleware` and `config`
- `export const runtime = 'nodejs'` added to both files — required for LibSQL to work in middleware (Edge Runtime cannot run LibSQL)
- `settings` table pushed to live Turso DB via `npx drizzle-kit push`
- `invite_token` row seeded with current `INVITE_TOKEN` env value

## Task Commits

1. **Task 1: DB token cache + middleware entry point** — `e073424` (feat)
2. **Task 2: Schema push + seed** — human checkpoint (completed manually)

## Files Created/Modified
- `proxy.ts` — added `runtime='nodejs'`, `tokenCache`, `getInviteToken()`, replaced 2× `env.INVITE_TOKEN` with `await getInviteToken()`
- `middleware.ts` (new) — Next.js entry point re-exporting `proxy as middleware, config`; `runtime='nodejs'`

## Decisions Made
- Kept `proxy.ts` as the logic file and created a thin `middleware.ts` wrapper — preserves test compatibility (proxy.test.ts still imports by original name)
- Dynamic imports inside `getInviteToken()` avoid any Edge Runtime bundling issues with LibSQL

## Deviations from Plan
None — plan executed exactly as written.

## Issues Encountered
None.

## Next Phase Readiness
- Wave 3 (03-05) ready: all route handlers, services, client islands, and middleware DB cache are in place
- 03-05 wires everything together: ListingCard gets the islands, BrowsePage gets filter tabs + isAdmin, AdminPage gets RegenInviteForm

---
*Phase: 03-mark-taken-admin-delete*
*Completed: 2026-05-19*
