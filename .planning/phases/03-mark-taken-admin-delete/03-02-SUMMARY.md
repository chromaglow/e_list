---
phase: 03-mark-taken-admin-delete
plan: "02"
subsystem: client-components
tags: [client-island, react, nextjs, ui]
dependency_graph:
  requires: []
  provides:
    - components/listings/MarkTakenButton.tsx
    - components/listings/AdminDeleteButton.tsx
    - components/listings/FilterTabs.tsx
    - components/admin/RegenInviteForm.tsx
  affects:
    - components/listings/ListingCard.tsx (will embed MarkTakenButton + AdminDeleteButton in Plan 05)
    - app/[token]/page.tsx (will embed FilterTabs in Plan 05)
    - app/[token]/admin/page.tsx (will embed RegenInviteForm in Plan 05)
tech_stack:
  added: []
  patterns:
    - useEffect localStorage read for hydration-safe client detection
    - useState(false) init for SSR/CSR parity
    - useRouter().refresh() for server component revalidation after mutation
    - useSearchParams + Link scroll={false} for URL-param tab navigation
    - window.confirm for lightweight delete confirmation
key_files:
  created:
    - components/listings/MarkTakenButton.tsx
    - components/listings/AdminDeleteButton.tsx
    - components/listings/FilterTabs.tsx
    - components/admin/RegenInviteForm.tsx
  modified: []
decisions:
  - "hasToken initializes to false (not true/null) to prevent SSR/CSR hydration mismatch"
  - "MarkTakenButton returns null until useEffect fires — renders nothing on server"
  - "AdminDeleteButton uses native window.confirm (per D-09) — no custom modal needed"
  - "FilterTabs uses scroll={false} to preserve scroll position on tab switch"
  - "RegenInviteForm displays full URL (origin + newToken) in readOnly input with click-to-select"
metrics:
  duration: "~8 min"
  completed: "2026-05-18"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 0
---

# Phase 03 Plan 02: Client Component Islands Summary

**One-liner:** Four `'use client'` islands — localStorage-gated mark-taken button, confirm-gated admin delete, URL-param filter tabs, and admin invite-regen form with copyable result.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | MarkTakenButton + AdminDeleteButton | f9a1082 | components/listings/MarkTakenButton.tsx, components/listings/AdminDeleteButton.tsx |
| 2 | FilterTabs + RegenInviteForm | e73994f | components/listings/FilterTabs.tsx, components/admin/RegenInviteForm.tsx |

## What Was Built

### MarkTakenButton (`components/listings/MarkTakenButton.tsx`)
- `'use client'` island; props: `{ listingId, token }`
- `hasToken` state initializes to `false` — prevents SSR/hydration mismatch
- `useEffect` reads `localStorage.getItem('edit_token_' + listingId)` and sets `hasToken`
- Returns `null` until hydration confirms token exists (invisible on server and during first render)
- On click: reads editToken from localStorage, PATCHes `/${token}/api/listings/${listingId}`, calls `router.refresh()` on success
- Button shows "Marking…" pending state; disabled during fetch

### AdminDeleteButton (`components/listings/AdminDeleteButton.tsx`)
- `'use client'` island; props: `{ listingId, token }`
- `window.confirm('Delete this listing?')` gate per D-09 — returns early if cancelled
- DELETEs `/${token}/api/listings/${listingId}`, calls `router.refresh()` on success
- Renders `<Trash2 className="size-4" />` icon via lucide-react (already installed)
- `catch` block is silent — non-fatal; card remains visible for retry

### FilterTabs (`components/listings/FilterTabs.tsx`)
- `'use client'` island; props: `{ token }`
- `useSearchParams()` reads `?filter=` param; defaults to `'active'` if absent
- Three `<Link>` elements: Active/active, Taken/taken, All/all
- Each href: `/${token}?filter=${tab.value}`, `scroll={false}` preserves scroll position
- Active tab styled with `bg-foreground text-background`; inactive with `text-muted-foreground`

### RegenInviteForm (`components/admin/RegenInviteForm.tsx`)
- `'use client'` island; props: `{ token }`
- POSTs to `/${token}/admin/api/regen-invite`, receives `{ newToken: string }`
- Constructs full URL as `window.location.origin + '/' + data.newToken`
- Displays result in `<input type="text" readOnly>` with `onClick` select-all for easy copying
- Shows error messages in `text-destructive` for both non-ok responses and network failures

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- All four files start with `'use client'` on line 1
- `useState(false)` for hasToken confirmed in MarkTakenButton
- `window.confirm` confirmed in AdminDeleteButton
- `npx tsc --noEmit` exits 0 (clean)
- `useSearchParams()` and `?filter=` pattern confirmed in FilterTabs
- `readOnly` input present in RegenInviteForm

## Known Stubs

None — these are pure UI components with no data wiring yet. They will be embedded by ListingCard, BrowsePage, and AdminPage in Plan 05. The route handlers they call (PATCH/DELETE /api/listings/[id] and POST /admin/api/regen-invite) are created in Plan 03.

## Threat Flags

None — no new network endpoints introduced. All fetch calls target existing or planned route handlers from the threat model.

## Self-Check: PASSED

- components/listings/MarkTakenButton.tsx: FOUND
- components/listings/AdminDeleteButton.tsx: FOUND
- components/listings/FilterTabs.tsx: FOUND
- components/admin/RegenInviteForm.tsx: FOUND
- Commit f9a1082: FOUND
- Commit e73994f: FOUND
