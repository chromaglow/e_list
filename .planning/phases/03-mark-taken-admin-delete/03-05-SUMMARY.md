---
phase: 03-mark-taken-admin-delete
plan: 05
subsystem: ui-wiring
tags: [next.js, server-components, client-islands, browse-page, admin-page]

requires:
  - phase: 03-02
    provides: MarkTakenButton, AdminDeleteButton, FilterTabs, RegenInviteForm client islands
  - phase: 03-03
    provides: PATCH/DELETE /listings/[id] and POST /admin/api/regen-invite route handlers
  - phase: 03-04
    provides: middleware DB token cache; settings table live in Turso

provides:
  - ListingCard with isAdmin/token props and embedded action islands
  - BrowsePage with filter tabs, admin detection, and getListingsByFilter
  - AdminPage with RegenInviteForm below LogoutButton
  - All four Phase 3 requirements functionally complete (LIST-06, LIST-07, ADMN-03, ADMN-04)

affects:
  - End-user browse experience
  - Admin management flow

tech-stack:
  added: []
  patterns:
    - "Server Component embeds Client island — no 'use client' on ListingCard"
    - "searchParams: Promise<...> awaited before access (Next.js 15 requirement)"
    - "validFilter ternary blocks ?filter=deleted URL exploit"
    - "isAdmin server-computed from verifyAdminSession, passed as prop to client"

key-files:
  modified:
    - components/listings/ListingCard.tsx (Props interface, two islands embedded)
    - app/[token]/page.tsx (searchParams, validFilter, isAdmin, FilterTabs)
    - app/[token]/admin/page.tsx (RegenInviteForm added)

requirements-completed:
  - LIST-06
  - LIST-07
  - ADMN-03
  - ADMN-04

duration: ~15min
completed: 2026-05-19
---

# Phase 03-05: UI Wiring Summary

**ListingCard, BrowsePage, and AdminPage updated to wire all Phase 3 islands and route handlers into the user-facing UI — Phase 3 functionally complete.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `ListingCard` extended with `Props` interface (`listing`, `token`, `isAdmin`); embeds `MarkTakenButton` and conditionally renders `AdminDeleteButton` (admin-only)
- `BrowsePage` upgraded: awaits `searchParams`, computes `validFilter` (blocks `?filter=deleted`), calls `getListingsByFilter(validFilter)`, detects admin session server-side, renders `FilterTabs`
- `AdminPage` now renders `RegenInviteForm` below `LogoutButton`
- All four Phase 3 requirements (LIST-06, LIST-07, ADMN-03, ADMN-04) functionally complete

## Task Commits

1. **Task 1: ListingCard islands** — feat(03-05): update ListingCard with isAdmin/token props and action islands
2. **Task 2: BrowsePage wiring** — feat(03-05): wire BrowsePage with filter tabs, admin detection, and updated ListingCard props
3. **Task 3: AdminPage regen** — feat(03-05): add RegenInviteForm to AdminPage

## Files Modified
- `components/listings/ListingCard.tsx` — Props interface, MarkTakenButton + AdminDeleteButton embedded
- `app/[token]/page.tsx` — searchParams, validFilter, isAdmin, FilterTabs, getListingsByFilter
- `app/[token]/admin/page.tsx` — RegenInviteForm added below LogoutButton

## Security Notes
- `isAdmin` is server-computed — not derived from any client-controllable input
- `validFilter` ternary blocks `?filter=deleted` URL exploit
- DELETE route handler independently re-verifies admin JWT (defense in depth)

## Deviations from Plan
None.

## Issues Encountered
None. All three tasks executed cleanly. `npx tsc --noEmit` exits 0 after each task and after all tasks.

## Phase 3 Complete
All Phase 3 plans (03-01 through 03-05) are complete. All requirements LIST-06, LIST-07, ADMN-03, ADMN-04 are implemented.
