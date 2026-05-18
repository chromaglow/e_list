# FriendSwap — Handoff Document

**Created:** 2026-05-18  
**Context:** Phase 01 execution paused — build tooling issue on low-RAM machine; resuming on a higher-RAM machine.

---

## What Was Accomplished

### Phase 01 — Plan 01-01: Complete (code only, build pending)

All code for Plan 01-01 has been written and verified. **53/53 vitest tests pass.** All plan acceptance criteria are met. The only outstanding item is `npm run build` which hangs due to a Tailwind v4 PostCSS issue specific to this machine (see below).

**Files created by Plan 01-01:**

| File | Purpose |
|------|---------|
| `proxy.ts` | Invite-gate + admin JWT middleware (sequential checks, constant-time compare) |
| `lib/env.ts` | Typed env loader for ALL 7 env vars — Wave 2 plans never modify this |
| `lib/session.ts` | `verifyAdminSession()` jose JWT helper (HS256-locked) |
| `lib/env.test.ts` | 31 vitest tests covering all 7 env var validators |
| `lib/session.test.ts` | vitest tests for verifyAdminSession |
| `proxy.test.ts` | 15+ vitest tests covering invite gate + admin JWT gate |
| `app/layout.tsx` | Root layout with Geist font, viewport meta, FriendSwap metadata |
| `app/globals.css` | Tailwind v4 CSS with shadcn theme variables |
| `app/not-found.tsx` | Branded 404 page rendered by proxy on invalid token |
| `app/[token]/layout.tsx` | Minimal pass-through token-scoped layout |
| `app/[token]/page.tsx` | Empty browse shell (`force-dynamic`) |
| `components/shell/AppHeader.tsx` | Sticky header with FriendSwap brand + disabled "Post an item" button |
| `components/shell/EmptyState.tsx` | "Nothing here yet" empty state |
| `components/ui/button.tsx` | shadcn Button primitive |
| `scripts/gen-invite-token.js` | One-off 64-hex-char token generator |
| `.env.local` | Real INVITE_TOKEN + SESSION_SECRET + placeholders (gitignored) |
| `.env.example` | Full 7-var env contract with generation instructions |
| `package.json` | All pinned deps per RESEARCH.md |
| `tsconfig.json` | strict: true, @/* alias |
| `vitest.config.ts` | Vitest configuration |
| `components.json` | shadcn/ui configuration |
| `postcss.config.mjs` | @tailwindcss/postcss config |

---

## The Build Issue (Must Fix on New Machine)

### Root Cause

The project lives at `/home/kettu888/` (the user's home directory), which is **also the git root**. Tailwind v4 auto-detects the project boundary by walking up to the nearest `.git` directory — so it considers the entire home directory as the "project" and tries to scan **~76,000 files** for Tailwind utility class names.

Result: the PostCSS worker (`node postcss.js`) consumes **5–7 GB RAM** and **700%+ CPU** and never completes.

### Fix — Before Running `npm run build`

**Option A (recommended): Add `@source` restriction in globals.css**

The file `app/globals.css` already has `@source` directives. Verify they exist and are correct:

```css
@source "../{app,components,lib,scripts}/**/*.{js,ts,jsx,tsx,mdx}";
```

If the build still hangs, also add this to `postcss.config.mjs`:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

And check: does the new machine have the project in a dedicated directory (not directly in `~/`)? If so, the issue won't occur.

**Option B (cleanest): Move project to a subdirectory**

If the new machine clones into `~/projects/friendswap/` or any path where the git root is bounded to just the project files, Tailwind v4 auto-detection will work correctly and the build will complete normally.

**Option C: Set `NODE_OPTIONS` memory limit**

If the scan is genuinely necessary, give the PostCSS worker more memory:
```bash
NODE_OPTIONS='--max-old-space-size=16384' npm run build
```

### Verification After Build Fix

Once `npm run build` exits 0, run these checks:

```bash
# Tests
npm test  # must show 53 passed

# Static guards
test ! -f middleware.ts && echo "OK: no middleware.ts"
grep -q 'timingSafeEqual' proxy.ts && echo "OK: T-01-01"
grep -q "algorithms: \['HS256'\]" lib/session.ts && echo "OK: T-01-04"
grep -q "NextResponse.rewrite(new URL('/not-found'" proxy.ts && echo "OK: T-01-02"

