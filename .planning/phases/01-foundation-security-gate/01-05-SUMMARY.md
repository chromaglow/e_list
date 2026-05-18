---
phase: 01-foundation-security-gate
plan: 05
subsystem: deploy
tags:
  - vercel
  - deploy
  - production
  - migrations
  - cold-start
requires:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
  - 01-03-SUMMARY.md
  - 01-03b-SUMMARY.md
  - 01-04-SUMMARY.md
provides:
  - Live production URL: https://v0-friendswap-nsw6qnxoz-chromaglow-7469s-projects.vercel.app
  - vercel.json: buildCommand runs drizzle-kit migrate before next build (D-08)
  - scripts/cold-start-verify.sh: 8-check curl suite against production URL
  - README.md: local setup + deploy runbook
affects:
  - All prior plans verified end-to-end in production
tech-stack:
  added:
    - Vercel Hobby tier (production deployment target)
    - Vercel CLI (local deploy tooling)
  patterns:
    - drizzle-kit migrate in Vercel buildCommand — idempotent, runs on every deploy
    - Deployment protection disabled (Vercel dashboard) for public access
    - Trailing-slash redirect behavior: Vercel 308s trailing-slash paths; cold-start-verify.sh uses non-slash paths
key-files:
  created:
    - vercel.json
    - README.md
    - scripts/cold-start-verify.sh
  modified:
    - scripts/upload-smoke-test.ts (BASE_URL env var support)
    - package.json (verify:prod script added)
key-decisions:
  - D-08 satisfied: vercel.json buildCommand = "npx drizzle-kit migrate && next build"
  - Deployment protection disabled in Vercel dashboard (required for public access)
  - Trailing-slash behavior: Vercel redirects /token/ → /token (308); cold-start checks use paths without trailing slash
  - Custom domain (swap.recklesspeach.com) deferred until after Phase 1 verification — will be added as post-phase DNS step
deviations:
  - Second deploy showed "migrations applied successfully!" rather than explicit "no migrations to apply" — confirmed expected: Drizzle Kit always prints this success message; idempotency proven in Plan 02 Task 05 tests
  - Vercel Deployment Protection was enabled by default on project creation; required manual disable in dashboard
requirements-completed: []
duration: ~30 min
completed: 2026-05-18
---

# Phase 01 Plan 05: Vercel Production Deploy Summary

Deployed FriendSwap to Vercel Hobby tier. All Phase 1 acceptance criteria verified end-to-end against the live production URL.

**Duration:** ~30 min | **Tasks:** 4 auto + 1 manual setup + 1 human-verify | **Files:** 3 created, 2 modified

## Production URL

```
https://v0-friendswap-nsw6qnxoz-chromaglow-7469s-projects.vercel.app
```

Vercel project: `v0-friendswap` | Scope: `chromaglow-7469s-projects`

## Tasks Completed

| Task | Result |
|------|--------|
| 01 — vercel.json buildCommand | ✓ |
| 02 — Link project + set 7 env vars | ✓ (manual) |
| 03 — .gitignore + README | ✓ |
| 04 — First production deploy | ✓ migrations ran, compiled successfully |
| 05 — cold-start-verify.sh | ✓ ALL CHECKS PASSED (8/8) |
| 06 — Human verify | ✓ all browser + terminal checks pass |

## Human Verification Results

| Check | Result |
|-------|--------|
| Root `/` → 404 | ✓ |
| Wrong token → 404 | ✓ |
| Right token → styled shell, "Nothing here yet" | ✓ |
| Mobile viewport (375px): no horizontal scroll | ✓ |
| Admin login form loads | ✓ |
| Wrong password → "Invalid credentials" | ✓ |
| Correct credentials → redirect to /admin | ✓ |
| admin_session cookie: HttpOnly + SameSite=Strict + **Secure** (production) | ✓ |
| Logout → cookie cleared, redirect to login | ✓ |
| Second deploy: migrate idempotent (no error) | ✓ |
| Upload smoke test against production | ✓ smoke-test ok |

## Phase 1 Acceptance Criteria Status

| Criterion | Status |
|-----------|--------|
| No token → 404; correct token → browse page | ✓ |
| Admin login persists across refresh via cookie | ✓ |
| Invite token is 64-char hex, validated on every request | ✓ |
| Deployed to Vercel, Turso connected, Vercel Blob configured, no cold-start errors | ✓ |

## Pending Post-Phase Step

Custom domain `swap.recklesspeach.com` (Cloudflare DNS) to be added after Phase 1 sign-off — no code changes required, Vercel + Cloudflare DNS-only CNAME configuration only.
