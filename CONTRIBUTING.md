# Contributing to FriendSwap

## Architecture

- **Framework:** Next.js 16 (App Router) — server components for reads, route handlers for mutations
- **Database:** Turso (LibSQL, SQLite-compatible) + Drizzle ORM — 2 tables: `listings`, `settings`
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

Any contribution that touches auth or uploads must preserve these invariants:

- Invite token must be 32 bytes cryptographically random (64 hex chars) — never a short slug
- Validate invite token on every server request in middleware before any route handler runs
- Admin bcrypt cost ≥ 12 + rate limiting on login route
- Session cookie: HttpOnly, SameSite=Strict, Secure
- Image uploads: validate by magic bytes (not Content-Type), max 8 MB, 1 file
- Never serve uploaded files from the same origin as the app (Vercel Blob handles this)
- Store image storage keys in DB, not full URLs

## Schema Notes

The `listings` table uses a `status` enum — `'active' | 'taken' | 'deleted'` — not a boolean. Timestamps `taken_at`, `deleted_at`, `updated_at` are all present. Do not collapse these to a boolean field.

## Deployment

- Target: Vercel (Hobby tier)
- DB: Turso — verify current free-tier limits at turso.tech/pricing
- Images: Vercel Blob — 5 GB storage, 100 GB/month bandwidth on free tier
- **Do NOT use local disk storage** — Vercel's filesystem is ephemeral; images will be lost on redeploy

## Out of Scope (v1)

These are intentional omissions, not missing features:

- In-app messaging
- Multiple photos per listing
- User accounts or profiles
- Payment processing
- Full-text search
- Comments or reactions
- Push notifications
