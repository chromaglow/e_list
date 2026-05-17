# Project Research Summary

**Project:** FriendSwap
**Domain:** Private invite-only community marketplace (small trusted-group item sharing)
**Researched:** 2026-05-17
**Confidence:** HIGH

## Executive Summary

FriendSwap is a closed-group item-sharing app for 5-20 friends — the direct competition is a WhatsApp group chat, not Facebook Marketplace. The recommended approach is a monolithic, server-rendered Next.js 15 (App Router) application with a Turso (LibSQL/SQLite) database, Vercel Blob for image storage, and a custom lightweight JWT session for admin access. This stack requires a single Vercel deployment, costs nothing at this scale, and is buildable by one developer without any infrastructure complexity. The full system fits in one repo, one `vercel deploy`.

The highest-leverage design decisions are already made correctly in PROJECT.md: invite-link-only access (no accounts), one photo per listing (frictionless posting), contact outside the app (no messaging infrastructure), and a separate admin credential. Research confirms these decisions align with how successful small-community sharing tools (Buy Nothing, Olio) work at their best, and avoids the failure modes of over-engineered equivalents that kill adoption.

The primary risk is not technical — it is the invite link becoming the entire security boundary. If the URL leaks, all user contact information is exposed and spam listings can be posted. The mitigation is non-negotiable: use a cryptographically random 32-byte token (64 hex chars), validate it on every server request in middleware, and build invite-link rotation into Phase 1 before any real data is accepted. Secondary risks are image storage (must use object storage, not local disk, from day one) and schema decisions (status enum, soft deletes, timestamps) that cannot be retrofitted without pain.

---

## Key Findings

### Recommended Stack

Next.js 15 with the App Router is the right choice: server components handle the read path, server actions and Route Handlers cover all form submissions and admin APIs, and everything deploys to Vercel in a single command. No separate backend process, no CORS configuration, no second deployment target. TypeScript 5 and Tailwind CSS v4 are included in the standard scaffold. shadcn/ui provides accessible mobile-first card, dialog, and form components without adding a runtime dependency.

For data, Turso (LibSQL) with Drizzle ORM is the correct pairing for a Vercel deployment. SQLite's single-file, zero-connection-pool model is not a compromise at 5-20 users — it is the right tool. Drizzle is lightweight, TypeScript-native, and produces readable SQL. Image storage uses Vercel Blob (free Hobby tier: 5 GB storage, 100 GB/month bandwidth), which integrates natively with the stack and serves files from a CDN-backed origin separate from the app.

**Core technologies:**
- Next.js 15 (App Router): full-stack framework — single repo, single deploy, server components + server actions
- TypeScript 5: type safety on listing/form data shapes — ships with Next.js scaffold
- Tailwind CSS v4 + shadcn/ui: mobile-first styling + accessible component primitives — no runtime overhead
- Turso (LibSQL) + Drizzle ORM: SQLite-compatible edge database + lightweight TypeScript query builder
- Vercel Blob: object storage for listing photos — free tier, CDN-backed, native Vercel integration
- jose (JWT) + bcryptjs: lightweight admin session — ~50 lines, no auth SaaS needed for one credential
- Zod: server-side runtime validation of form inputs
- nanoid: cryptographically random IDs for listings and invite tokens

### Expected Features

The competition is a group chat. Every feature is measured against "is this better than posting a photo to WhatsApp?"

**Must have (table stakes):**
- Browse all active listings (grid/list, newest first) — the core value over a chat thread
- Create listing with photo (title, description, 1 photo, optional price, name + contact) — without photo, items don't move
- Mark item as taken/sold (poster-initiated) — #1 pain point in group chats is chasing already-gone items
- Admin delete (separate credentials) — moderator lever for spam/inappropriate content
- Invite-link access gate — closed group; public access destroys the use case
- Mobile-friendly layout — majority of use is on phones

**Should have (differentiators, low complexity, high payoff):**
- Relative timestamps ("3 days ago") — makes the app feel alive; trivial to implement
- Visual "FREE" badge when price is empty — reduces cognitive load; single CSS class
- Taken items grayed out but visible — shows community activity; social proof
- Toggle to hide taken items — once the list grows, this is a genuine UX win
- Image preview before submit on mobile — photo step is the highest-friction mobile moment
- Items sorted newest-first by default — no algorithm needed; simple ORDER BY

**Defer (v2+):**
- Search/filter: not needed until the list consistently exceeds ~50 items
- Comments/reactions: most users will not ask for this; re-evaluate only on explicit request
- Multiple photos: only if items consistently not moving due to poor photo quality
- Categories/tags: false structure at 5-20 items; add in v2 if needed
- Push notifications: major infrastructure lift with no clear payoff for a friend group

### Architecture Approach

