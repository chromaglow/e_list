# Architecture Patterns

**Domain:** Private community marketplace (invite-link access, single admin)
**Project:** FriendSwap
**Researched:** 2026-05-17
**Confidence:** HIGH — patterns are well-established for this scale

---

## Recommended Architecture

A monolithic server-rendered web application with a minimal REST API surface. No SPA framework needed. Server renders HTML pages; JavaScript is used only for progressive enhancement (mobile UX, form interactions). A single process handles HTTP, business logic, and file storage.

```
Browser (mobile-first)
    |
    |  HTTP (GET/POST/multipart-form)
    v
Express / Fastify server
    |          |
    |          +-- Static files & uploaded images (/public/)
    |
    +-- Route handlers
    |       |
    |       +-- Listings CRUD
    |       +-- Admin auth & moderation
    |       +-- Image upload
    |
    +-- Data layer (SQLite via better-sqlite3)
            |
            +-- listings table
            +-- admin_sessions table (ephemeral)
```

This is intentionally NOT a microservice, NOT a separate frontend/backend, and NOT a SPA. At 5–20 users the operational overhead of those patterns produces zero benefit and meaningful complexity cost.

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Route layer | Maps HTTP verbs + paths to handlers, validates inputs, returns HTML or JSON | Browser, Middleware, Service layer |
| Middleware | Invite-token check (all routes), admin session check (admin routes), file upload parsing | Route layer |
| Listing service | Create, read, update status, delete listings; filename generation | Route layer, DB layer, Disk |
| Auth service | Admin login validation, session token issuance/revocation | Route layer, DB layer |
| DB layer | SQLite access via parameterized queries; no ORM needed at this scale | Listing service, Auth service |
| File storage | Local disk under `/uploads/`; filenames are UUID-based, not user-supplied | Listing service |
| Template layer | Server-side HTML rendering (Nunjucks, EJS, or similar) | Route layer |

**Strict boundary rules:**
- Route handlers do NOT touch the DB directly — they call service functions.
- Service functions do NOT render HTML — they return plain objects.
- File storage is managed only by Listing service, never directly by routes.

---

## Data Models

### listings

```sql
CREATE TABLE listings (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  description  TEXT    NOT NULL,
  photo_path   TEXT    NOT NULL,       -- relative path, e.g. "uploads/uuid.jpg"
  price        TEXT,                   -- nullable; stored as text ("Free", "$5", etc.)
  poster_name  TEXT    NOT NULL,
  contact_info TEXT    NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'active',  -- 'active' | 'taken' | 'sold'
  created_at   INTEGER NOT NULL,       -- Unix timestamp (milliseconds)
  -- No user FK — poster identity is poster_name + contact_info only
);
```

**Design notes:**
- `price` is TEXT not NUMERIC. Allows "Free", "$5", "£10 OBO" without a unit decision.
- `status` uses a CHECK constraint: `CHECK(status IN ('active','taken','sold'))`.
- No `updated_at` — status changes are append-friendly but a single timestamp is fine here.
- `photo_path` stores a relative path, not a URL. The server constructs the URL at render time, making storage location changes non-breaking.

### admin_sessions

```sql
CREATE TABLE admin_sessions (
  token      TEXT    PRIMARY KEY,      -- 32-byte random hex, generated at login
  created_at INTEGER NOT NULL,         -- Unix timestamp
  expires_at INTEGER NOT NULL          -- Unix timestamp; server enforces TTL
);
```

**Design notes:**
- Sessions are stored in DB (not in-memory) so a server restart does not log the admin out.
- TTL is enforced at read time (server checks `expires_at`), not via DB triggers.
- There is exactly one admin. No `admin_id` column needed.
- Sessions older than TTL are deleted lazily on the next admin request.

### No users table

The invite token is an environment variable (or config value), not a row in the DB. Middleware reads it from config and compares it to the URL path segment or query parameter on every request.

---

## Access Control Model

