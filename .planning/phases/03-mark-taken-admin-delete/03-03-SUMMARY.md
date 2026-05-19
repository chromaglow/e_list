---
phase: 03-mark-taken-admin-delete
plan: "03"
subsystem: route-handlers
tags: [api, auth, timingSafeEqual, jwt, crypto, drizzle]
dependency_graph:
  requires: [03-01]
  provides: [PATCH-mark-taken, DELETE-admin-delete, POST-regen-invite]
  affects:
    - app/[token]/api/listings/[id]/route.ts
    - app/[token]/admin/api/regen-invite/route.ts
tech_stack:
  added: []
  patterns: [timingSafeEqual-constant-time, verifyAdminSession-cookie, randomBytes-hex-token, Zod-safeParse]
key_files:
  created:
    - app/[token]/api/listings/[id]/route.ts
    - app/[token]/admin/api/regen-invite/route.ts
  modified: []
decisions:
  - "Buffer.from(str) used without 'hex' encoding for edit token comparison — edit tokens are UUID format (not hex-encoded bytes)"
  - "timingSafeEqual wrapped in try/catch with length pre-check; returns false on any exception — mirrors proxy.ts pattern exactly"
  - "DELETE handler reads admin_session cookie directly in route handler (defense in depth beyond middleware gate)"
  - "Regen handler returns { newToken } — client constructs full invite URL; DB value written via setSetting upsert"
metrics:
  duration: "~6 min"
  completed: "2026-05-19"
---

# Phase 03 Plan 03: Route Handlers (Mark Taken, Admin Delete, Regen Invite) Summary

**One-liner:** Three mutation route handlers created with timingSafeEqual edit-token verification for PATCH, admin JWT cookie verification for DELETE and POST regen, and randomBytes(32) hex token generation for invite regeneration.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | PATCH + DELETE handler for /[token]/api/listings/[id] | 43bdf9e | app/[token]/api/listings/[id]/route.ts |
| 2 | POST regen-invite handler for /[token]/admin/api/regen-invite | 21a8d79 | app/[token]/admin/api/regen-invite/route.ts |

## What Was Built

### app/[token]/api/listings/[id]/route.ts (new file)

**PATCH handler** (mark listing taken):
- Zod schema `MarkTakenSchema` validates `{ editToken: z.string().min(1).max(500) }`
- JSON parse failure → 400
- Zod parse failure → 400
- DB SELECT of `edit_token` and `status` for the given listing id
- Listing not found or `status !== 'active'` → 404 (prevents double-marking, T-03-09)
- `timingSafeEqual` constant-time comparison with `Buffer.from(str)` (no hex encoding — UUIDs are not hex-encoded bytes); length pre-check + try/catch for any exception → tokenMatch=false
- Token mismatch → 403 (T-03-08, T-03-12)
- Token match → `markListingTaken(id)` → `{ ok: true }` 200

**DELETE handler** (admin soft-delete):
- Reads `admin_session` cookie via `(await cookies()).get('admin_session')?.value`
- `verifyAdminSession(sessionCookie)` → 403 if null (T-03-10)
- Valid session → `deleteListingAdmin(id)` → `{ ok: true }` 200

### app/[token]/admin/api/regen-invite/route.ts (new file)

**POST handler** (regenerate invite token):
- Defense in depth: reads `admin_session` cookie and calls `verifyAdminSession` (middleware already gates `/admin/*`)
- No valid session → 403 (T-03-11)
- `randomBytes(32).toString('hex')` — produces exactly 64 hex characters (32 bytes × 2 hex digits/byte)
- `setSetting('invite_token', newToken)` — upserts DB settings row; old token immediately invalidated for new requests (subject to proxy.ts 60s cache TTL, T-03-13 accepted)
- Returns `{ newToken }` — client constructs full invite URL from this value

## Verification

- `npx tsc --noEmit` exits 0 after both tasks — confirmed
- `grep timingSafeEqual` shows import and usage in PATCH handler
- `grep verifyAdminSession` shows import and usage in both DELETE and POST handlers
- `grep setSetting` confirms DB write in regen handler
- `grep randomBytes` confirms crypto usage for token generation

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. These are pure API route handlers with no UI rendering.

## Threat Flags

No new security surface beyond what is documented in the plan's threat model. All trust boundaries (client → PATCH, client → DELETE, client → POST regen) are covered by the mitigations in the STRIDE register.

## Self-Check: PASSED

- app/[token]/api/listings/[id]/route.ts — FOUND, exports PATCH and DELETE
- app/[token]/admin/api/regen-invite/route.ts — FOUND, exports POST
- Commit 43bdf9e — FOUND (feat(03-03): PATCH + DELETE handlers)
- Commit 21a8d79 — FOUND (feat(03-03): POST regen-invite handler)
- `npx tsc --noEmit` — exits 0 (no type errors)