# 7-var env contract
for V in INVITE_TOKEN SESSION_SECRET TURSO_DATABASE_URL TURSO_AUTH_TOKEN ADMIN_USERNAME ADMIN_PASSWORD_HASH BLOB_READ_WRITE_TOKEN; do
  grep -q "$V" lib/env.ts && echo "OK: $V" || echo "FAIL: $V"
done
```

### Human Verification (Task 06 of Plan 01-01)

Once the build passes, do this manual check:

```bash
npm run dev &
TOKEN=$(grep '^INVITE_TOKEN=' .env.local | cut -d= -f2)

curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/         # expect 404
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/$TOKEN/  # expect 200
curl -s http://localhost:3000/$TOKEN/ | grep -c 'FriendSwap'            # expect >=1
curl -s http://localhost:3000/$TOKEN/ | grep -c 'Nothing here yet'      # expect >=1
```

Open `http://localhost:3000/$TOKEN/` in mobile viewport — confirm: sticky header, "FriendSwap" text, "Post an item" button (disabled/greyed), "Nothing here yet" text.

---

## How to Resume Execution

```bash
# 1. Clone and install
git clone https://github.com/chromaglow/e_list.git friendswap
cd friendswap
npm install

# 2. Copy env (the .env.local is NOT committed — you'll need to recreate it)
cp .env.example .env.local
# Edit .env.local:
#   INVITE_TOKEN: node scripts/gen-invite-token.js
#   SESSION_SECRET: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
#   Leave TURSO_*, ADMIN_*, BLOB_* as placeholders for now

# 3. Verify build works
npm run build  # should exit 0 on a machine with the project in its own directory

# 4. Complete Plan 01-01 human verification (Task 06), then commit
git add -A
git commit -m "feat(01-01): scaffold Next.js 16 foundation + invite gate"

# 5. Resume Phase 01 execution at Plan 01-02
# In Claude Code:
/gsd:execute-phase 1 --interactive
# (It will skip 01-01 once SUMMARY.md exists, or you can create it manually)
```

---

## Phase 01 Remaining Plans

| Plan | Wave | Status | What It Builds |
|------|------|--------|----------------|
| 01-01 | 1 | Code done, build pending | Next.js skeleton, invite gate, shell |
| 01-02 | 2 | Not started | Drizzle + Turso schema + migrations |
| 01-03 | 2 | Not started | Auth primitives (bcrypt, jose, rate-limit) |
| 01-04 | 2 | Not started | Vercel Blob upload route |
| 01-03b | 3 | Not started | Admin login/logout routes + UI |
| 01-05 | 4 | Not started | Vercel deploy + cold-start verification |

Wave 2 plans (01-02, 01-03, 01-04) each have user setup requirements:
- **01-02**: Needs Turso account + real `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
- **01-03**: Needs `ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH` (run `node scripts/gen-hash.js <password>` — this script is created by Plan 01-03)
- **01-04**: Needs Vercel project + Blob store + `BLOB_READ_WRITE_TOKEN`

---

## Security Notes

- `INVITE_TOKEN` in `.env.local`: `996a8b5459064607336a2a6e22bc58e8a6d0f56e62f33a71d6e4796d5a0eaf96` (64 hex chars, real value, gitignored)
- `SESSION_SECRET` in `.env.local`: real base64 value, gitignored
- **The `.env.local` file is NOT pushed to GitHub.** On the new machine, generate fresh values with the scripts in the repo.

---

## Key Architecture Decisions Already Locked

| Decision | Choice |
|----------|--------|
| Access gate | `proxy.ts` at repo root (NOT `middleware.ts`) with `timingSafeEqual` + `NextResponse.rewrite('/not-found')` |
| JWT | HS256-only via jose, SESSION_SECRET required ≥32 bytes |
| Env vars | All 7 declared in `lib/env.ts` — Wave 2 plans never modify this file |
| Shell | Mobile-first, sticky header, force-dynamic, all Server Components |
| Admin gate | `/admin/*` paths (except `/admin/login`) require valid `admin_session` JWT cookie |

See `.planning/phases/01-foundation-security-gate/SKELETON.md` for the full locked decision table.
