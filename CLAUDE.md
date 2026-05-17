# FriendSwap — Project Guide

A private invite-only web app for sharing free or cheap items with a small circle of friends (~5–20 people). Built with Next.js 15 App Router, Turso (LibSQL/SQLite) + Drizzle ORM, Vercel Blob for images, and jose JWT for the admin session.

## Project Context

- **Planning:** `.planning/` contains all project artifacts
- **Roadmap:** `.planning/ROADMAP.md` — 3 phases, currently at Phase 1
- **Requirements:** `.planning/REQUIREMENTS.md` — 16 v1 requirements with REQ-IDs
- **Research:** `.planning/research/SUMMARY.md` — stack, features, architecture, pitfalls

## GSD Workflow

This project uses the GSD (Get Shit Done) workflow. Key commands:

```
/gsd:discuss-phase N    — gather context and clarify approach for phase N
/gsd:plan-phase N       — create execution plan for phase N
/gsd:execute-phase N    — execute all plans in phase N
/gsd:progress           — check current status
```

**Current next step:** `/gsd:discuss-phase 1`

## Architecture

- **Framework:** Next.js 15 (App Router) — server components for reads, server actions/route handlers for mutations
- **Database:** Turso (LibSQL, SQLite-compatible) + Drizzle ORM — 2 tables: `listings`, `admin_sessions`
- **Image storage:** Vercel Blob — public CDN-backed URLs, separate origin from app
- **Auth:** Admin only — bcrypt password hash in env var, jose JWT in HttpOnly SameSite=Strict cookie
- **Access gate:** Invite-link middleware — 64-char hex token in URL path prefix, validated on every request

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Invite link = sole access gate | No accounts needed for a trusted friend group |
| One photo per listing, direct upload | Frictionless for phone users |
| Contact outside the app | No messaging infrastructure needed |
| localStorage edit token for ownership | No accounts but still prevents strangers from marking items taken |
| Soft delete (status enum) | Preserves data, enables admin audit trail |

## Security Requirements

- Invite token must be 32 bytes cryptographically random (64 hex chars) — never a short slug
- Validate invite token on every server request in middleware before any route handler runs
- Admin bcrypt cost ≥ 12 + rate limiting on login route
- Session cookie: HttpOnly, SameSite=Strict, Secure
- Image uploads: validate by magic bytes (not Content-Type), max 8 MB, 1 file
- Never serve uploaded files from the same origin as the app (Vercel Blob handles this)
- Store image storage keys in DB, not full URLs

## Schema Notes

Use a `status` enum — `'active' | 'taken' | 'deleted'` — not a boolean. Include `taken_at`, `deleted_at`, `updated_at` timestamps. These cannot be retrofitted painlessly after launch.

## Deployment

- Target: Vercel (free Hobby tier)
- DB: Turso — verify current free-tier limits at turso.tech/pricing before Phase 1
- Images: Vercel Blob — 5 GB storage, 100 GB/month bandwidth on free tier
- Do NOT use local disk storage — Vercel's filesystem is ephemeral; images will be lost on redeploy

## What NOT to Build (v1)

- In-app messaging
- Multiple photos per listing
- User accounts or profiles
- Payment processing
- Search / filtering
- Comments or reactions
- Push notifications

---
*Generated: 2026-05-17 | GSD workflow active*
