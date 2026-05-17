# Phase 1: Foundation & Security Gate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 1-Foundation & Security Gate
**Areas discussed:** Admin login URL scope, Vercel Blob wiring depth, Drizzle schema initialization, Empty browse page fidelity

---

## Admin Login URL Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Inside the invite gate | `/{token}/admin/login` — admin must have invite URL to reach login; login page hidden from URL scanners | ✓ |
| Outside the invite gate | `/admin/login` — publicly reachable, protected by bcrypt + rate limiting | |
| You decide | Claude picks based on security/UX tradeoffs | |

**User's choice:** Inside the invite gate

---

| Option | Description | Selected |
|--------|-------------|----------|
| Admin session persists after token rotation | Rotating invite token only invalidates guests; admin JWT stays valid | ✓ |
| Token rotation also invalidates admin session | Nuclear option — rotating link logs out everyone including admin | |

**User's choice:** Admin session persists after token rotation

---

| Option | Description | Selected |
|--------|-------------|----------|
| Single middleware, sequential checks | One `middleware.ts`: (1) invite token check, (2) admin JWT check for `/admin/*` paths | ✓ |
| Two separate middlewares | Cleaner separation but Next.js 15 only supports one `middleware.ts` | |

**User's choice:** Single middleware, sequential checks

---

## Vercel Blob Wiring Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Env vars + smoke test only | Just configure `BLOB_READ_WRITE_TOKEN`; upload Route Handler is Phase 2's job | |
| Upload Route Handler too | Build `POST /api/upload` in Phase 1 to validate the highest-risk integration | ✓ |

**User's choice:** Upload Route Handler too

---

| Option | Description | Selected |
|--------|-------------|----------|
| Full security controls in Phase 1 | Magic byte validation, 8 MB limit, 1 file max baked in from the start | ✓ |
| Basic handler, security in Phase 2 | Phase 1 confirms Blob works; Phase 2 adds validation with the listing form | |

**User's choice:** Full security controls in Phase 1

---

| Option | Description | Selected |
|--------|-------------|----------|
| Invite token gate only | Upload reachable by anyone with the invite URL — matches Phase 2 guest use case | ✓ |
| Admin session required | Requires valid admin JWT to upload; too restrictive for Phase 2 guest listing creation | |

**User's choice:** Invite token gate only

---

## Drizzle Schema Initialization

| Option | Description | Selected |
|--------|-------------|----------|
| generate + migrate from day one | SQL migration files in `/drizzle`, committed to git; full audit trail | ✓ |
| drizzle-kit push | Directly syncs schema to Turso; no migration files generated | |
| Push locally, migrate for prod | Two mental modes to manage; best of both but adds cognitive overhead | |

**User's choice:** generate + migrate from day one

**Notes:** User asked for ELI5 explanations of all three options before deciding. The audit trail and ability to recreate the DB from git history were the deciding factors.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-migrate on Vercel build | Add `drizzle-kit migrate` to build command; always in sync; no-op if schema unchanged | ✓ |
| Manual one-time run | Run locally once; simpler but easy to forget on future schema changes | |

**User's choice:** Auto-migrate on Vercel build

---

## Empty Browse Page Fidelity

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal stub | Heading + "No listings yet"; proves the gate works; Phase 2 builds full shell | |
| Styled shell | Full header, Tailwind layout, empty state; Phase 2 drops cards into existing grid | ✓ |

**User's choice:** Styled shell

---

| Option | Description | Selected |
|--------|-------------|----------|
| Include button (disabled/hidden) | Placeholder CTA validates mobile layout in Phase 1; Phase 2 just wires it up | ✓ |
| Phase 2 adds it | Cleaner Phase 1 scope; Phase 2 owns the full posting flow including entry point | |

**User's choice:** Include the button, disabled or hidden

---

## Claude's Discretion

- Exact empty-state copy and styling (header font, color palette, spacing)
- Whether the disabled "Post an item" button is visible-but-greyed or fully hidden
- Next.js App Router route layout structure

## Deferred Ideas

None — discussion stayed within Phase 1 scope.
