# Phase 1: Foundation & Security Gate - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up a Next.js 15 App Router project from scratch and deliver a production-ready security foundation: invite-token middleware (64-char hex, validated on every request), Turso + Drizzle schema with full status/timestamp columns, a working Vercel Blob upload Route Handler with security controls, and admin login (bcrypt + JWT cookie). No listing creation or browse functionality beyond an empty styled shell. The app must be deployable to Vercel with no runtime errors on a cold request.

**Requires:** ACCS-01, ACCS-02, ADMN-01, ADMN-02

</domain>

<decisions>
## Implementation Decisions

### Admin Login URL Scope
- **D-01:** Admin login lives **inside** the invite gate. URL is `/{token}/admin/login`. Admin must have the invite URL to reach the login page.
- **D-02:** Admin JWT cookie persists through invite token rotations. Rotating the invite token only invalidates guest access — it does not log out an active admin session.
- **D-03:** Single `middleware.ts` with sequential checks: (1) validate invite token for all paths → 404 if token is missing or wrong; (2) for `/admin/*` paths, additionally check admin JWT cookie → redirect to `/{token}/admin/login` if missing or expired.

### Vercel Blob Wiring
- **D-04:** Phase 1 delivers a working `POST /api/upload` Route Handler — not just env var configuration. This is the highest-risk integration point and should be validated before listing logic is layered on top in Phase 2.
- **D-05:** Full security controls baked into the Phase 1 upload handler: magic byte validation (validate image type by file content, not Content-Type header), 8 MB max body, 1 file per request.
- **D-06:** Upload endpoint is protected by the invite token gate only (no admin session required). This matches Phase 2's use case where guests upload listing photos.

### Drizzle Schema Initialization
- **D-07:** Use `drizzle-kit generate` + `drizzle-kit migrate` from day one. SQL migration files are written to `/drizzle` folder and committed to git. `push` is not used.
- **D-08:** Migrations run automatically on every Vercel deploy — add `drizzle-kit migrate` to the Vercel build command. If no schema changed, it is a no-op.

### Empty Browse Page Fidelity
- **D-09:** Phase 1 delivers a **styled shell** — full header with "FriendSwap" app name, mobile-first Tailwind layout, and an empty state (e.g., "Nothing here yet"). Phase 2 drops listing cards into the existing grid area. No layout rework needed in Phase 2.
- **D-10:** Include a "Post an item" button as a **disabled/hidden placeholder** in the Phase 1 shell. Phase 2 wires it up. This validates mobile header/CTA placement in Phase 1 and avoids layout changes when Phase 2 arrives.

### Claude's Discretion
- Exact empty-state copy and styling (header font, color palette, spacing) — follow Tailwind defaults and shadcn/ui conventions.
- Whether the disabled "Post an item" button is visually hidden or visible-but-greyed-out — choose whichever is cleaner given the shell context.
- Specific Next.js route layout structure (root layout + slot vs. nested layouts) — follow App Router conventions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements & Roadmap
- `.planning/ROADMAP.md` — Phase 1 goal, requirements list (ACCS-01, ACCS-02, ADMN-01, ADMN-02), success criteria
- `.planning/REQUIREMENTS.md` — Full requirement definitions for ACCS-01, ACCS-02, ADMN-01, ADMN-02
- `CLAUDE.md` — Security requirements (invite token, bcrypt cost, cookie flags, image upload controls), schema notes, deployment notes — **read this first**

### Architecture & Stack
- `.planning/research/SUMMARY.md` — Stack decisions, architecture approach, feature prioritization, confidence assessment
- `.planning/research/ARCHITECTURE.md` — Component breakdown, data flow, middleware responsibilities

### Security & Pitfalls
- `.planning/research/PITFALLS.md` — Critical pitfalls to avoid (invite link security, image upload abuse, weak schema decisions, local disk storage)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — this is a greenfield project. `create-next-app` scaffold is the starting point.

### Established Patterns
- None yet — this phase establishes the patterns that future phases inherit.

### Integration Points
- Phase 2 will add listing cards to the browse page grid area established in Phase 1.
- Phase 2 will call the `POST /api/upload` Route Handler built in Phase 1.
- Phase 3 will use the admin session middleware established in Phase 1 for delete and invite-rotation actions.

</code_context>

<specifics>
## Specific Ideas

- Invite token sits as a dynamic URL segment prefix: `/{token}/...` — the Next.js App Router dynamic segment `[token]` captures it, middleware validates it before the route handler runs.
- The `middleware.ts` matcher should cover all routes including `/api/*` to ensure the invite gate applies to the upload endpoint.
- Drizzle schema must include: `listings` table with `id`, `title`, `description`, `price` (nullable), `poster_name`, `contact_info`, `photo_key` (storage key, not full URL), `edit_token`, `status` enum (`'active' | 'taken' | 'deleted'`), `created_at`, `updated_at`, `taken_at` (nullable), `deleted_at` (nullable). Also `admin_sessions` table if needed for session tracking (or rely solely on the JWT cookie — JWT is stateless so a sessions table may not be required).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Foundation & Security Gate*
*Context gathered: 2026-05-17*
