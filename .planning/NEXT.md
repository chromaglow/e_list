# FriendSwap — Current State & What's Next

**Last updated:** 2026-05-19  
**Phase:** 02 — core-listing-lifecycle  
**Status:** All plans executed. Three bugs found and partially fixed post-execution. Photo upload still broken (500 from `/api/upload`).

---

## What Was Built (Phase 2)

All five plans executed successfully:

| Plan | What it built |
|------|---------------|
| 02-01 | `next.config.ts` remotePatterns for Vercel Blob; `public/fallback.jpg` |
| 02-02 | `lib/listing-service.ts` — `getActiveListings()`, `createListing()` |
| 02-03 | `components/listings/ListingCard.tsx` — Server Component card |
| 02-04 | `components/listings/CreateListingForm.tsx` — Client Component form; `app/[token]/new/page.tsx` |
| 02-05 | `app/[token]/page.tsx` — browse page wired to listings; `AppHeader` "Post an item" Link |

---

## Bug 1 — Invisible "Post an item" Button

**Symptom:** The "Post an item" button rendered invisibly (transparent text on transparent background).

**Root cause:** Tailwind v4's `@theme inline` block contained `--color-primary: hsl(var(--primary))`. But `--primary` was set in a bare `:root { --primary: oklch(0.205 0 0) }` block (outside `@layer`), which takes cascade priority over anything inside `@layer`. This meant the computed value was `hsl(oklch(0.205 0 0))` — invalid CSS — making all color utilities transparent.

**Fix applied:** Rewrote `app/globals.css`:
- Changed every `hsl(var(--*))` in `@theme inline` to `var(--)` directly
- Removed the duplicate `@layer base :root {}` block that had the original HSL vars
- Result: `--color-primary: var(--primary)` correctly resolves to the OKLCH value

**Status:** Fixed and confirmed working.

---

## Bug 2 — Form Stuck at "Posting…" (No Photo)

**Symptom:** After clicking "Post item" without a photo, the button stayed disabled and never completed.

**Root cause:** React nullifies `e.currentTarget` after the first `await` in an async event handler. `new FormData(e.currentTarget)` was called after `setIsPending(true)` (which is async-yielding). The FormData came back empty → Zod 400 → the outer try/catch had no catch block → `isPending` never reset to `false`.

**Fix applied:** In `components/listings/CreateListingForm.tsx`:
- Moved ALL form data reading (`new FormData(e.currentTarget)` + all `.get()` calls) to the very top of `handleSubmit`, before any `await` or state setter
- Added outer `catch` block to ensure `setError()` is called and `isPending` resets on unexpected failures

**Status:** Fixed and confirmed working (submissions without photo succeed).

---

## Bug 3 — Photo Upload Fails (500)

**Symptom:** Submitting with a photo attached fails with a 500 from `/api/upload`. Submissions without a photo work fine.

**Status: UNRESOLVED** — this is the active blocker.

### Attempt 1 — `@vercel/blob/client` `upload()` (original plan)

The original Plan 02-04 design used `import { upload } from '@vercel/blob/client'`, which does:
1. POST to a `handleUploadUrl` on the server to get a signed JWT
2. Browser PUTs the file directly to Vercel CDN

The browser PUT hung indefinitely and never resolved.

Investigation found that the route handler had an `onUploadCompleted` callback configured. This causes Vercel Blob to embed a `callbackUrl` in the JWT, then wait for a server-to-server confirmation POST before returning the PUT response. Removing the callback didn't help — the PUT still hung (possibly CDN connectivity or ad-blocker issue in the test environment).

### Attempt 2 — Server-side FormData buffering

Removed all client-side blob code. New approach: send `FormData` from the client, parse it in a route handler with `request.formData()`, then call `put()` from `@vercel/blob`.

Problem: `request.formData()` buffers the entire file body. Vercel serverless functions have a ~4.5 MB default body size limit. Photos over that limit return 413 or error silently.

Additionally, the browser console showed a `Content-Security-Policy` eval-blocking error — investigated and confirmed this came from a browser extension (uBlock Origin), NOT from the app. No CSP headers in the app's HTTP responses, no CSP meta tag in `app/layout.tsx`.

### Attempt 3 — Server-side raw binary streaming (current code)

Changed approach to bypass the body size limit by streaming the raw binary:

**Client (`CreateListingForm.tsx`):**
```javascript
const uploadRes = await fetch(`/${token}/api/upload`, {
  method: 'POST',
  body: fileRef.current,           // File object → browser streams as raw binary
  headers: {
    'x-upload-content-type': fileRef.current.type,
    'x-upload-filename': fileRef.current.name,
    'x-upload-size': String(fileRef.current.size),
  },
})
```

