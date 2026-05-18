# Phase 2: Core Listing Lifecycle - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the full listing loop: create a listing (title, description, optional price, poster name, contact info, optional photo), browse all active listings in a full-width card grid ordered newest-first, and display each listing card with all required info. The "Post an item" button in AppHeader gets wired up. No mark-as-taken functionality (Phase 3), no admin delete (Phase 3).

**Requires:** LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, UX-01, UX-02, UX-03

</domain>

<decisions>
## Implementation Decisions

### Create Listing Entry Point
- **D-01:** "Post an item" button navigates to a separate full-screen page at `/[token]/new`. Standard Next.js App Router route — no modal or sheet overlay.
- **D-02:** After successful submission, the form stays on `/[token]/new` and shows an inline success banner ("Your listing is posted!"). The banner does NOT display the edit token — it is stored silently in localStorage.
- **D-03:** After the success banner, the form resets so the user can post another item immediately. The banner clears when the form resets.
- **D-04:** Edit token is generated server-side on listing creation and returned to the client, which writes it to `localStorage` under a key like `edit_token_${listingId}`. The token is never shown to the user.

### Listing Card Design
- **D-05:** Browse page uses a single-column full-width card layout (1 column). No grid — one card per row, easy to scan on a phone.
- **D-06:** Description text is truncated to 2 lines with ellipsis (`line-clamp-2`). No tap-to-expand in Phase 2 — contact info on the card lets users reach the poster if interested.
- **D-07:** No listing detail page in Phase 2. The card is the full experience — all required info (photo, title, description, price/FREE, poster name, contact, date, status) is displayed on the card itself.

### Photo Upload
- **D-08:** Photo upload happens on form submit — the Vercel Blob client-upload token request fires when the user taps "Post", not on file pick. The whole create-listing flow is one submit action.
- **D-09:** Photo is optional. If no photo is provided, use a static fallback image (user will supply a photo of their dog as `/public/fallback.jpg` or similar). The card always shows an image — never a broken or empty photo slot.

### Claude's Discretion
- Exact card layout within the single-column constraint (padding, shadow, border-radius, spacing between cards)
- Whether the "Post an item" button in AppHeader becomes a Next.js `<Link>` or triggers a router.push
- Exact inline success banner appearance (color, icon, duration before form reset)
- Loading/pending state for the submit button during upload + DB write
- The exact localStorage key naming convention for edit tokens

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — Full definitions for LIST-01 through LIST-05, UX-01, UX-02, UX-03
- `CLAUDE.md` — Security requirements, schema notes, stack decisions — **read this first**

### Prior Phase Decisions
- `.planning/phases/01-foundation-security-gate/01-CONTEXT.md` — D-04 through D-10 directly affect Phase 2: upload handler location, schema structure, browse page shell, AppHeader button stub

### Architecture & Stack
- `.planning/research/SUMMARY.md` — Stack decisions, Vercel Blob client-upload pattern, Drizzle ORM usage
- `.planning/research/ARCHITECTURE.md` — Component breakdown, data flow

### Security & Pitfalls
- `.planning/research/PITFALLS.md` — Image upload abuse, schema decisions, localStorage edit token handling

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/shell/AppHeader.tsx` — "Post an item" button is already stubbed (disabled). Phase 2 converts it to a link/navigation action.
- `components/shell/EmptyState.tsx` — Replaced by listing cards when listings exist; keep for zero-state.
- `components/ui/button.tsx` — shadcn/ui Button, already in use — use for form submit button.
- `app/[token]/api/upload/route.ts` — Vercel Blob client-upload handler is fully implemented. Phase 2 calls it from the create form using `upload()` from `@vercel/blob/client`.
- `lib/schema.ts` — `listings` table fully defined with all needed columns including `edit_token`, `photo_key`, `status`, timestamps.
- `lib/db.ts` — Turso/Drizzle connection ready.

### Established Patterns
- Server Components for reads, Route Handlers or Server Actions for mutations — follow App Router conventions.
- Token-prefixed routes: all pages live under `app/[token]/...`; the create page goes at `app/[token]/new/page.tsx`.
- `lib/env.ts` validates env vars at startup — add any new env vars there.
- Tests live alongside source (`lib/*.test.ts`) — maintain the pattern for any new lib utilities.

### Integration Points
- Browse page (`app/[token]/page.tsx`) currently renders `<EmptyState />`. Phase 2 replaces it with a listings query + card grid, keeping `<EmptyState />` as the zero-state fallback.
- Upload handler returns a Blob URL; Phase 2 extracts the `pathname` (storage key) and stores it in `listings.photo_key` — never store the full URL (per CLAUDE.md).
- Edit token is generated server-side (use `crypto.randomUUID()` or 32-byte hex), inserted into the DB, and returned to the client for localStorage storage.

</code_context>

<specifics>
## Specific Ideas

- Fallback image: user will provide a photo of their dog. Save as a static asset (e.g., `/public/fallback.jpg`). Use it in the card `<Image>` component when `photo_key` is null.
- Edit token localStorage key: `edit_token_${listingId}` — simple, namespaced, avoids collisions if user posts multiple items.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Core Listing Lifecycle*
*Context gathered: 2026-05-18*
