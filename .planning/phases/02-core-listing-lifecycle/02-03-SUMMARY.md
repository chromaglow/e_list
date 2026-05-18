---
phase: 02-core-listing-lifecycle
plan: "03"
subsystem: ui
tags: [server-component, next/image, listing-card, free-badge, fallback-image]

# Dependency graph
requires:
  - phase: 02-core-listing-lifecycle
    provides: Plan 02-01 — next/image CDN whitelist + fallback.jpg; Plan 02-02 — listing-service + Listing type from schema
  - phase: 01-foundation-security-gate
    provides: Drizzle schema (lib/schema.ts) with Listing type

provides:
  - components/listings/ListingCard.tsx — Server Component card for a single active listing

affects:
  - 02-04-browse-page (maps over Listing[] rendering ListingCard per item)
  - 02-05-create-listing-form (no direct dependency, but visual consistency target)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component card pattern: no 'use client', pure prop-to-render transform with next/image fill + loading=lazy"
    - "Conditional price/FREE badge: listing.price truthy → price string; falsy → emerald badge"
    - "Date formatting: toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) wrapped in <time dateTime={iso}>"
    - "Image fallback: listing.photo_key ?? '/fallback.jpg' — card always shows an image (D-09)"

key-files:
  created:
    - components/listings/ListingCard.tsx
  modified: []

key-decisions:
  - "Used 'import type { Listing }' to avoid pulling runtime values — only the type is needed in a Server Component"
  - "formatDate() is a local helper function — not exported, not a utility — keeps the component self-contained"
  - "Comment in file says 'No use client' as documentation intent; directive is correctly absent from the file"

patterns-established:
  - "ListingCard is the visual template for all Phase 2 listing renders — UI-SPEC §4.2 class strings are the canonical source"

requirements-completed:
  - LIST-03
  - LIST-04
  - UX-01

# Metrics
duration: 2min
completed: 2026-05-18
---

# Phase 02 Plan 03: ListingCard Server Component

**Server Component card rendering photo (with lazy loading and /fallback.jpg fallback), FREE badge or price, 2-line-clamped description, poster name/contact, and formatted date — matching UI-SPEC §4.2 exactly**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-18T23:18:47Z
- **Completed:** 2026-05-18T23:19:51Z
- **Tasks:** 1
- **Files modified:** 1 (created)

## Accomplishments

- Created `components/listings/ListingCard.tsx` as a pure Server Component (no `'use client'` directive)
- Implements `next/image` with `fill`, `loading="lazy"`, and `sizes="(max-width: 640px) 100vw, 640px"` — lazy loads card photos for performance
- Photo source is `listing.photo_key ?? '/fallback.jpg'` — card always shows an image (D-09)
- FREE badge renders with emerald-100/emerald-800 light mode and emerald-900/30 emerald-400 dark mode when `listing.price` is null/empty (UX-01)
- Description rendered with `line-clamp-2` — exactly 2 lines with ellipsis on overflow (D-06)
- Date formatted as "May 18, 2026" via `toLocaleDateString('en-US', ...)` inside a `<time dateTime={iso}>` element (LIST-04)
- Card wrapper is `<article>` with `rounded-lg border bg-card shadow-sm overflow-hidden` per UI-SPEC §4.2
- TypeScript clean — `npx tsc --noEmit` exits 0
- Does NOT render `edit_token` (T-02-03-B mitigation)
- Does NOT use `font-medium` anywhere — only `font-normal` and `font-semibold` per UI-SPEC §2.2

## Task Commits

1. **Task 1: Create components/listings/ListingCard.tsx** - `b959158` (feat)

## Files Created/Modified

- `components/listings/ListingCard.tsx` — Server Component; exports default `ListingCard({ listing: Listing })`

## Decisions Made

- Used `import type { Listing }` — type-only import avoids pulling runtime values; the Listing type is only needed for the prop annotation in a Server Component
- `formatDate()` is a local module-level helper function (not exported, not in lib/) — keeps the component fully self-contained for a pure rendering concern
- The comment in the file header reads `No 'use client'` to document the intent explicitly; the actual directive is absent (correct Server Component behavior)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — ListingCard receives a real `Listing` prop from its parent. All fields rendered are from the DB row. No hardcoded placeholder values flow to the UI from this component.

## Threat Flags

No new threat surface beyond what is in the plan's threat model.

- T-02-03-A (XSS): React auto-escapes all JSX text positions — no `dangerouslySetInnerHTML` used.
- T-02-03-B (edit_token disclosure): `listing.edit_token` is never referenced in the component — confirmed by grep.
- T-02-03-C (photo_key URL): `photo_key` passed directly to next/image `src`; `remotePatterns` in `next.config.ts` (02-01) restricts hostnames to `*.blob.vercel-storage.com`.

## Self-Check: PASSED

- `components/listings/ListingCard.tsx` exists: FOUND
- Commit `b959158` exists: FOUND
- `npx tsc --noEmit` exits 0: CONFIRMED

---
*Phase: 02-core-listing-lifecycle*
*Completed: 2026-05-18*