**Route (`app/[token]/api/upload/route.ts`):**
```typescript
const blob = await put(filename, request.body, {   // passes ReadableStream directly
  access: 'public',
  addRandomSuffix: true,
  contentType,
})
```

**Result:** Still 500. The actual error message from the server is unknown — the console only shows the HTTP status.

---

## Likely Causes of the Current 500

In order of probability:

### 1. `BLOB_READ_WRITE_TOKEN` not set in Vercel project env vars

`@vercel/blob`'s `put()` requires `BLOB_READ_WRITE_TOKEN` to be set as an environment variable. If it wasn't added to the Vercel project (only to `.env.local`), every call to `put()` would throw and return 500. This is the most common cause of upload failures on Vercel.

**How to check:** Run `npx vercel env ls` and look for `BLOB_READ_WRITE_TOKEN` in the Production environment. Or check the Vercel dashboard under Project → Settings → Environment Variables.

### 2. `request.body` is a `ReadableStream` but `@vercel/blob` may not support it

`put()` accepts `string | Blob | ArrayBuffer | ReadableStream`. `request.body` is a `ReadableStream<Uint8Array>`. Depending on the version of `@vercel/blob` and the Next.js runtime, this might not work as expected — the stream might be consumed before `put()` reads it, or the type signature might not match.

**Alternative:** Use `request.arrayBuffer()` to buffer the whole file first, then pass the `ArrayBuffer` to `put()`. This re-introduces the body size issue, but if the 500 is from a streaming incompatibility, this would at least confirm the cause.

### 3. Next.js body parsing consuming the stream

Next.js App Router route handlers might be parsing/consuming the request body before the handler function can stream it. Some Next.js versions buffer the body automatically.

### 4. File MIME type not matching the `x-upload-content-type` header

If `fileRef.current.type` is empty (some mobile browsers don't set MIME types), the `ALLOWED_TYPES.includes()` check would fail and return a 400. However, the console shows 500, not 400 — so this is less likely.

---

## What to Try Next

### Option A — Check the actual error message first (quick, no code change needed)

Add temporary error logging to the route or check Vercel function logs:

1. Run `npx vercel logs` (or open Vercel dashboard → Deployments → Functions logs)
2. Trigger a failing upload
3. Look for the exception message in the log output

This will immediately tell you if it's a missing token, a type error, or something else.

### Option B — Verify BLOB_READ_WRITE_TOKEN is set in Vercel

```
npx vercel env ls
```

If `BLOB_READ_WRITE_TOKEN` is missing from Production, add it:
```
npx vercel env add BLOB_READ_WRITE_TOKEN production
```
(paste the value from `.env.local`)

### Option C — Switch `request.body` to `request.arrayBuffer()`

To rule out streaming compatibility issues:

```typescript
const arrayBuffer = await request.arrayBuffer()
const blob = await put(filename, arrayBuffer, {
  access: 'public',
  addRandomSuffix: true,
  contentType,
})
```

This re-buffers but Next.js body limit is configurable via `export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }` — or in App Router via `export const maxDuration` + route segment config. Note: App Router has different config syntax than Pages Router.

### Option D — External research

Before spending more time guessing, search for:
- "vercel blob put readablestream next.js app router 500"
- "@vercel/blob version compatibility request.body"
- Official `@vercel/blob` docs for the correct way to accept a streamed upload in an App Router route handler

Key question: does `@vercel/blob`'s `put()` function support `ReadableStream` in a Next.js App Router route handler context, and if so, what's the correct way to pipe the request body?

---

## Files Relevant to the Upload Bug

| File | Role |
|------|------|
| `app/[token]/api/upload/route.ts` | Route handler — receives binary body, calls `put()` |
| `components/listings/CreateListingForm.tsx` | Client — sends `fetch()` with raw File body + custom headers |
| `lib/upload-validators.ts` | `ALLOWED_TYPES`, `MAX_SIZE_BYTES`, `isAllowedMagicBytes()` |

---

## Phase 2 Remaining Acceptance Criteria

Once photo upload is fixed, these items from Plan 02-05 Task 3 still need verified:

- [ ] Submit with photo → success banner → listing card shows photo (not fallback)
- [ ] Submit without photo → listing card shows `fallback.jpg`
- [ ] `edit_token_[id]` key exists in `localStorage` after creation
- [ ] FREE badge (emerald) appears when price is empty
- [ ] No horizontal scroll at 375px viewport width

---

## Defer to Phase 3

Phase 3 plans are not yet written. Expected scope (from ROADMAP.md): mark-as-taken flow, admin dashboard improvements. None of this is blocked by the photo upload bug.