```
Public routes (require invite token in URL):
  GET  /[invite-token]/               — browse listings
  GET  /[invite-token]/new            — post a listing form
  POST /[invite-token]/listings       — submit new listing (multipart)
  POST /[invite-token]/listings/:id/status  — mark taken/sold (name+contact match)

Admin routes (require admin session cookie):
  GET  /admin/login                   — login form
  POST /admin/login                   — authenticate, set session cookie
  POST /admin/listings/:id/delete     — delete any listing
  POST /admin/logout                  — clear session

Static:
  GET  /uploads/:filename             — serve uploaded images
```

**Invite token placement:** Embed as a URL path prefix (e.g., `/abc123xyz/`), not a query string. Path-based tokens survive link sharing via iMessage, WhatsApp, etc., where query strings may get truncated or mangled. The token must be at least 24 random characters (use `crypto.randomBytes(16).toString('hex')`).

**"Mark as taken/sold" without accounts:** The poster submits their `name` + `contact_info` when marking. The server checks that these match the stored values for that listing (case-insensitive trim). This is low-security but appropriate — the listing is already visible to everyone with the link, so the threat model does not require cryptographic proof of identity.

---

## Data Flow

### Browsing listings

```
1. User clicks invite link
2. GET /[token]/
3. Middleware: token matches config? → pass | → 404
4. Route handler calls listing_service.getActive()
5. DB returns rows ordered by created_at DESC
6. Template renders listing cards with photo URLs
7. HTML response → browser
```

### Creating a listing

```
1. User submits multipart form (POST /[token]/listings)
2. Middleware: token check → pass | → 404
3. Middleware: multipart parser (multer/busboy) writes file to temp
4. Route handler validates fields (title, poster_name, contact_info required)
5. listing_service.create():
   a. Generates UUID filename
   b. Moves temp file to /uploads/<uuid>.<ext>
   c. Inserts row into listings table
6. Redirect to GET /[token]/ (Post-Redirect-Get pattern)
```

**Critical:** If DB insert fails after file write, the orphaned file must be cleaned up. Wrap step 5 so file deletion runs in the error path.

### Marking taken/sold

```
1. User submits form with name + contact
2. POST /[token]/listings/:id/status
3. listing_service.updateStatus():
   a. Fetch listing by ID
   b. Compare poster_name + contact_info (case-insensitive)
   c. Match? → UPDATE status
   d. No match? → Return error (re-render form with message)
4. Redirect to GET /[token]/
```

### Admin delete

```
1. Admin submits delete form
2. POST /admin/listings/:id/delete
3. Middleware: session cookie valid? → pass | → redirect /admin/login
4. listing_service.delete():
   a. Fetch listing (to get photo_path)
   b. DELETE row from DB
   c. Delete file from /uploads/
5. Redirect to admin listing view
```

---

## Image Storage

**Approach:** Local disk under `<project-root>/uploads/`.

**Rationale at this scale:** S3 or equivalent adds credentials, IAM policy, CORS config, egress costs, and SDK complexity. For 5–20 users posting a handful of items, local disk is correct. Migration to object storage is a one-function change (swap the `listing_service.create` file-write step) if the project ever outgrows a single server.

