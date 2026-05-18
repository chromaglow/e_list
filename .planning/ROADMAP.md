# Roadmap: FriendSwap

## Overview

FriendSwap ships in three phases: a security-correct foundation with no listings, a fully functional listing lifecycle, and a complete management layer for status and admin tools. Each phase is independently deployable and verifiable. The security gate and schema decisions are established before a single listing is accepted, because these are the decisions with the highest retrofit cost.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Security Gate** - Invite-gated Next.js app on Vercel with DB schema, Vercel Blob, and admin login — no listings yet, security foundation is production-ready
- [ ] **Phase 2: Core Listing Lifecycle** - Friends can browse listings and post new items with a photo — the app is fully usable for its primary purpose
- [ ] **Phase 3: Status Management & Admin Tools** - Posters can mark items taken/sold, admin can delete listings and rotate the invite link — full management lifecycle complete

## Phase Details

### Phase 1: Foundation & Security Gate

**Goal**: A working invite-gated Next.js app on Vercel with DB schema, Vercel Blob wired, and admin login — no listings yet, but the security foundation is correct and production-ready
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: ACCS-01, ACCS-02, ADMN-01, ADMN-02
**Success Criteria** (what must be TRUE):

  1. Navigating to the app without the invite token returns a 404 — navigating with the correct token shows the (empty) browse page
  2. Admin can log in with the configured credentials and the session persists across browser refresh via cookie
  3. The invite token is a 64-character hex string validated on every server request by middleware before any route handler runs
  4. The app is deployed to Vercel with Turso DB connected and Vercel Blob configured — no runtime errors on a cold request

**Plans:** 6 plans
Plans:
**Wave 1**

- [ ] 01-01-PLAN.md — Walking Skeleton: scaffold Next.js 16 + invite-token proxy.ts + styled empty shell with disabled CTA + complete seven-var env loader skeleton (ACCS-01, ACCS-02)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 01-02-PLAN.md — Drizzle schema for listings table + Turso connection + generate/migrate workflow (D-07)
- [ ] 01-03-PLAN.md — Admin auth primitives: bcryptjs + zod + scripts/gen-hash.js + ADMIN_PASSWORD_HASH + lib/session.ts createAdminSession/deleteAdminSession + lib/rate-limit.ts + lib/admin-validators.ts (ADMN-01 hash half; D-02)
- [ ] 01-04-PLAN.md — Vercel Blob client-upload route at app/[token]/api/upload/route.ts with allowedContentTypes + 8 MB cap + client-side isAllowedMagicBytes helper (D-04, D-05, D-06)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 01-03b-PLAN.md — Admin auth routes + UI: /api/admin/login (constant-time bcrypt + rate-limit) + /api/admin/logout + /{token}/admin/login form + /{token}/admin landing with DAL verify (ADMN-02; ADMN-01 login flow half; D-01)

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 01-05-PLAN.md — Vercel production deploy: vercel.json buildCommand (drizzle-kit migrate) + env var setup + cold-start verification (D-08)

### Phase 2: Core Listing Lifecycle

**Goal**: Friends can browse listings and post new items with a photo — the app is fully usable for its primary purpose after this phase
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):

  1. A friend with the invite URL can open the browse page on their phone and see all active listings in a card grid, ordered newest-first, with no horizontal scroll or pinch-zoom required
  2. A friend can post a new listing by filling in a title, description, optional price, their name, contact info, and uploading one photo from their device — the listing appears on the browse page immediately after submission
  3. Each listing card displays the photo, title, description, a FREE badge (when no price is set) or the price, poster name and contact info, and the listing date
  4. After posting, the creator's browser receives and stores a one-time edit token in localStorage that will be required to mark the listing as taken/sold

**Plans**: TBD
**UI hint**: yes

### Phase 3: Status Management & Admin Tools

**Goal**: Posters can mark items taken/sold, admin can delete listings and rotate the invite link — the full management lifecycle is complete
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: LIST-06, LIST-07, ADMN-03, ADMN-04
**Success Criteria** (what must be TRUE):

  1. A poster can mark their own listing as taken or sold by presenting their localStorage edit token — the listing updates in-place and displays a taken/sold badge
  2. The browse page offers a toggle to show all listings or active-only, hiding taken/sold items when active-only is selected
  3. Admin can delete any listing from the browse page — the listing is soft-deleted (status set to 'deleted') and no longer appears to regular visitors
  4. Admin can regenerate the invite URL from the admin panel — the old token is immediately invalidated and the new URL is displayed

**Plans**: TBD

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Security Gate | 0/6 | Planned | - |
| 2. Core Listing Lifecycle | 0/? | Not started | - |
| 3. Status Management & Admin Tools | 0/? | Not started | - |
