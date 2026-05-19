# Phase 3: Mark Taken + Admin Delete — Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the remaining listing lifecycle actions: posters can mark their own listings as taken, admin can delete any listing, admin can regenerate the invite URL, and the browse page gains an Active/Taken/All tab filter. All mutations are guarded by the appropriate credential (edit token or admin JWT). No new pages needed beyond what already exists.

**Requires:** LIST-06, LIST-07, ADMN-03, ADMN-04

</domain>

<decisions>
## Implementation Decisions

### Mark Taken UX (LIST-06)

- **D-01:** The "Mark as taken" button appears directly on the listing card — visible **only** when `localStorage.getItem('edit_token_${listing.id}')` is present in the poster's browser. No separate edit page.
- **D-02:** The mark-taken action is a single button tap — no confirmation dialog. Instant feedback.
- **D-03:** The Route Handler for mark-taken accepts the edit token (in the request body) and verifies it matches `listings.edit_token` in the DB before updating `status → 'taken'` and `taken_at → now()`.
- **D-04:** After marking taken, the listing disappears from the "Active" tab immediately. The poster's browser can optimistically remove it from the feed.

### Browse Filter (LIST-07)

- **D-05:** Browse page has three tab buttons across the top of the feed: **Active**, **Taken**, **All**. "Active" is the default.
- **D-06:** Tabs are implemented as URL search params (`?filter=active|taken|all`) so the browse page Server Component reads the param and queries accordingly. Shareable URLs, no client state needed.
- **D-07:** Date filtering is deferred — newest-first sort is sufficient at current scale. No sort toggle in Phase 3.

### Admin Delete UI (ADMN-03)

- **D-08:** When logged in as admin, a delete icon/button appears on every listing card in the browse feed. No separate admin table — inline delete from the main feed.
- **D-09:** A confirm dialog ("Delete this listing?") appears before the delete fires. Prevents accidental deletion.
- **D-10:** Deletion is soft: `status → 'deleted'`, `deleted_at → now()`. Matches CLAUDE.md schema note and ADMN-03 requirement. Deleted listings never appear in any browse tab.
- **D-11:** Admin delete visibility is gated on a server-rendered prop or context — the browse page detects admin session server-side and passes `isAdmin` down to card components.

### Invite Regeneration (ADMN-04)

- **D-12:** Regenerating the invite link immediately invalidates the old token — no grace period. The new token overwrites `INVITE_TOKEN` via Vercel's API or a signed env update mechanism.
- **D-13:** The Regenerate button lives on the `/[token]/admin` page. After regeneration, the full new invite URL is displayed inline in a read-only copyable `<input>` or `<textarea>`.
- **D-14:** Admin JWT sessions survive invite regeneration — the admin session cookie is validated against `ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH`, not the invite token. (Carries forward Phase 1 D-02.)
- **D-15:** Invite token is stored in the `INVITE_TOKEN` environment variable. Regeneration updates the in-process value and writes the new token to Vercel env via the Vercel API. On Hobby tier this requires a redeploy to propagate — the admin should be warned that the new link is live only after the next deployment, OR we store the token in the DB instead to make it hot-swappable without a redeploy.

  **Resolved:** Store the current invite token in the DB (a single-row `settings` table or a `config` key in an existing table) so regeneration takes effect immediately without a redeploy. The middleware reads from DB (with a short in-memory cache) instead of env.

### Claude's Discretion

- Exact tab styling (pill tabs, underline tabs, segmented control)
- Whether "Mark as taken" button uses a loading/pending state during the API call
- Exact confirm dialog implementation (native `window.confirm` vs a custom modal)
- Exact delete icon choice (Trash2 from lucide-react)
- Cache duration for invite token DB read in middleware (suggest 60s)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — Full definitions for LIST-06, LIST-07, ADMN-03, ADMN-04
- `CLAUDE.md` — Security requirements, schema notes, stack decisions — **read this first**

### Prior Phase Decisions
- `.planning/phases/01-foundation-security-gate/01-CONTEXT.md` — D-02 (admin JWT independent of invite token), D-08 (middleware validates invite token on every request)
- `.planning/phases/02-core-listing-lifecycle/02-CONTEXT.md` — D-04 (edit token in localStorage as `edit_token_${listingId}`), D-07 (no listing detail page)

### Architecture & Stack
- `.planning/research/SUMMARY.md` — Stack decisions, Drizzle ORM usage
- `.planning/research/ARCHITECTURE.md` — Component breakdown, data flow

### Security & Pitfalls
- `.planning/research/PITFALLS.md` — Edit token handling, soft delete patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/schema.ts` — `listings` table already has `status` enum (`active|taken|deleted`), `taken_at`, `deleted_at`, `edit_token`. No schema migration needed for mark-taken or delete.
- `app/[token]/admin/page.tsx` — Admin page exists but currently only shows a logout button. Phase 3 adds the invite regeneration UI here.
- `proxy.ts` (middleware) — Currently reads `INVITE_TOKEN` from `process.env`. Phase 3 changes this to read from DB (cached).
- `components/listings/ListingCard.tsx` — Server Component. Phase 3 needs it to accept `isAdmin` and `hasEditToken` props so it can conditionally render admin-delete and poster mark-taken buttons.
- `components/ui/button.tsx` — Available for all action buttons.

### Key Integration Points
- Mark-taken Route Handler: `PATCH /[token]/api/listings/[id]` — body `{ editToken: string }`. Verify token against DB, update status.
- Admin delete Route Handler: `DELETE /[token]/api/listings/[id]` — requires valid admin JWT cookie. Soft delete.
- Browse page (`app/[token]/page.tsx`) — reads `searchParams.filter` to determine which listings to query. Already a Server Component.
- Invite regeneration: New Route Handler at `[token]/admin/api/regen-invite` or a Server Action. Writes new token to DB `settings` table; middleware picks it up on next request.

### New Schema Required
- A `settings` table (or `config` key-value table) to store the live invite token, replacing the env-var-only approach. Migration needed in Phase 3.

</code_context>

<deferred>
## Deferred Ideas

- **Date sort toggle** — user confirmed newest-first default is sufficient; no sort UI needed in v1.
- **"TAKEN" badge overlay on browse feed** — per Phase 3 decisions, taken listings are hidden from active view. A future v2 feature (LIST-V2-01) would show grayed-out taken cards.
- **Admin dashboard stats** — listing count, poster count, activity summary. Logged as ADMN-V2-01 in REQUIREMENTS.md.

</deferred>

---

*Phase: 3-Mark Taken + Admin Delete*
*Context gathered: 2026-05-18*
