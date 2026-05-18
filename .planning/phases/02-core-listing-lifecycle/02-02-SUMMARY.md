---
phase: 02-core-listing-lifecycle
plan: "02"
subsystem: api
tags: [drizzle-orm, zod, nanoid, server-only, route-handler, unit-tests]

# Dependency graph
requires:
  - phase: 02-core-listing-lifecycle
    provides: Plan 02-01 — next/image CDN whitelist + fallback.jpg in place
  - phase: 01-foundation-security-gate
    provides: Turso/Drizzle connection (lib/db.ts), schema (lib/schema.ts), Zod installed, nanoid installed

provides:
  - lib/listing-service.ts — server-only data access layer with getActiveListings() and createListing()
  - app/[token]/api/listings/route.ts — POST handler that validates, inserts, and returns { id, editToken }
  - 11 unit tests covering both modules

affects:
  - 02-04-browse-page (calls getActiveListings() from listing-service)
  - 02-05-create-listing-form (POSTs to /[token]/api/listings, receives { id, editToken })

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "server-only module pattern: lib/listing-service.ts starts with 'import server-only' to prevent client bundle leakage"
    - "Drizzle fluent chain: db.select().from(listings).where(eq(status,'active')).orderBy(desc(created_at))"
    - "Route Handler validation pattern: JSON parse try/catch → Zod safeParse → Drizzle insert → Response.json()"
    - "Server-side ID generation: nanoid() for listing ID, crypto.randomUUID() for edit token"
    - "Test mock pattern for Drizzle fluent chain: helper function rebuilds chain mocks fresh per-test"
    - "Top-level await import in route.test.ts: const { POST } = await import('./route') after vi.mock hoisting"

key-files:
  created:
    - lib/listing-service.ts
    - lib/listing-service.test.ts
    - app/[token]/api/listings/route.ts
    - app/[token]/api/listings/route.test.ts

key-decisions:
  - "Used Response.json() (not NextResponse.json()) in route handler — consistent with login route pattern"
  - "editToken generated server-side with crypto.randomUUID(); not present in Zod schema so any client-submitted editToken is silently ignored (T-02-02-A mitigation)"
  - "Drizzle chain mock pattern: helper function setupSelectChain() rebuilds vi.fn() chain before each test to avoid clearAllMocks() interference"
  - "listing-service.ts is a thin wrapper (createListing delegates to db.insert); business logic lives in route handler"

patterns-established:
  - "Drizzle chain test helper: build select/insert chain mocks via helper function called in each test, not top-level vars"
  - "vi.mock() factory pattern: define vi.fn() inside the factory to avoid hoisting reference errors"

requirements-completed:
  - LIST-02
  - LIST-04
  - LIST-05

# Metrics
duration: 4min
completed: 2026-05-18
---

# Phase 02 Plan 02: Create listing Route Handler and service layer

**Zod-validated POST /[token]/api/listings that inserts via Drizzle and returns { id, editToken } with 201; server-only getActiveListings() and createListing() service functions; 11 unit tests all passing**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-18T23:12:09Z
- **Completed:** 2026-05-18T23:16:00Z
- **Tasks:** 2
- **Files modified:** 4 (created)

## Accomplishments

- Created `lib/listing-service.ts` as a server-only module with `getActiveListings()` (filters active rows, orders newest-first) and `createListing()` (thin insert wrapper)
- Created `app/[token]/api/listings/route.ts` POST handler: JSON parse try/catch, Zod validation of 6 fields, nanoid() listing ID, crypto.randomUUID() edit token, Drizzle insert, HTTP 201 response with `{ id, editToken }`
- Created 11 unit tests (6 for service, 5 for route) covering valid/invalid inputs, Date instance returns, security properties, chain call verification
- TypeScript clean and full suite (112 tests / 12 files) passes with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: lib/listing-service.ts + lib/listing-service.test.ts** - `9066eb8` (feat)
2. **Task 2: app/[token]/api/listings/route.ts + route.test.ts** - `df8d257` (feat)

**Plan metadata:** _(added after docs commit)_

## Files Created/Modified

- `lib/listing-service.ts` — Server-only module; exports `getActiveListings()` and `createListing()`
- `lib/listing-service.test.ts` — 6 unit tests: chain call verification, Date instance check, ordering, insert args
- `app/[token]/api/listings/route.ts` — POST Route Handler: Zod validation, nanoid ID, crypto.randomUUID() editToken, Drizzle insert, 201 response
- `app/[token]/api/listings/route.test.ts` — 5 unit tests: 201 with all fields, 201 without optionals, 400 on missing required field, 400 on malformed JSON, editToken security property

## Decisions Made

- Used `Response.json()` (not `NextResponse.json()`) — consistent with the login route pattern established in Phase 1
- `editToken` is not included in `CreateListingSchema` — any client-submitted editToken field is silently ignored by Zod; server always generates via `crypto.randomUUID()` (T-02-02-A mitigation)
- Mock pattern for Drizzle fluent chain: top-level `vi.mock()` factories cannot reference outer variables due to hoisting, so the chain is rebuilt per-test via a helper function called inside each `it()` or `beforeEach()`
- Test file for route uses top-level await (`const { POST } = await import('./route')`) consistent with the upload route test pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Drizzle chain mock initialization error**
- **Found during:** Task 1 (listing-service.test.ts)
- **Issue:** Initial test used top-level variables (`mockSelect`, `mockWhere`, etc.) referenced inside `vi.mock()` factory — Vitest hoists `vi.mock()` to top of file, so those variables were not yet initialized (`Cannot access 'mockSelect' before initialization`)
- **Fix:** Moved all mock `vi.fn()` definitions inside the `vi.mock('@/lib/db', () => {...})` factory, and extracted a `setupSelectChain()` helper function that rebuilds the chain mocks fresh before each test (needed because `vi.clearAllMocks()` wipes return values)
- **Files modified:** `lib/listing-service.test.ts`
- **Verification:** All 6 service tests pass; no hoisting errors
- **Committed in:** `9066eb8` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug in test mock setup)
**Impact on plan:** Required fix to achieve passing tests. No scope creep; test logic unchanged.

## Issues Encountered

The Drizzle fluent chain mock pattern required two iterations: the `vi.mock()` hoisting restriction prevented using outer-scope variables in factory functions, and `vi.clearAllMocks()` clears mock return values requiring re-initialization before each test. Resolved with the helper function pattern documented in patterns-established above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `lib/listing-service.ts` is ready — browse page (02-04) can call `getActiveListings()` directly
- `POST /[token]/api/listings` is ready — create form (02-05) can POST to this endpoint and receive `{ id, editToken }`
- All Phase 1 tests still pass — no regressions
- No blockers for remaining Phase 2 plans

## Known Stubs

None — this plan implements real data access and a real route handler. No placeholder values flow to UI rendering.

## Threat Flags

No new threat surface beyond what is in the plan's threat model. All T-02-02 threats are mitigated as planned.

---
*Phase: 02-core-listing-lifecycle*
*Completed: 2026-05-18*
