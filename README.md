# FriendSwap

A private invite-only web app for sharing free or cheap items with a small circle of friends. Built with Next.js 16 App Router, Turso (LibSQL) + Drizzle ORM, Vercel Blob for images, and jose JWT for the admin session.

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in values
cp .env.example .env.local
# Edit .env.local — see Env Vars section below

# 3. Apply DB migrations
npm run db:migrate

# 4. Run dev server
npm run dev

# 5. Verify invite gate
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/        # -> 404
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/$INVITE_TOKEN/  # -> 200
```

## Env Vars

See [.env.example](.env.example) for the full contract. All vars are server-only (no `NEXT_PUBLIC_` prefix).

Key notes:
- `INVITE_TOKEN` — 64 hex chars from `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `SESSION_SECRET` — base64-encoded 32-byte random from `openssl rand -base64 32`
- `ADMIN_PASSWORD_HASH` — generated via `node scripts/gen-hash.js <password>` — **never commit the plaintext**
- `BLOB_READ_WRITE_TOKEN` — from Vercel Dashboard → Project → Storage → Blob store

## Database Migrations

```bash
npm run db:generate   # after schema changes in lib/schema.ts
npm run db:migrate    # apply locally against Turso
```

Vercel auto-runs `drizzle-kit migrate` before every build (configured in `vercel.json`). The migration is idempotent — safe to run on every deploy.

## Deployment

Push to `main` to trigger an automatic Vercel deploy, or manually:

```bash
vercel --prod
```

Verify the production deployment:

```bash
INVITE_TOKEN=<token> scripts/cold-start-verify.sh <production-url>
```

## Project Status

Feature-complete v1. See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture decisions and contribution guidelines.