The correct architecture is a monolithic server-rendered Next.js application. Route Handlers and Server Actions handle all data mutations; React Server Components handle all read paths. No separate JSON API, no SPA client-side routing, no microservices. The full data model is two tables (listings, admin_sessions). File uploads go to Vercel Blob; the resulting public URL is stored as a field in the listings row. Middleware handles two concerns: invite-token validation (all routes) and admin session validation (/admin/* routes). Route handlers call service functions; service functions call the database. Nothing else touches the database.

**Major components:**
1. Invite-token middleware — validates the secret URL token on every request before any route handler runs
2. Listing service — create/read/update-status/delete listings; manages photo URL lifecycle with Vercel Blob
3. Admin auth service — bcrypt password check, JWT issuance via jose, session cookie management
4. Browse page (Server Component) — queries active listings ordered by created_at DESC, renders card grid
5. Listing creation form — Server Action / Route Handler handles multipart upload; uploads photo to Blob first, then inserts DB row
6. Admin panel — authenticated view with delete controls

### Critical Pitfalls

1. **Invite link is not secret if sharing is easy** — Use a 32-byte cryptographically random token (64 hex chars), validate on every server request in middleware, build link rotation into Phase 1. Without rotation, a leaked link has no recovery path.

2. **Name-match ownership is not real ownership** — Issue a one-time edit token at listing creation, store in localStorage for the creator's browser session. The mark-as-taken action requires this token. Trivial to add at creation time; painful to retrofit. Without it, any friend who knows the poster's name can mark their listing taken.

3. **Image storage on local disk** — Use Vercel Blob from day one. Local disk is ephemeral on Vercel. Images will be lost on the first redeploy. Migrating after launch requires moving all existing images. This decision must be made before the first listing is posted.

4. **No file upload abuse controls** — Set upload limits at the HTTP middleware layer (max 8 MB body, 1 file), validate image type by magic bytes (not Content-Type header), set correct Content-Type on served images. Skipping these is a storage exhaustion and XSS vector.

5. **Weak schema decisions** — Use a `status` enum ('active', 'taken', 'deleted') not a boolean; add `deleted_at`, `taken_at`, and `updated_at` timestamp columns; store the photo storage key (not a full URL) in the DB. These are one-line additions at schema creation and months of regret if skipped.

---

## Implications for Roadmap

Based on the combined research, the natural build order flows from security/foundation outward to features, then polish. Architecture research and pitfalls research agree on this ordering.

### Phase 1: Foundation and Security Gate

**Rationale:** Every other feature is worthless without the access gate, DB schema, and image storage infrastructure in place. Pitfalls research is unanimous that security, schema, and storage decisions made after the first listing is posted are painful or impossible to retrofit.

**Delivers:** A working (but empty) invite-gated app on Vercel with the full schema, Vercel Blob integration, and admin login. No listings yet, but the foundation is correct and production-ready.

**Addresses:**
- Invite-link access gate (table stakes)
- Admin login (table stakes)
- DB schema with status enum, soft deletes, and all timestamp fields

**Avoids:**
- Pitfall 1 (invite link security) — 32-byte token, server-side middleware on every request, rotation endpoint
- Pitfall 3 (local disk image storage) — Vercel Blob decided and wired before first listing
- Pitfall 5 (weak schema) — status enum, deleted_at, taken_at, updated_at all added at schema creation
- Pitfall 7 (admin brute force) — bcrypt cost 12 + rate limiting on login route
- Pitfall 9 (CSRF) — SameSite=Strict on session cookie
- Pitfall 10 (images same origin as app) — Vercel Blob serves from a separate origin automatically

### Phase 2: Core Listing Lifecycle (Read + Write)

**Rationale:** With the foundation in place, implement the full listing loop: browse existing listings and create new ones. This is the entire user-facing value proposition. The read path (browse) comes before the write path (create listing) so the layout and data model are validated before writes are introduced.

**Delivers:** Users can browse active listings and post new items with a photo. The app is functional for its primary use case.

**Addresses:**
- Browse all active listings (table stakes)
- Create listing with photo (table stakes)
- Mobile-friendly layout (table stakes)
- Listings display all required fields (table stakes)
- Relative timestamps, FREE badge, newest-first sort (differentiators — include here; trivial cost)

**Avoids:**
- Pitfall 4 (file upload abuse) — size limits, magic byte validation, rate limiting on upload route
- Pitfall 6 (mobile photo UX) — image preview on file select, loading indicator on submit, capture attribute
- Pitfall 11 (upload + DB ordering) — upload to Blob first, only insert DB row on success
- Pitfall 12 (eager image loading) — loading="lazy" + explicit dimensions on all listing images

### Phase 3: Status Management and Admin Tools

**Rationale:** With listings being created, the taken-status flow and admin moderation tools complete the management lifecycle. These depend on listings existing (Phase 2) and admin auth being in place (Phase 1).

**Delivers:** Posters can mark their listings as taken. Admin can delete any listing. The browse page shows taken items grayed out with a toggle to hide them. The app is fully functional.

**Addresses:**
- Mark item as taken/sold (table stakes)
- Admin delete any listing (table stakes)
- Taken badge visible on browse grid (differentiator)
- Toggle to hide taken items (differentiator)

**Avoids:**
- Pitfall 2 (name-match ownership) — localStorage edit token issued at creation time (Phase 2), required for status update
- Pitfall 13 (page unusable over time) — active-only default query filter, show-taken toggle

### Phase 4: Polish and Hardening

**Rationale:** After the full feature set is working and validated with real use, address remaining UX and operational polish. These items improve an already-functional system and are not blockers.

**Delivers:** Invite link rotation UI (recovery path if link leaks), contact info reveal pattern (reduces scraping surface), optional image thumbnails for browse page performance.

**Addresses:**
- Pitfall 1 (invite link rotation) — admin UI to rotate the invite token
- Pitfall 8 (contact info scraping) — CSS reveal pattern for contact details
- Pitfall 12 (thumbnail performance) — resized thumbnails for browse grid via Vercel Blob image transform
- Pitfall 13 (auto-expiry) — optional auto-archive for listings older than 60 days

### Phase Ordering Rationale

- Security middleware and schema precede all features because pitfalls research identifies these as the decisions with highest retrofit cost. Pitfalls 1, 3, and 5 explicitly state "Phase 1 — architectural decision, cannot be retrofitted."
- The read path (browse) precedes the write path (create listing) because validating the layout and data model with static data is faster iteration than debugging through a creation form.
- Status management (Phase 3) depends on both listings existing and the admin credential existing from earlier phases.
- Polish (Phase 4) is deliberately deferred — the app is complete without it, and real usage reveals which polish items matter.

### Research Flags

Phases needing deeper research during planning:

- **Phase 1:** Turso free-tier limits should be verified at turso.tech/pricing before committing — training data confirms the service is free-tier-friendly, but exact current limits were not independently verified during research (live docs unavailable). If limits are unfavorable, Railway with plain SQLite file on disk is the clean fallback.
- **Phase 2:** Confirm whether Next.js 15 Server Actions support multipart file uploads or whether a Route Handler is required for the photo upload path — check the current Next.js 15 docs at implementation time.

Phases with standard patterns (research-phase not needed):

- **Phase 3:** Taken-status update and admin session validation are standard CRUD patterns; fully documented in ARCHITECTURE.md.
- **Phase 4:** All Phase 4 items are isolated UI/UX improvements with no novel integration patterns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js 15 and Tailwind v4 confirmed from official docs (May 2026); Vercel Blob pricing verified; Drizzle/Turso exact semver not independently verified — use latest and pin after install |
| Features | HIGH | Well-established consumer domain (Buy Nothing, Olio, Facebook group marketplaces); anti-features confirmed by PROJECT.md scope decisions |
| Architecture | HIGH | Monolith server-rendered patterns are well-documented; SQLite write-lock behavior and path-traversal mitigations are OWASP-confirmed |
| Pitfalls | HIGH (security/schema), MEDIUM (mobile UX) | Security/auth pitfalls are OWASP-backed; iOS Safari file input behavior is a known pattern but browser behavior can change |

**Overall confidence:** HIGH

### Gaps to Address

- **Turso free-tier limits:** Verify current limits at turso.tech/pricing before Phase 1 implementation. Fallback: Railway + plain SQLite file on disk.
- **Drizzle ORM version:** Use `drizzle-orm@latest` and pin the version after `npm install` — specific semver not independently verified.
- **jose version:** Confirm the version in current Next.js 15 auth docs examples at implementation time.
- **Next.js 15 Server Action file upload:** Confirm whether Server Actions handle multipart form data with file fields in the current stable release, or whether a Route Handler is required for the photo upload path.

---

## Sources

### Primary (HIGH confidence)
- Next.js 15 official docs (version 16.2.6, lastUpdated 2026-05-13) — App Router, Server Actions, Route Handlers, authentication guide
- Tailwind CSS v4 official docs — installation and PostCSS integration
- Vercel Blob official docs (lastUpdated 2026-03-04) — storage model, pricing, SDK
- OWASP File Upload Cheat Sheet — path traversal, magic byte validation, Content-Type enforcement
- OWASP Session Management Cheat Sheet — HttpOnly cookies, SameSite attribute, session token storage

### Secondary (MEDIUM confidence)
- Turso/LibSQL — free tier confirmed as existing and generous; exact current limits need verification
- Drizzle ORM — SQLite/libsql driver support confirmed; exact semver not independently verified
- jose ^5.x — referenced in Next.js official auth docs examples; specific version not independently verified
- shadcn/ui — stable ecosystem, widely used with Next.js App Router; version managed by npx init

### Tertiary (domain knowledge)
- Buy Nothing Project app, Olio, Bunz, Facebook group marketplace UX patterns — anti-feature and table-stakes analysis

---
*Research completed: 2026-05-17*
*Ready for roadmap: yes*
