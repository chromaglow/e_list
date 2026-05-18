---
phase: 02-core-listing-lifecycle
plan: "01"
subsystem: infra
tags: [next.config, vercel-blob, next/image, static-assets, image-optimization]

# Dependency graph
requires:
  - phase: 01-foundation-security-gate
    provides: Next.js app with Vercel Blob upload handler and Drizzle schema already in place
provides:
  - next/image authorized to serve *.blob.vercel-storage.com CDN URLs via remotePatterns
  - Static fallback JPEG at /public/fallback.jpg for listing cards with no photo
affects:
  - 02-03-listing-card (ListingCard uses next/image with blob URLs + fallback.jpg)
  - 02-04-browse-page (browse page renders ListingCards which depend on these prereqs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "next.config.ts images.remotePatterns: whitelist external CDN hostnames for next/image"
    - "Static fallback asset pattern: /public/fallback.jpg used as default card image when photo_key is null"

key-files:
  created:
    - public/fallback.jpg
  modified:
    - next.config.ts

key-decisions:
  - "Stored fallback.jpg as downloaded placeholder JPEG (640x480 from placehold.co); user replaces with dog photo before Phase 2 ships"
  - "remotePatterns uses wildcard *.blob.vercel-storage.com to cover all Vercel Blob store subdomains"

patterns-established:
  - "next.config.ts is the single place for next/image hostname whitelisting"

requirements-completed:
  - UX-03

# Metrics
duration: 8min
completed: 2026-05-18
---

# Phase 02 Plan 01: next/image CDN whitelist and fallback.jpg placeholder

**next.config.ts remotePatterns whitelist for *.blob.vercel-storage.com and a valid JPEG fallback image at /public/fallback.jpg — both required before ListingCard can render**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-18T23:00:00Z
- **Completed:** 2026-05-18T23:08:54Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `images.remotePatterns` to `next.config.ts` whitelisting `*.blob.vercel-storage.com` so `next/image` can serve Vercel Blob CDN URLs without 400 errors
- Downloaded and committed a valid 640x480 JPEG placeholder at `public/fallback.jpg` (5987 bytes, JPEG magic bytes ff d8 confirmed)
- TypeScript check (`npx tsc --noEmit`) passes with the updated config shape

## Task Commits

Each task was committed atomically:

1. **Task 1: Add images.remotePatterns to next.config.ts** - `290387f` (chore)
2. **Task 2: Add /public/fallback.jpg placeholder** - `75bff5f` (feat)

**Plan metadata:** _(to be added after final commit)_

## Files Created/Modified
- `next.config.ts` - Added `images.remotePatterns` array with `*.blob.vercel-storage.com` wildcard entry
- `public/fallback.jpg` - Static JPEG placeholder (640x480, 5987 bytes) for listing cards with no uploaded photo

## Decisions Made
- Used wildcard `*.blob.vercel-storage.com` in remotePatterns — covers all Vercel Blob store subdomains without needing to hardcode the specific store subdomain
- Downloaded placeholder from `placehold.co/640x480.jpg` via curl (succeeded) rather than writing raw byte buffer via Node.js — cleaner and produces a visible placeholder image
- User can replace `public/fallback.jpg` with a dog photo at any time before Phase 2 ships; the file is committed to repo so build/tests don't break

## Deviations from Plan

None — plan executed exactly as written. Task 2 was a `checkpoint:human-verify` but the plan explicitly provided automated approaches (curl download first, Node.js byte buffer as fallback). The curl approach succeeded, so the checkpoint was resolved automatically without human intervention.

## Issues Encountered

None — both tasks completed cleanly. TypeScript check passed with no errors.

## User Setup Required

None — no external service configuration required.

The user may optionally replace `public/fallback.jpg` with a photo of their dog (or any preferred fallback image) at any time. Simply overwrite the file with a JPEG and commit.

## Next Phase Readiness

- `next.config.ts` is ready — `next/image` will accept Vercel Blob CDN URLs in ListingCard
- `public/fallback.jpg` is ready — ListingCard can safely use `/fallback.jpg` as fallback `src` when `listing.photo_key` is null
- Both prerequisites for Plan 02-03 (ListingCard) and Plan 02-04 (browse page) are satisfied
- No blockers for remaining Phase 2 plans

---
*Phase: 02-core-listing-lifecycle*
*Completed: 2026-05-18*
