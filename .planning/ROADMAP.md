# FriendSwap — Roadmap

**Milestone:** v1.0 — Full listing lifecycle for a small trusted group
**Last updated:** 2026-05-18 (Phase 03 planned)

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

**Status:** IN PROGRESS (4/5 plans)
**Goal:** Create listing form, browse page with card grid, photo upload integration, edit token issuance

| Plan | Name | Status | Summary |
|------|------|--------|---------|
| 02-01 | next/image CDN whitelist + fallback.jpg | DONE | remotePatterns + JPEG placeholder |
| 02-02 | Create listing Route Handler | DONE | POST /api/listings, Zod validate, Drizzle insert, { id, editToken } 201 |
| 02-03 | ListingCard component | DONE | Server Component; next/image fill+lazy+fallback, FREE badge, line-clamp-2, date in time element |
| 02-04 | CreateListingForm + new page | DONE | Client Component form: magic bytes → upload() → POST; blob.url as photoKey; localStorage editToken; preview + success banner |
| 02-05 | Browse page with card list + AppHeader link | PENDING | Drizzle query, EmptyState fallback, AppHeader token prop + Link |

---

## Phase 03: Mark Taken + Admin Delete

**Status:** PLANNED (5 plans)
**Goal:** Mark listing as taken/sold (edit token verification), admin delete any listing, invite token regeneration

**Plans:** 5 plans in 3 waves

**Wave 1** *(foundations — run in parallel)*
- [ ] 03-01-PLAN.md — Schema extensions + service functions (settings table, getListingsByFilter, markListingTaken, deleteListingAdmin, settings-service)
- [ ] 03-02-PLAN.md — Client Component islands (MarkTakenButton, AdminDeleteButton, FilterTabs, RegenInviteForm)

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 03-03-PLAN.md — Route handlers (PATCH/DELETE /listings/[id], POST /admin/api/regen-invite)
- [ ] 03-04-PLAN.md — Middleware DB cache + schema push [BLOCKING] *(has human checkpoint)*

**Wave 3** *(blocked on Wave 2 completion)*
- [ ] 03-05-PLAN.md — UI wiring (ListingCard, BrowsePage, AdminPage) *(has smoke-test checkpoint)*

**Cross-cutting constraints:**
- `verifyAdminSession(cookies)` must be called in every admin-gated handler and server component (03-03, 03-04, 03-05)
- `timingSafeEqual` from `node:crypto` required for all token comparisons (03-03, 03-04)
- All client islands use `router.refresh()` after successful mutations to sync Server Component state

---

## Requirements Coverage

| Phase | Requirements | Status |
|-------|-------------|--------|
| Phase 01 | ACCS-01, ACCS-02, ADMN-01, ADMN-02 | COMPLETE |
| Phase 02 | LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, UX-01, UX-02, UX-03 | IN PROGRESS |
| Phase 03 | LIST-06, LIST-07, ADMN-03, ADMN-04 | PLANNED |

---
*Roadmap initialized: 2026-05-18*
