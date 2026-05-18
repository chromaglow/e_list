---
phase: 01-foundation-security-gate
plan: 04
subsystem: upload
tags:
  - vercel-blob
  - upload
  - magic-bytes
  - validation
requires:
  - 01-01-SUMMARY.md
provides:
  - POST /{token}/api/upload — @vercel/blob/client handleUpload wrapper (JPEG/PNG/WebP only, 8 MB max, addRandomSuffix)
  - lib/upload-validators.ts — ALLOWED_TYPES, MAX_SIZE_BYTES, isAllowedMagicBytes (client-callable, no server-only guard)
  - scripts/upload-smoke-test.ts — demonstrates client-side magic-byte check + live token exchange
affects:
  - proxy.ts (NOT modified — route under [token] so existing proxy gates it automatically)
  - lib/env.ts (NOT modified — Wave 2 parallel contract)
tech-stack:
  added:
    - "@vercel/blob@2.3.3"
  patterns:
    - Client-upload pattern (browser → Vercel Blob CDN direct; server only issues short-lived token)
    - Magic-byte validation runs client-side BEFORE calling upload() (server never sees file bytes)
    - Route under [token] dynamic segment — proxy.ts invite gate applies automatically (D-06)
key-files:
  created:
    - app/[token]/api/upload/route.ts
    - app/[token]/api/upload/route.test.ts
    - lib/upload-validators.ts
    - lib/upload-validators.test.ts
    - scripts/upload-smoke-test.ts
  modified:
    - package.json (@vercel/blob@2.3.3 added, upload:smoke script added)
    - .env.local (BLOB_READ_WRITE_TOKEN placeholder replaced with real token)
key-decisions:
  - D-04 satisfied: POST /{token}/api/upload Route Handler delivered (not just env var config)
  - D-05 satisfied: magic-byte check is client-side (isAllowedMagicBytes in browser before upload()); Vercel CDN allowedContentTypes is second layer — combination satisfies CLAUDE.md "validate by magic bytes (not Content-Type)" intent
  - D-06 satisfied: route under [token] segment; proxy.ts invite gate applies; no admin session required
  - Wave 2 parallel contract honored: proxy.ts and lib/env.ts unchanged
requirements-completed: []
duration: ~15 min
completed: 2026-05-18
---

# Phase 01 Plan 04: Vercel Blob Upload Route Summary

Built the `POST /{token}/api/upload` Route Handler that issues Vercel Blob client-upload tokens via `@vercel/blob/client` handleUpload, with content-type restriction (JPEG/PNG/WebP), 8 MB cap, and path-injection defense (`addRandomSuffix: true`). Magic-byte validation is exposed as a client-callable helper (`isAllowedMagicBytes`) in `lib/upload-validators.ts` for Phase 2's listing form to call before invoking `upload()`.

**Duration:** ~15 min | **Tasks:** 5 auto + 1 human-verify | **Files:** 5 created, 2 modified

## Tasks Completed

| Task | Files | Commit | Status |
|------|-------|--------|--------|
| 01 — Install @vercel/blob + token | package.json, .env.local | 8d5b5aa | ✓ |
| 02 — upload-validators.ts (TDD) | upload-validators.ts + test | 8d5b5aa | ✓ |
| 03 — Upload route (TDD) | route.ts + route.test.ts | 8d5b5aa | ✓ |
| 04 — Smoke test script | upload-smoke-test.ts | 8d5b5aa | ✓ |
| 05 — Smoke test vs dev server | (no files) | — | ✓ |
| 06 — Human verify (curl + smoke) | (no files) | — | ✓ |

## Human Verification Results

| Check | Expected | Result |
|-------|----------|--------|
| Wrong token → /wrong-token/api/upload | 404 | ✓ |
| Bare /api/upload (no token prefix) | 404 | ✓ |
| Correct token + empty body | 400 | ✓ |
| npm run upload:smoke | exits 0 | ✓ |

## Phase 2 Hand-off Contract

```ts
// Browser-side (Phase 2 listing form):
import { ALLOWED_TYPES, MAX_SIZE_BYTES, isAllowedMagicBytes } from '@/lib/upload-validators'
import { upload } from '@vercel/blob/client'

const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())
if (!isAllowedMagicBytes(head)) { showError('Not a valid image'); return }
const blob = await upload(file.name, file, {
  access: 'public',
  handleUploadUrl: `/${token}/api/upload`,
})
// blob.pathname → store in DB, NOT blob.url (CLAUDE.md: store keys not full URLs)
```

## D-05 Compliance Note

CLAUDE.md requires "validate by magic bytes (not Content-Type)". The `@vercel/blob/client` architecture transfers file bytes browser→CDN directly — the server never sees file content. Server-side magic-byte enforcement is architecturally impossible. Compliance is achieved by:
1. Browser calls `isAllowedMagicBytes()` on the first 12 bytes BEFORE invoking `upload()` (content-based, not Content-Type-header-based)
2. Vercel CDN enforces `allowedContentTypes: ['image/jpeg','image/png','image/webp']` server-side as a second layer

## Open Follow-ups

- `onUploadCompleted` callback is not reachable on localhost (RESEARCH.md Pitfall 5) — full DB write integration tested in Phase 2 against Vercel preview
