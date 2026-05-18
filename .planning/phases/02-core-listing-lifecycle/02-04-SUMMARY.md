---
phase: 02-core-listing-lifecycle
plan: "04"
subsystem: ui
tags: [react, vercel-blob, url-createobjecturl, useref, useeffect, localstorage, lucide-react, magic-bytes]

# Dependency graph
requires:
  - phase: 02-core-listing-lifecycle
    provides: Plan 02-02 — POST /[token]/api/listings route handler returning { id, editToken }
  - phase: 02-core-listing-lifecycle
    provides: Plan 02-01 — lib/upload-validators.ts isAllowedMagicBytes() and upload route handler
  - phase: 01-foundation-security-gate
    provides: AppHeader Server Component, Button/buttonVariants, invite-gate middleware

provides:
  - app/[token]/new/page.tsx — Server Component shell at /[token]/new; awaits params, passes token to form
  - components/listings/CreateListingForm.tsx — Client Component form: magic bytes → Vercel Blob upload → POST → localStorage editToken → success banner

affects:
  - 02-05-browse-page-and-app-header (AppHeader currently accepts no token prop; 02-05 updates signature and all call sites)
  - 03-02-mark-taken-ui (reads localStorage edit_token_${id} written here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-step create flow in Client Component: isAllowedMagicBytes() → upload() with token-prefixed handleUploadUrl → POST with photoKey: blob.url"
    - "File ref pattern: useRef<File | null>(null) to hold selected File across re-renders without triggering state updates"
    - "URL.createObjectURL preview with revokeObjectURL in both handleFileChange and useEffect cleanup"
    - "isPending guard at top of handleSubmit prevents double-submit (T-02-04-C mitigation)"
    - "editToken written to localStorage only — never rendered in JSX (D-04 / T-02-04-D mitigation)"
    - "OQ-01 resolution applied: blob.url stored as photoKey (not blob.pathname) — stable CDN URL, compatible with next/image remotePatterns"
    - "Upload try/catch nested inside outer try/catch: upload failures get specific error message; other errors get generic"

key-files:
  created:
    - app/[token]/new/page.tsx
    - components/listings/CreateListingForm.tsx

key-decisions:
  - "Store blob.url (not blob.pathname) in photoKey per OQ-01 resolution — pathname alone cannot reconstruct CDN URL without store subdomain"
  - "Upload error wrapped in inner try/catch to produce specific 'Upload failed' message distinct from generic server errors"
  - "AppHeader called without token prop — per plan note, 02-05 will update AppHeader signature and all callers simultaneously"
  - "formRef.current?.reset() called inside 3000ms setTimeout alongside previewUrl revocation — form and preview clear together"

patterns-established:
  - "Inner upload try/catch pattern: wrap upload() in its own try/catch to distinguish upload failures from server errors"
  - "fileRef pattern: useRef<File | null> for the selected File object; avoids re-rendering on every file pick"

requirements-completed:
  - LIST-02
  - LIST-05
  - UX-02

# Metrics
duration: 2min
completed: 2026-05-18
---

# Phase 02 Plan 04: Create Listing Page and Form Summary

**Client Component form at /[token]/new orchestrating magic byte validation, Vercel Blob client upload with blob.url stored as photoKey, POST to /[token]/api/listings, localStorage editToken storage, URL.createObjectURL image preview, and 3-second success banner with form reset**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-18T23:22:44Z
- **Completed:** 2026-05-18T23:24:37Z
- **Tasks:** 2
- **Files modified:** 2 (created)

## Accomplishments

- Created `app/[token]/new/page.tsx` as a thin Server Component shell: `export const dynamic = 'force-dynamic'`, async params await, passes `token` to `CreateListingForm`
- Created `components/listings/CreateListingForm.tsx` as a full `'use client'` form implementing the three-step create flow: magic bytes validation via `isAllowedMagicBytes()`, `upload()` from `@vercel/blob/client` with token-prefixed `handleUploadUrl`, `POST /[token]/api/listings` with `photoKey: blob.url`, `localStorage.setItem('edit_token_${id}', editToken)`
- Image preview via `URL.createObjectURL` in `handleFileChange` with `URL.revokeObjectURL` cleanup in both `handleFileChange` and `useEffect` return
- `isPending` guard at top of `handleSubmit` + `disabled={isPending}` on submit button prevents double-submit
- Success banner (emerald, CheckCircle icon, "Your listing is posted!") appears on success, form resets after 3000ms
- Photo field is optional — form submits cleanly without file (D-09)
- TypeScript clean (`npx tsc --noEmit` exits 0)

## Task Commits

Each task was committed atomically:

1. **Task 1: app/[token]/new/page.tsx Server Component shell** - `1c72e3b` (feat)
2. **Task 2: components/listings/CreateListingForm.tsx Client Component** - `d0794d9` (feat)

**Plan metadata:** _(added after docs commit)_

## Files Created/Modified

- `app/[token]/new/page.tsx` — Server Component shell; `force-dynamic`, async params, renders `<CreateListingForm token={token} />`
- `components/listings/CreateListingForm.tsx` — Client Component form; all 6 fields (title, description, price, posterName, contactInfo, photo), three-step submit flow, preview, success banner, error display

## Decisions Made

- Stored `blob.url` (not `blob.pathname`) as `photoKey` per OQ-01 resolution — `blob.pathname` cannot reconstruct the full CDN URL without the store subdomain, which would break `next/image` rendering in the browse page
- Upload step wrapped in its own inner try/catch to produce a specific "Upload failed — please try again." error message, distinct from the generic server error path
- `AppHeader` called without `token` prop in this plan's page shell — the plan note explicitly specifies this is fine until 02-05 updates AppHeader's signature and all callers simultaneously
- `formRef.current?.reset()` called in the 3000ms setTimeout alongside `setPreviewUrl(null)` and `URL.revokeObjectURL` to ensure form and preview clear atomically

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. The form calls the existing upload handler and listings Route Handler from prior plans.

## Next Phase Readiness

- `/[token]/new` page is ready — "Post an item" link in AppHeader (once wired in 02-05) will navigate here
- `CreateListingForm` is fully implemented — users can post items with optional photo, see preview, and receive success confirmation
- `localStorage.setItem('edit_token_${id}', editToken)` is in place — Phase 3 mark-taken UI reads from this
- Blocker note: `AppHeader` still renders without `token` prop; 02-05 must update AppHeader signature before the "Post an item" link works end-to-end

## Known Stubs

None — the form makes real network calls to real route handlers. No placeholder data flows to UI rendering.

## Threat Flags

No new threat surface beyond the plan's threat model. All T-02-04 threats are mitigated as planned:
- T-02-04-A: `isAllowedMagicBytes()` called before `upload()` on form submit
- T-02-04-C: `isPending` guard + `disabled={isPending}` prevents double-submit
- T-02-04-D: `editToken` only in `localStorage.setItem`, never rendered in JSX

---
*Phase: 02-core-listing-lifecycle*
*Completed: 2026-05-18*