**Implementation details:**
- File size limit: 5 MB per upload (configurable in env).
- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp` — validated server-side.
- Filename: `<uuid-v4>.<original-extension>` — never use the user-supplied filename; it is a path traversal vector.
- Served as static files via Express `express.static('uploads')` with cache headers.
- On listing delete, the corresponding file is removed from disk synchronously before returning the redirect.

**Backup concern:** In production, `uploads/` must be included in any backup strategy. This is a deployment-level concern, flagged here for awareness.

---

## Suggested Build Order

Dependencies flow from data outward to UI. Build in this order to avoid rework:

### Step 1 — Foundation (no features yet)
- Project scaffold: server entry point, env config, SQLite connection
- DB schema: `listings` and `admin_sessions` tables, created on startup
- Invite-token middleware (reads from env, 404 on mismatch)
- Static file serving for `/uploads/`

**Why first:** Everything else depends on the DB and the access gate being in place.

### Step 2 — Listings read path
- `listing_service.getActive()` — query + return
- Browse page template (listing cards, mobile layout)
- GET `/[token]/` route

**Why second:** Gives an immediately visible result to validate the layout and data model before writes are introduced.

### Step 3 — Listings write path
- Multipart upload middleware (multer/busboy)
- `listing_service.create()` — file move + DB insert
- New listing form template
- GET/POST `/[token]/new` and `/[token]/listings` routes

**Why third:** Depends on Step 2's data model being stable.

### Step 4 — Status updates
- `listing_service.updateStatus()` — name+contact match logic
- Status form on listing card
- POST `/[token]/listings/:id/status` route

**Why fourth:** Depends on the listings write path; low-risk addition at this point.

### Step 5 — Admin
- `auth_service.login()` / `auth_service.validateSession()`
- `listing_service.delete()` — DB delete + file removal
- Admin login form + session cookie middleware
- Admin listing view template
- POST `/admin/login`, `/admin/logout`, `/admin/listings/:id/delete` routes

**Why last:** Admin is an operator tool, not user-facing. It depends on all listing data being in place, and keeping it last means the core user flow is fully working before adding moderation complexity.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate frontend/backend
**What:** React SPA calling a JSON API
**Why bad:** Doubles the codebase, adds CORS config, requires a build step, and brings no benefit at this scale. Server-rendered HTML is faster to ship and simpler to host.
**Instead:** Server-rendered templates with form submissions.

### Anti-Pattern 2: ORM over SQLite
**What:** Sequelize, Prisma, or TypeORM wrapping a 2-table SQLite DB
**Why bad:** Adds migration tooling, abstraction layers, and type-generation steps that outweigh the benefit for a schema this simple.
**Instead:** `better-sqlite3` with raw parameterized SQL. The full schema fits in one file.

### Anti-Pattern 3: JWT for admin sessions
**What:** Stateless JWT tokens stored in localStorage
**Why bad:** JWTs cannot be invalidated server-side (logout doesn't work), and localStorage is XSS-accessible.
**Instead:** Opaque session token in an HttpOnly cookie, stored in the `admin_sessions` table.

### Anti-Pattern 4: User-supplied filenames on disk
**What:** Saving uploads as `<originalFilename>` from the multipart form
**Why bad:** Path traversal vulnerability. A filename like `../server.js` can overwrite application files.
**Instead:** UUID-generated filenames always; discard the original name entirely.

### Anti-Pattern 5: Storing the invite token in the DB
**What:** Invite token as a DB row to allow rotation via UI
**Why bad:** Over-engineered for a single token. Creates a chicken-and-egg bootstrapping problem.
**Instead:** Env variable. Rotate by redeploying with a new value.

---

## Scalability Considerations

This architecture does not need to scale — that is a feature, not a limitation.

| Concern | At 5-20 users (target) | If it grew to 200+ users |
|---------|------------------------|--------------------------|
| DB | SQLite, no tuning needed | Migrate to Postgres (same SQL, driver swap) |
| File storage | Local disk | Swap file-write in `listing_service.create` to S3 SDK |
| Sessions | SQLite table | Same — or Redis if session reads become a bottleneck |
| Server | Single process, 512 MB RAM VPS | Add process manager (PM2); same code |
| Concurrency | SQLite write lock is fine at this scale | Postgres removes the write-lock concern |

Migration path from SQLite to Postgres is intentionally low-friction: `better-sqlite3` and `pg` share parameterized query syntax for the queries used here (INSERT, SELECT, UPDATE, DELETE). No ORM means no migration tooling to replace.

---

## Sources

- Architecture decisions are based on well-established Node.js monolith patterns (HIGH confidence — training data, no verification needed for this class of system)
- SQLite write-lock behavior: documented in SQLite WAL mode docs (HIGH confidence)
- Path traversal via user-supplied filenames: OWASP File Upload Cheat Sheet (HIGH confidence)
- HttpOnly cookie vs localStorage for session tokens: OWASP Session Management Cheat Sheet (HIGH confidence)
