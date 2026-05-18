# FriendSwap — Roadmap

**Milestone:** v1.0 — Full listing lifecycle for a small trusted group
**Last updated:** 2026-05-18

---

## Phase 01: Foundation + Security Gate

**Status:** COMPLETE (6/6 plans)
**Goal:** Next.js app scaffolding, invite-gate middleware, Turso DB + Drizzle schema, Vercel Blob upload handler, admin auth

| Plan | Name | Status | Summary |
|------|------|--------|---------|
| 01-01 | Project scaffold + Turso connection | DONE | — |
| 01-02 | Invite-gate middleware | DONE | — |
| 01-03 | Drizzle schema + migrations | DONE | — |
| 01-03b | Admin auth (bcrypt + jose JWT) | DONE | — |
| 01-04 | Vercel Blob upload handler | DONE | — |
| 01-05 | Browse page shell + AppHeader | DONE | — |

---

## Phase 02: Core Listing Lifecycle

**Status:** IN PROGRESS (1/5 plans)
**Goal:** Create listing form, browse page with card grid, photo upload integration, edit token issuance

| Plan | Name | Status | Summary |
|------|------|--------|---------|
| 02-01 | next/image CDN whitelist + fallback.jpg | DONE | remotePatterns + JPEG placeholder |
| 02-02 | Create listing Route Handler | PENDING | POST /api/listings, Zod validation, DB insert, editToken |
| 02-03 | ListingCard component | PENDING | Photo, title, price/FREE badge, contact, date |
| 02-04 | Browse page with card list | PENDING | Drizzle query, EmptyState fallback, AppHeader link |
| 02-05 | CreateListingForm + new page | PENDING | Client Component form, upload(), localStorage token |

---

## Phase 03: Mark Taken + Admin Delete

**Status:** NOT STARTED
**Goal:** Mark listing as taken/sold (edit token verification), admin delete any listing, invite token regeneration

| Plan | Name | Status | Summary |
|------|------|--------|---------|
| 03-01 | Mark taken/sold Route Handler | PENDING | Edit token verification, status update |
| 03-02 | Mark taken UI (listing card button) | PENDING | Client Component with localStorage token check |
| 03-03 | Admin delete listing | PENDING | Admin-gated soft delete, admin panel UI |
| 03-04 | Invite token regeneration | PENDING | Admin panel, generate new token, invalidate old |

---

## Requirements Coverage

| Phase | Requirements | Status |
|-------|-------------|--------|
| Phase 01 | ACCS-01, ACCS-02, ADMN-01, ADMN-02 | COMPLETE |
| Phase 02 | LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, UX-01, UX-02, UX-03 | IN PROGRESS |
| Phase 03 | LIST-06, LIST-07, ADMN-03, ADMN-04 | PENDING |

---
*Roadmap initialized: 2026-05-18*
