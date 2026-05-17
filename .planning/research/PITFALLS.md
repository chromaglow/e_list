# Domain Pitfalls: FriendSwap

**Domain:** Private community marketplace web app (invite-link-only access)
**Researched:** 2026-05-17
**Confidence:** HIGH for security/auth model, HIGH for image handling, HIGH for schema decisions, MEDIUM for deployment specifics

---

## Critical Pitfalls

Mistakes that cause rewrites, security incidents, or user-visible failures.

---

### Pitfall 1: The Invite Link Is Not a Secret If Sharing Is Easy

**What goes wrong:** The invite URL becomes public. A friend texts it to a group chat, screenshots it and posts it, or a browser's "share" feature pastes it somewhere. Once leaked, the entire app is open to anyone who finds it — which, for a small group, may just mean an awkward stranger posts a listing. But in a worst case it means spam listings, offensive content, or contact info harvesting.

**Why it happens:** The design decision "URL is the only gate" is correct for friction reduction but treats the URL as a long-lived, revocable secret — which it isn't without tooling to support revocation.

**Consequences:**
- Unauthorized users can browse all contact info (names, phone numbers, emails) of every poster
- Unauthorized users can post listings or spam
- No audit trail to know who accessed what

**Prevention:**
- Use a cryptographically random token of at least 32 bytes (e.g., `crypto.randomBytes(32).toString('hex')` = 64 hex chars). Do not use UUID v4 (too short — 122 bits is fine but familiar-looking), short slugs, or sequential IDs.
- Store the token server-side and validate it on every request (middleware), not just on first load. A single-page-app client-side check is not enough.
- Add an admin-accessible "rotate invite link" function from the start, even if rarely used. Without it, once the link leaks there is no recovery short of a database edit.
- Set a `Cache-Control: no-store` header on the main HTML response so the URL is not cached or logged by CDN/proxy layers.
- Never log the full invite URL in server logs (log requests as `/[invite]/*` masked).

**Detection (warning signs):**
- Listings appear from unknown names
- Sudden spike in listing creation
- Contact info in listings starts getting spam/scam messages

**Phase to address:** Phase 1 (foundation). The token validation middleware must be built before any routes are exposed. This is not an optimization — it is the gate.

---

### Pitfall 2: "Match by Name" Ownership Is Not Ownership

**What goes wrong:** The requirement says "poster can mark their own listing as taken/sold (matched by name/contact they entered)." This means any visitor who knows (or guesses) another poster's name can mark that listing as taken. For a friend group this is low-stakes, but it creates a subtle UX trap: a friend accidentally types a similar name and can mark someone else's listing.

