---
phase: 03-mark-taken-admin-delete
plan: "01"
subsystem: data-layer
tags: [schema, drizzle, service, settings, listing]
dependency_graph:
  requires: []
  provides: [settings-table, ListingFilter, getListingsByFilter, markListingTaken, deleteListingAdmin, getSetting, setSetting]
  affects: [lib/schema.ts, lib/listing-service.ts, lib/settings-service.ts]
tech_stack:
  added: []
  patterns: [drizzle-sqliteTable, onConflictDoUpdate, inArray, and-guard]
key_files:
  created:
    - lib/settings-service.ts
  modified:
    - lib/schema.ts
    - lib/listing-service.ts
decisions:
  - "inArray used for getListingsByFilter('all') case — explicitly excludes 'deleted' status"
  - "markListingTaken uses AND status='active' guard in WHERE clause to prevent double-marking"
  - "settings-service mirrors listing-service structure exactly (server-only, db, schema, drizzle-orm imports)"
metrics:
  duration: "~8 min"
  completed: "2026-05-18"
---

# Phase 03 Plan 01: Schema + Services Foundation Summary

**One-liner:** Settings key-value table added to Drizzle schema; listing service extended with filter/mark-taken/admin-delete; new settings-service with getSetting/setSetting upsert.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add settings table to schema | a862e0c | lib/schema.ts |
| 2 | Extend listing-service with filter, mark-taken, admin-delete | 61df3b4 | lib/listing-service.ts |
| 3 | Create settings-service.ts | 7c10e97 | lib/settings-service.ts |

## What Was Built

### lib/schema.ts
Appended `settings` table with two columns:
- `key` — `text PRIMARY KEY`
- `value` — `text NOT NULL`

Exported inferred types `Setting` and `NewSetting`. Existing `listings` table and its types are unchanged.

### lib/listing-service.ts
Added:
- `ListingFilter` type alias (`'active' | 'taken' | 'all'`)
- `getListingsByFilter(filter)` — uses `inArray(listings.status, ['active', 'taken'])` for `'all'` case; `eq(listings.status, filter)` for `'active'`/`'taken'`
- `markListingTaken(id)` — UPDATE with `AND status='active'` guard preventing double-mark (T-03-01 mitigated)
- `deleteListingAdmin(id)` — soft-delete: `status='deleted'`, `deleted_at=now()`

Existing `getActiveListings` and `createListing` are unchanged.

### lib/settings-service.ts (new file)
- `'server-only'` guard at line 1
- `getSetting(key)` — single-row select with `.get()`, returns `value ?? null`
- `setSetting(key, value)` — INSERT with `onConflictDoUpdate` targeting `settings.key`

## Verification

- `npx tsc --noEmit` exits 0 (no type errors) — confirmed after each task
- All exports confirmed present via grep

## Deviations from Plan

None — plan executed exactly as written. `inArray` from drizzle-orm v0.45.2 worked without needing the `or(eq(...), eq(...))` fallback.

## Known Stubs

None. These are pure service/schema files with no UI rendering or data wired to components yet.

## Threat Flags

None. No new network endpoints or auth paths introduced. All functions are server-only.

## Self-Check: PASSED

- lib/schema.ts — FOUND, contains `settings` table and `Setting`/`NewSetting` types
- lib/listing-service.ts — FOUND, exports `ListingFilter`, `getListingsByFilter`, `markListingTaken`, `deleteListingAdmin`, `getActiveListings`, `createListing`
- lib/settings-service.ts — FOUND, exports `getSetting`, `setSetting`, starts with `import 'server-only'`
- Commits a862e0c, 61df3b4, 7c10e97 — all present in git log