**Why it happens:** Stateless "ownership" without any session token or secret is inherently guessable by any insider (or anyone who can see the listing, since the poster's name is displayed).

**Consequences:**
- Listings get incorrectly marked taken/sold
- Frustrated posters who can't figure out why their item shows as sold
- No way to undo without admin intervention

**Prevention:**
- Issue a short-lived, one-time "edit token" at listing creation time. Store it in `localStorage` for the creator's browser session. The mark-as-taken button only works if this token matches. This adds near-zero friction (automatic) and provides real ownership semantics.
- As a minimum viable alternative: require name + contact info (both fields) to match exactly (case-insensitive) before allowing status change, and rate-limit this endpoint to prevent brute-force matching.
- Display a clear "only the original poster should do this" message on the mark-taken UI.

**Detection:** Admin receiving complaints that listings are incorrectly marked sold.

**Phase to address:** Phase 1 schema/model design. The edit token column is trivial to add at creation time and very painful to retrofit.

---

### Pitfall 3: Uploaded Images Stored on the App Server's Filesystem

**What goes wrong:** Images are uploaded directly to the server's local disk (`/uploads` directory). This works perfectly in development and early deployment, then causes multiple downstream problems: (a) images are lost on every redeploy unless a persistent volume is configured; (b) the app server's disk fills up with no natural limit; (c) horizontal scaling (two instances) means image not found errors because the file exists on only one server; (d) uploaded files are served directly, creating a path traversal risk if filenames are not sanitized.

**Why it happens:** It is the path of least resistance. `multer`, `busboy`, and most framework upload guides default to local disk.

**Consequences:**
- Images disappear after redeployment (very common on platforms like Render, Railway, Fly.io on free tier)
- Disk exhaustion on low-cost hosting
- Serving a user-supplied filename as-is can allow `../../etc/passwd` style paths

**Prevention:**
- Use object storage from day one: AWS S3, Cloudflare R2 (free egress), or Backblaze B2. All have SDKs that make this ~20 lines of code.
- For a project this small, Cloudflare R2 free tier (10 GB storage, unlimited egress) is the right default.
- Generate a random UUID-based filename server-side on upload. Never use the client-supplied filename, even sanitized. Store only the generated key in the database.
- Set a server-side file size limit (e.g., 5 MB) enforced before the file is read into memory. Both at the HTTP layer (request body size limit) and in the upload handler.
- Validate MIME type by reading the file's magic bytes (first few bytes), not trusting the `Content-Type` header or file extension. A JPEG should start with `FF D8`. Reject anything that doesn't match.
- Store object storage keys in the DB, derive serving URLs from those keys (either a public bucket URL or a signed URL).

**Detection (warning signs):**
- Photos missing after a redeploy
- Disk usage growing without bound
- App crash with ENOSPC error

**Phase to address:** Phase 1 (architecture decision). Changing storage backend after launch requires migrating all existing images. Decide before the first listing is posted.

---

### Pitfall 4: No File Upload Abuse Controls

**What goes wrong:** Any visitor with the invite link can upload unlimited files of any type. Without controls, a single visitor can exhaust storage, upload non-image files (including HTML that could be served and interpreted as a page), or upload very large files that time out the server.

**Why it happens:** Focus on the happy path during build; abuse controls feel premature for a friend group.

**Consequences:**
- Storage costs spike unexpectedly
- Server memory exhaustion from reading a large file into memory
- If files are served without correct Content-Type headers, an uploaded HTML file served from your domain could execute scripts

**Prevention:**
- Enforce upload limits at the HTTP middleware layer (not just the form): maximum body size ~8 MB, maximum file count = 1.
- Validate image type server-side by magic bytes (see Pitfall 3).
- Set `Content-Disposition: attachment` or `Content-Type: image/jpeg` (enforced, not from the upload) when serving stored images. Never let the browser infer type from a user-supplied file.
- For R2/S3: set a bucket policy that allows only specific content types.
- Rate-limit the upload endpoint by IP (e.g., max 5 listings per hour per IP) even for a friend group — this is trivial to add and prevents a runaway script.

**Phase to address:** Phase 1 for limits and type validation. Rate limiting can be Phase 2 if you accept the small risk.

---

### Pitfall 5: Schema Decisions That Hurt When the App Grows

**What goes wrong:** The data model is designed around the current happy path with no soft-delete, no audit trail, and status as a boolean. When the admin needs to recover a mistakenly deleted listing, there is nothing to recover. When you want to add "pending review" or "expired" states, a boolean `is_taken` doesn't accommodate them without a migration.

**Why it happens:** YAGNI applied too aggressively to data schema. Unlike code, schema migrations on live data are costly.

**Consequences:**
- No undo for accidental admin deletion
- Adding listing states requires a migration and data backfill
- No way to know when a listing was marked taken (useful for future "auto-expire after 30 days" feature)

**Prevention:**
- Use a `status` enum field (`active`, `taken`, `deleted`) instead of a boolean `is_taken`. This adds zero complexity to queries for the MVP but accommodates future states.
- Add `deleted_at TIMESTAMP NULL` for soft-deletes. Admin "delete" sets this field; a `WHERE deleted_at IS NULL` filter excludes them from browsing. Hard-delete can always be added later; soft-delete cannot be retrofitted without data loss.
- Add `updated_at` timestamp to listings. Automatically maintained by the ORM or database trigger. Free information, painful to add later.
- Add `taken_at TIMESTAMP NULL` — set when status changes to `taken`. Enables future auto-expiry logic.
- Store image as a key/path string, not a full URL. URLs change; keys don't. Derive the serving URL at query time.

**Phase to address:** Phase 1 (schema design). These are one-line additions during initial migration and months of regret if skipped.

---

## Moderate Pitfalls

---

### Pitfall 6: Mobile Form UX — The Photo Step Breaks the Flow

**What goes wrong:** On mobile, the photo upload field is the most friction-heavy step. If it is a plain `<input type="file">`, iOS Safari's file picker is slow, the selected filename is not visible, and there is no preview before submit. Many users will skip the photo or abandon the form.

**Why it happens:** Desktop-first form design. File inputs behave very differently across mobile browsers.

**Prevention:**
- Show an image preview immediately on file select (using `FileReader` or `URL.createObjectURL`) before the form is submitted. This is the single highest-impact mobile UX improvement for a listing form.
- Accept `capture="environment"` attribute on the file input to offer the camera as the default on mobile.
- Show a clear error state if the selected file is too large, before attempting the upload.
- Keep the form to a single scrollable page. Multi-step forms on mobile frequently lose state if the user switches to the camera app.
- After submit, show a loading indicator. Image uploads can take 2-5 seconds on mobile networks; without feedback, users tap submit twice, creating duplicate listings.

**Detection:** Users reporting "the photo thing didn't work" or duplicate listings appearing.

**Phase to address:** Phase 1 (listing creation form). The preview and loading state are table stakes for mobile, not polish.

---

### Pitfall 7: Admin Login With No Brute-Force Protection

**What goes wrong:** The admin login endpoint accepts unlimited password attempts. On a publicly-accessible app (the invite link leaks, or someone discovers the admin URL), a simple script can brute-force the admin password in minutes.

**Why it happens:** It is "just for me and my friends."

**Prevention:**
- Rate-limit the admin login endpoint aggressively: 5 attempts per IP per 15 minutes, with exponential backoff.
- Use bcrypt (cost factor 12) for the admin password hash, not plain text or MD5.
- The admin login URL should not be `/admin` or `/login` — use an obscure path. This is not real security but reduces automated scanning noise.
- Set a session cookie with `HttpOnly`, `Secure`, `SameSite=Strict` flags.
- Set a short admin session lifetime (e.g., 4 hours) and require re-authentication.

**Phase to address:** Phase 1 (admin auth). Session config and rate limiting are trivial to add at build time and painful to retrofit.

---

### Pitfall 8: Contact Information Is Publicly Accessible Without Any Friction

**What goes wrong:** Every poster's phone number or email is stored in the database and rendered in full on every listing card. Anyone with the invite link (or who discovers it) can scrape all contact information from all listings with a single HTTP request.

**Why it happens:** "Only friends will have the link" — which is true until it isn't.

**Consequences:**
- If the link leaks, all posters' contact info is exposed to whoever found it
- Contact info in the HTML is trivially scraped by bots

**Prevention:**
- This is a design constraint of the project (contact info in listings is a requirement), so the primary mitigation is the invite link quality (see Pitfall 1) and the link rotation capability.
- Consider displaying contact info only after a "reveal" tap/click (with no server round-trip needed — just a CSS show/hide). This prevents automated scraping with no friction to legitimate users.
- Document clearly in the UI that posted contact info is visible to everyone with the link.

**Phase to address:** Phase 1 for the invite link strength. The reveal pattern is a low-effort Phase 1 or Phase 2 addition.

---

### Pitfall 9: No CSRF Protection on State-Changing Endpoints

**What goes wrong:** The mark-as-taken and listing creation endpoints accept POST requests with no CSRF token. A malicious link (sent to a friend as "look at this deal") can silently submit a form to your app in the background if the invite URL is known.

**Why it happens:** CSRF feels like an enterprise concern for a friend app.

**Prevention:**
- Use the SameSite cookie attribute on the session/invite cookie (`SameSite=Strict` or `Lax`). For a standard form-based app this is sufficient CSRF protection without a token.
- If using stateless (cookie-free) invite link validation via a URL token in the path, CSRF is not applicable in the traditional sense, but verify the `Origin` or `Referer` header on POST requests.

**Phase to address:** Phase 1. One attribute on the cookie, or one header check.

---

### Pitfall 10: Images Served From the Same Origin as the App

**What goes wrong:** User-uploaded images are served from the same domain as the application. If the Content-Type is ever wrong (e.g., an uploaded SVG with embedded script, or an HTML file), the browser executes it in the application's origin, allowing XSS.

**Prevention:**
- Serve images from a different origin (object storage bucket domain or a subdomain like `static.yourapp.com`). This is automatic with R2/S3.
- Set `Content-Security-Policy` headers on the main app that do not allow inline scripts.
- Never serve uploaded files from the same origin as the app without strict Content-Type enforcement.

**Phase to address:** Phase 1. An architectural choice that is very hard to change post-launch.

---

## Minor Pitfalls

---

### Pitfall 11: Listing Creation Succeeds but Image Upload Fails Silently

**What goes wrong:** The listing record is created in the database before the image upload to object storage completes. If the upload fails (network error, storage quota), the listing exists with a broken image reference and no way to fix it from the UI.

**Prevention:**
- Upload the image first, get the storage key, then insert the listing record. Treat the entire operation as a unit: if image upload fails, the listing is not created and an error is shown.
- Alternatively, use a two-phase approach with `image_pending` status, but this is overengineered for this scale.

**Phase to address:** Phase 1 (listing creation flow).

---

### Pitfall 12: Missing `loading="lazy"` on Listing Images

**What goes wrong:** The browse page loads all listing photos simultaneously. With 20-30 listings, this can be several hundred KB to multiple MB of images loading on a mobile connection, causing a slow initial paint and layout shift.

**Prevention:**
- Add `loading="lazy"` to all `<img>` tags on the browse page. One attribute, significant impact on mobile.
- Set explicit `width` and `height` attributes (or `aspect-ratio` CSS) on image containers to prevent layout shift.
- Consider serving resized thumbnails (via a transform URL on R2/Cloudflare Images, or a simple resize-on-upload step) rather than full-size photos on the browse page.

**Phase to address:** Phase 1 for lazy loading. Thumbnails are Phase 2 polish.

---

### Pitfall 13: No Listing Cap — Page Becomes Unusable Over Time

**What goes wrong:** Listings accumulate. After 6 months, there are 200 listings — most of them long-since taken. The browse page loads 200 items, most with `taken` status, and is no longer useful.

**Prevention:**
- Show only `active` (not taken/deleted) listings by default, with a "show taken items" toggle.
- Add an optional auto-expiry: listings older than 60 days auto-archive (easy with the `created_at` timestamp).
- A soft cap of "hide listings older than N days" can be added with a single query filter.

**Phase to address:** Phase 1 (query filter: active only). Auto-expiry is Phase 2.

---

### Pitfall 14: Deployment Platform Ephemeral Filesystem Assumption

**What goes wrong:** Developer tests image uploads locally (to disk), deploys to Render/Railway/Fly.io, and discovers that the `/uploads` directory is wiped on every redeploy, every dyno restart, or every deployment. This is platform-specific and not obvious from the platform documentation unless you look for it.

**Prevention:**
- This is already covered in Pitfall 3 (use object storage). The point here is: do not discover this on the platform's free tier after already having real data. Verify the persistence model of your chosen platform before accepting the first listing.
- Fly.io has persistent volumes but they require configuration. Render's free tier has ephemeral disk. Railway has ephemeral disk by default. All major platforms treat object storage as the recommended solution for user-uploaded files.

**Phase to address:** Phase 1 (before deployment). A 15-minute decision that prevents a painful data loss event.

---

## Phase-Specific Warning Map

| Phase Topic | Most Likely Pitfall | Mitigation |
|-------------|---------------------|------------|
| Invite-link auth middleware | Link token too short/guessable; no server-side validation on every request | Use 32-byte random token; validate in middleware |
| Listing creation form | No image preview on mobile; double-submit duplicates | Add preview + submit spinner before Phase 1 ships |
| Image upload pipeline | Local disk storage; no file type validation | Object storage (R2) + magic byte check, Phase 1 |
| DB schema design | Boolean status; no soft delete; no timestamps | Status enum, deleted_at, taken_at, updated_at |
| Mark-as-taken ownership | Name-match bypass by any user who knows the name | Edit token stored in localStorage at creation |
| Admin login | No rate limit; weak password storage | bcrypt + rate limit, Phase 1 |
| Browse page performance | All images load eagerly on mobile | loading="lazy" + active-only query filter |
| Deployment | Ephemeral filesystem loses images | Object storage decided before first deployment |

---

## Sources

- Confidence is HIGH for all security/auth pitfalls (well-documented OWASP patterns applied to this specific model)
- Confidence is HIGH for image upload pitfalls (multer/S3 ecosystem patterns, deployment platform behavior)
- Confidence is HIGH for schema recommendations (common ORM migration pain, well-documented)
- Confidence is MEDIUM for mobile UX specifics (iOS Safari file input behavior — known pattern, but browser behavior can change)
- No web search available during this research session; findings are based on training data current to August 2025
