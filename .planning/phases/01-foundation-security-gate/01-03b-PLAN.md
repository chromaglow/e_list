---
phase: 01-foundation-security-gate
plan: 03b
type: execute
wave: 3
depends_on:
  - 01-01
  - 01-03
files_modified:
  - app/[token]/api/admin/login/route.ts
  - app/[token]/api/admin/login/route.test.ts
  - app/[token]/api/admin/logout/route.ts
  - app/[token]/api/admin/logout/route.test.ts
  - app/[token]/admin/page.tsx
  - app/[token]/admin/login/page.tsx
  - components/admin/LoginForm.tsx
  - components/admin/LogoutButton.tsx
autonomous: false
requirements:
  - ADMN-02
tags:
  - auth
  - routes
  - admin-ui
  - constant-time
user_setup: []
must_haves:
  truths:
    - "POST /{token}/api/admin/login with correct username + password returns 200 + Set-Cookie: admin_session=<jose-jwt>; HttpOnly; SameSite=Strict; Secure; Path=/"
    - "POST /{token}/api/admin/login with wrong username returns 401"
    - "POST /{token}/api/admin/login with wrong password returns 401"
    - "POST /{token}/api/admin/login with wrong username STILL invokes bcrypt.compare (against a constant dummy hash so success/failure timing is indistinguishable per T-03-03 — CLAUDE.md-implied constant-time auth)"
    - "POST /{token}/api/admin/login is rate-limited to 5 attempts per 15-minute window per IP (6th attempt returns 429)"
    - "POST /{token}/api/admin/logout clears the admin_session cookie (Set-Cookie: admin_session=; Max-Age=0)"
    - "/{token}/admin/login renders the login form even when no admin cookie is present (per D-01)"
    - "/{token}/admin renders the admin landing page only when a valid admin_session cookie is set; missing/invalid cookie redirects to /{token}/admin/login (enforced by proxy.ts from Plan 01)"
    - "Session JWT has expiry <= 4 hours from issuance and uses HS256"
    - "Login response body never echoes the password or hash"
    - "Plan 01's proxy.ts is NOT modified (additive plan — Plan 01 already wired admin gating; proxy gates /{token}/api/admin/* because segments[0] === INVITE_TOKEN matches)"
    - "Admin login/logout routes live UNDER the [token] dynamic segment so Plan 01's proxy.ts gates them; placing them at app/api/admin/* would bypass the proxy (segments[0] would be 'api', not INVITE_TOKEN) and 404"
  artifacts:
    - path: "app/[token]/api/admin/login/route.ts"
      provides: "POST handler — rate-limit + bcrypt.compare (constant-time) + createAdminSession (lives under [token] so proxy.ts gates it per Plan 01 matcher)"
    - path: "app/[token]/api/admin/logout/route.ts"
      provides: "POST handler — deleteAdminSession (lives under [token] so proxy.ts gates it)"
    - path: "app/[token]/admin/login/page.tsx"
      provides: "Server Component rendering the LoginForm client component; passes params.token to LoginForm as a prop"
    - path: "app/[token]/admin/page.tsx"
      provides: "Server Component admin landing — reads admin_session cookie and verifies before render (DAL defense-in-depth per T-03-08); passes params.token to LogoutButton"
    - path: "components/admin/LoginForm.tsx"
      provides: "Client Component — receives token prop, POSTs to /{token}/api/admin/login with username/password"
    - path: "components/admin/LogoutButton.tsx"
      provides: "Client Component — receives token prop, POSTs to /{token}/api/admin/logout and redirects to /{token}/admin/login"
  key_links:
    - from: "app/[token]/api/admin/login/route.ts"
      to: "lib/session.ts"
      via: "createAdminSession() call after successful bcrypt.compare (Plan 03)"
      pattern: "createAdminSession"
    - from: "app/[token]/api/admin/login/route.ts"
      to: "lib/rate-limit.ts"
      via: "checkRateLimit(ip) before any password work (Plan 03)"
      pattern: "checkRateLimit"
    - from: "app/[token]/api/admin/login/route.ts"
      to: "bcryptjs"
      via: "compare(password, env.ADMIN_PASSWORD_HASH) — always runs even on username mismatch (T-03-03)"
      pattern: "compare\\("
    - from: "app/[token]/admin/page.tsx"
      to: "lib/session.ts"
      via: "verifyAdminSession at data access layer (defense in depth — proxy.ts already gated, but DAL re-verifies per RESEARCH.md Architectural Responsibility Map)"
      pattern: "verifyAdminSession"
    - from: "components/admin/LoginForm.tsx"
      to: "app/[token]/api/admin/login/route.ts"
      via: "fetch(`/${token}/api/admin/login`, ...) where token is received as a prop from the page Server Component"
      pattern: "/\\$\\{token\\}/api/admin/login"
    - from: "components/admin/LogoutButton.tsx"
      to: "app/[token]/api/admin/logout/route.ts"
      via: "fetch(`/${token}/api/admin/logout`, ...) where token is received as a prop from the page Server Component"
      pattern: "/\\$\\{token\\}/api/admin/logout"
---

<objective>
Compose Plan 03's auth primitives (createAdminSession/deleteAdminSession, checkRateLimit, loginSchema) into the admin login vertical slice: POST /{token}/api/admin/login (rate-limit + constant-time bcrypt + cookie issuance), POST /{token}/api/admin/logout, the `/{token}/admin/login` form page, and the `/{token}/admin` landing page with DAL re-verification.

This plan is the SECOND half of the split formerly known as Plan 01-03 (revised 2026-05-17 per checker WARNING 4 — original 10-task plan exceeded the 5-task threshold). It runs in Wave 3 (depends on Plan 01 + Plan 03).

**Critical routing fix (revision 2026-05-17):** Admin login/logout routes MUST live UNDER the `[token]` dynamic segment (`app/[token]/api/admin/login/route.ts` and `app/[token]/api/admin/logout/route.ts`). Placing them at `app/api/admin/...` would bypass Plan 01's proxy.ts gate because `segments[0]` would be the literal string `"api"`, NOT the INVITE_TOKEN — the proxy would 404 the routes and ADMN-01/ADMN-02 would be unreachable. The LoginForm and LogoutButton client components receive the `token` value as a prop from their parent Server Component (which reads `params.token` per Next.js 16 async params) and construct the fetch URL as `/${token}/api/admin/login` and `/${token}/api/admin/logout` respectively.

Purpose: Close ADMN-02 (jose JWT in HttpOnly SameSite=Strict cookie via real login flow) and complete the ADMN-01 user-facing surface that Plan 03 began. T-03-03 constant-time defense is implemented HERE (in the route handler) — the primitive `bcrypt.compare` lives in bcryptjs from Plan 03, but the always-call-it-even-on-username-mismatch logic is in this route handler.

Output: End-to-end login flow: form -> route -> cookie -> protected page -> logout. Plan 01's proxy.ts is NOT modified.

Implements: D-01 (login URL inside invite gate at /{token}/admin/login), D-03 partial (proxy admin check already in place from Plan 01; this plan supplies the cookie it checks).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/phases/01-foundation-security-gate/01-CONTEXT.md
@.planning/phases/01-foundation-security-gate/01-RESEARCH.md
@.planning/phases/01-foundation-security-gate/SKELETON.md
@.planning/phases/01-foundation-security-gate/01-01-PLAN.md
@.planning/phases/01-foundation-security-gate/01-03-PLAN.md
@lib/env.ts
@lib/session.ts
@lib/rate-limit.ts
@lib/admin-validators.ts
@proxy.ts
</context>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser form -> /{token}/api/admin/login | Untrusted credentials cross here; bcrypt + rate-limit applied; proxy gate already verified the invite token before this handler runs |
| Cookie -> Server (subsequent requests) | jose jwtVerify with HS256 algorithm lock (via verifyAdminSession from Plan 01) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-01 | Elevation of Privilege | /{token}/api/admin/login brute force | mitigate | checkRateLimit(ip) (Plan 03) called BEFORE any password work; 5 attempts per 15 min per IP via x-forwarded-for; 6th returns 429 |
| T-03-03 | Spoofing | Username enumeration via timing | mitigate | Always run bcrypt.compare even when username mismatches (compare provided password against env.ADMIN_PASSWORD_HASH regardless of username match) so success/failure timing is constant. Final auth = usernameMatches AND passwordMatches. |
| T-03-05 | Information Disclosure | Password in logs | mitigate | Route handler never console.logs request body; error responses are generic "Invalid credentials"; no stack traces sent to client |
| T-03-08 | Elevation of Privilege | Defense-in-depth on admin landing | mitigate | app/[token]/admin/page.tsx re-verifies cookie at DAL even though proxy.ts already gated (RESEARCH.md Architectural Responsibility Map row "Admin JWT verification" — primary proxy, secondary DAL) |
| T-03-10 | Elevation of Privilege | Admin routes placed outside [token] segment bypass proxy | mitigate | Routes are mounted under app/[token]/api/admin/* so segments[0] === INVITE_TOKEN matches Plan 01's proxy gate; placing them at app/api/admin/* would 404 (proxy would treat 'api' as the candidate token); enforced by acceptance criteria + grep guards in verify blocks |
</threat_model>

<tasks>

<task type="auto" tdd="true">
  <name>Task 01: Build POST /{token}/api/admin/login route handler (rate-limit + constant-time bcrypt + cookie issuance)</name>
  <files>app/[token]/api/admin/login/route.ts, app/[token]/api/admin/login/route.test.ts</files>
  <read_first>
    - .planning/phases/01-foundation-security-gate/01-RESEARCH.md (Pattern 3 — Admin Login Route Handler — full code; note T-03-03 constant-time guidance)
    - lib/session.ts (Plan 03 — createAdminSession)
    - lib/rate-limit.ts (Plan 03 — checkRateLimit)
    - lib/admin-validators.ts (Plan 03 — loginSchema)
    - lib/env.ts (Plan 01 — env.ADMIN_USERNAME, env.ADMIN_PASSWORD_HASH already validated)
    - CLAUDE.md (Security Requirements — rate limit, bcrypt cost, cookie flags)
    - This plan's must_haves "constant-time" truth — T-03-03 mitigation is in THIS file
    - SKELETON.md (Directory Layout — admin login route is at app/[token]/api/admin/login/route.ts, NOT app/api/admin/login/route.ts)
  </read_first>
  <behavior>
    - POST with { username: 'admin', password: '<correct>' } returns 200 + Response.json({ success: true }) AND createAdminSession was called (cookie set via the side effect)
    - POST with { username: 'admin', password: '<wrong>' } returns 401 + { error: 'Invalid credentials' } AND createAdminSession was NOT called
    - POST with { username: 'wrongname', password: '<correct>' } returns 401 + { error: 'Invalid credentials' } AND bcrypt.compare WAS still invoked (constant-time defense — verified via spy)
    - POST with malformed JSON body returns 400 + { error: 'Invalid request' }
    - POST that fails zod validation (empty username) returns 400 + { error: 'Invalid request' }
    - 6th POST from same x-forwarded-for ip within window returns 429 + { error: 'Too many attempts' }
    - Successful login + verify round-trip: cookie set is decodable by verifyAdminSession
    - Response body NEVER contains the password, the hash, or a stack trace
    - Route file lives at app/[token]/api/admin/login/route.ts (NOT app/api/admin/login/route.ts — that path would be 404'd by proxy.ts since segments[0] would be 'api')
  </behavior>
  <action>
    Create the route file at the EXACT path `app/[token]/api/admin/login/route.ts` (the `[token]` dynamic segment is what causes Plan 01's proxy.ts matcher to gate this route — its first path segment is the invite token, not the literal string 'api'). Do NOT create a file at `app/api/admin/login/route.ts`; that would bypass the proxy and 404.

    Imports: `import { compare } from 'bcryptjs'; import { createAdminSession } from '@/lib/session'; import { checkRateLimit } from '@/lib/rate-limit'; import { loginSchema } from '@/lib/admin-validators'; import { env } from '@/lib/env'`. Export `export async function POST(request: Request)`. Logic in order: (1) Extract ip from `request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'`. (2) `if (!checkRateLimit(ip)) return Response.json({ error: 'Too many attempts' }, { status: 429 })`. (3) Parse JSON inside try/catch; on parse failure return 400. (4) Validate with `loginSchema.safeParse(json)`; on failure return 400 with generic message. (5) Username check: `const usernameMatches = data.username === env.ADMIN_USERNAME`. (6) ALWAYS run bcrypt.compare even on username mismatch (use env.ADMIN_PASSWORD_HASH for both branches) — store result, AND with usernameMatches at the end (T-03-03 constant-time). (7) If !valid return 401 with `{ error: 'Invalid credentials' }`. (8) Else `await createAdminSession()` then return 200 `{ success: true }`. Write `app/[token]/api/admin/login/route.test.ts` (co-located with the route) using vitest with mocks for `@/lib/env`, `@/lib/rate-limit`, `@/lib/session`, and a known bcrypt hash. Use the Request constructor to build inputs. Include an explicit test that spies on `compare` and asserts it is called even when `usernameMatches === false` (the constant-time test).
  </action>
  <verify>
    <automated>npm test -- app/\[token\]/api/admin/login/route.test.ts 2>&1 | tee /tmp/t03b-01.log | grep -qE '(Test Files +[0-9]+ passed|✓.*passed)' && test -f app/\[token\]/api/admin/login/route.ts && test ! -f app/api/admin/login/route.ts && grep -q 'export async function POST' app/\[token\]/api/admin/login/route.ts && grep -q 'checkRateLimit' app/\[token\]/api/admin/login/route.ts && grep -q 'compare(' app/\[token\]/api/admin/login/route.ts && grep -q 'createAdminSession' app/\[token\]/api/admin/login/route.ts && grep -q "status: 429" app/\[token\]/api/admin/login/route.ts && grep -q "status: 401" app/\[token\]/api/admin/login/route.ts && ! grep -qE 'console\.log\(.*(password|hash|req\.body)' app/\[token\]/api/admin/login/route.ts</automated>
  </verify>
  <acceptance_criteria>
    - File `app/[token]/api/admin/login/route.ts` exists (under the [token] dynamic segment)
    - File `app/api/admin/login/route.ts` does NOT exist (would bypass proxy.ts gate and 404)
    - Co-located test file `app/[token]/api/admin/login/route.test.ts` exists
    - File exports `POST` (no `GET`/`PUT`/`DELETE` exports)
    - `checkRateLimit` is called before bcrypt.compare (order verified by reading the file)
    - bcrypt.compare is called unconditionally after rate-limit pass (T-03-03)
    - Returns 429 on rate-limit hit, 400 on bad input, 401 on bad credentials, 200 on success
    - createAdminSession is only called on successful match
    - No `console.log` references to `password`, `hash`, or `req.body` (T-03-05)
    - Test file explicitly verifies the constant-time property (compare is invoked even when username does not match)
    - `npm test -- app/[token]/api/admin/login/route.test.ts` exits 0 with >= 8 cases green
  </acceptance_criteria>
  <done>Login endpoint at the [token]-gated path implements rate-limit + constant-time auth + cookie issuance + generic error responses; full route-handler unit tests green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 02: Build POST /{token}/api/admin/logout route handler</name>
  <files>app/[token]/api/admin/logout/route.ts, app/[token]/api/admin/logout/route.test.ts</files>
  <read_first>
    - lib/session.ts (Plan 03 — deleteAdminSession)
    - app/[token]/api/admin/login/route.ts (Task 01 — response pattern reference; same [token]-gated location convention)
    - SKELETON.md (Directory Layout — admin logout route is at app/[token]/api/admin/logout/route.ts, NOT app/api/admin/logout/route.ts)
  </read_first>
  <behavior>
    - POST returns 200 + { success: true } regardless of whether a cookie was present
    - deleteAdminSession is called exactly once
    - Does NOT require a valid admin session to call (idempotent; logging out a non-session is a no-op)
    - Route file lives at app/[token]/api/admin/logout/route.ts (NOT app/api/admin/logout/route.ts — same proxy gate reasoning as Task 01)
  </behavior>
  <action>
    Create the route file at the EXACT path `app/[token]/api/admin/logout/route.ts` (under the `[token]` dynamic segment so Plan 01's proxy.ts gates it). Do NOT create a file at `app/api/admin/logout/route.ts`. File contents: `import { deleteAdminSession } from '@/lib/session'; export async function POST() { await deleteAdminSession(); return Response.json({ success: true }) }`. Write a co-located test at `app/[token]/api/admin/logout/route.test.ts` that mocks deleteAdminSession and confirms it is called.
  </action>
  <verify>
    <automated>npm test -- app/\[token\]/api/admin/logout/route.test.ts 2>&1 | tee /tmp/t03b-02.log | grep -qE '(Test Files +[0-9]+ passed|✓.*passed)' && test -f app/\[token\]/api/admin/logout/route.ts && test ! -f app/api/admin/logout/route.ts && grep -q 'deleteAdminSession' app/\[token\]/api/admin/logout/route.ts && grep -q 'export async function POST' app/\[token\]/api/admin/logout/route.ts</automated>
  </verify>
  <acceptance_criteria>
    - File `app/[token]/api/admin/logout/route.ts` exists (under the [token] dynamic segment)
    - File `app/api/admin/logout/route.ts` does NOT exist (would bypass proxy.ts gate and 404)
    - Co-located test file `app/[token]/api/admin/logout/route.test.ts` exists
    - Exports POST only
    - Calls deleteAdminSession exactly once
    - Returns 200 + JSON success body
    - Test confirms idempotency (calling twice still returns 200)
  </acceptance_criteria>
  <done>Logout route at the [token]-gated path is a one-line wrapper that clears the cookie; trivial but completes the auth surface.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 03: Build LoginForm client component + login page Server Component (passes token prop)</name>
  <files>components/admin/LoginForm.tsx, app/[token]/admin/login/page.tsx</files>
  <read_first>
    - app/[token]/page.tsx (Plan 01 — Server Component conventions, Tailwind classes; pattern for `await params`)
    - components/ui/button.tsx (Plan 01 — shadcn Button)
    - lib/admin-validators.ts (Plan 03 — loginSchema is the source of truth for field shape)
    - .planning/phases/01-foundation-security-gate/01-CONTEXT.md (D-01 — login URL is /{token}/admin/login)
    - app/[token]/api/admin/login/route.ts (Task 01 — the route LoginForm posts to; full path is `/${token}/api/admin/login`)
  </read_first>
  <action>
    Create `components/admin/LoginForm.tsx` as a Client Component (`'use client'`). The component receives the invite token via props (`{ token: string }`) — the parent Server Component (`app/[token]/admin/login/page.tsx`) reads `params.token` per Next.js 16 async params and passes it down. The token is needed because the login API route lives at `/{token}/api/admin/login` (under the [token] segment so Plan 01's proxy gates it). State: useState for username, password, submitting (boolean), error (string|null). On submit: preventDefault, set submitting=true, POST to `` `/${token}/api/admin/login` `` (template literal interpolating the token prop) with JSON body, parse response; on 200 redirect to `` `/${token}/admin` `` via `window.location.href = ...` (intentional full reload so the Server Component on the next page reads the freshly-set cookie); on 401/429 set error to a friendly message ("Invalid credentials" or "Too many attempts — try again later"); on 400 set error to "Please enter both fields"; on network error set error to "Could not reach server". Use shadcn Button for submit, native `<input type="text">` and `<input type="password">` with Tailwind classes for the fields. Show error inline below the form. Disable the Submit button while submitting and show "Signing in..." label. Wrap the whole form in a centered card matching the EmptyState styling from Plan 01 (max-w-screen-sm, etc.). Create `app/[token]/admin/login/page.tsx` as a Server Component that awaits the `params` promise (Next.js 16: `params` is async — `const { token } = await params`), then renders `<><AppHeader /><main><LoginForm token={token} /></main></>` — explicitly forwarding the token prop.
  </action>
  <verify>
    <automated>grep -q "'use client'" components/admin/LoginForm.tsx && grep -qE 'fetch\(`/\$\{token\}/api/admin/login`' components/admin/LoginForm.tsx && grep -q "method: 'POST'" components/admin/LoginForm.tsx && grep -q 'token: string' components/admin/LoginForm.tsx && grep -q "type=\"password\"" components/admin/LoginForm.tsx && ! grep -qE "fetch\('/api/admin/login'" components/admin/LoginForm.tsx && grep -L "'use client'" app/\[token\]/admin/login/page.tsx && grep -q 'await params' app/\[token\]/admin/login/page.tsx && grep -q 'LoginForm token={token}' app/\[token\]/admin/login/page.tsx && npm run build 2>&1 | tee /tmp/t03b-03.log | grep -qE 'Compiled successfully|✓ Compiled'</automated>
  </verify>
  <acceptance_criteria>
    - `components/admin/LoginForm.tsx` has `'use client'` directive on line 1
    - LoginForm declares a `token: string` prop (verified by `grep -q 'token: string' components/admin/LoginForm.tsx`)
    - LoginForm POSTs to `` `/${token}/api/admin/login` `` using a template literal interpolating the token prop (verified by regex; bare `/api/admin/login` POSTs are forbidden because they would 404 through the proxy)
    - LoginForm handles 401, 429, 400, and network error branches with distinct user-visible messages
    - LoginForm submit button is disabled while submitting (verified by `grep -c 'disabled={submitting' components/admin/LoginForm.tsx`)
    - `app/[token]/admin/login/page.tsx` is a Server Component (no `'use client'`)
    - Login page awaits `params` per Next.js 16 async params requirement
    - Login page passes the token down: `<LoginForm token={token} />` literal present
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>Login page reachable at /{token}/admin/login, form posts to /{token}/api/admin/login via the token prop, error states wired, build clean.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 04: Build /[token]/admin landing page (DAL verify — defense in depth) + LogoutButton (with token prop)</name>
  <files>app/[token]/admin/page.tsx, components/admin/LogoutButton.tsx</files>
  <read_first>
    - lib/session.ts (verifyAdminSession from Plan 01)
    - proxy.ts (Plan 01 — admin paths already gated at the proxy layer; this DAL check is per RESEARCH.md Architectural Responsibility Map "secondary tier")
    - .planning/phases/01-foundation-security-gate/01-RESEARCH.md (Architectural Responsibility Map — Admin JWT verification: Primary Proxy, Secondary Server Component/Route Handler)
    - app/[token]/page.tsx (Plan 01 — Server Component pattern for params)
    - app/[token]/api/admin/logout/route.ts (Task 02 — the route LogoutButton posts to; full path is `/${token}/api/admin/logout`)
  </read_first>
  <action>
    Create `app/[token]/admin/page.tsx` as a Server Component. `import { cookies } from 'next/headers'; import { redirect } from 'next/navigation'; import { verifyAdminSession } from '@/lib/session'; import { AppHeader } from '@/components/shell/AppHeader'`. Export default async function: `const { token } = await params; const sessionCookie = (await cookies()).get('admin_session')?.value; const session = await verifyAdminSession(sessionCookie); if (!session) redirect(\`/${token}/admin/login\`)`. Render `<><AppHeader /><main class="..."><h2>Admin</h2><p>Logged in as admin.</p><LogoutButton token={token} /></main></>` — explicitly forwarding the token prop to LogoutButton so it can construct the logout URL. Set `export const dynamic = 'force-dynamic'` so the cookie check runs per-request and is not statically cached.

    Create `components/admin/LogoutButton.tsx` as a Client Component (`'use client'`). Declare a `token: string` prop. POSTs to `` `/${token}/api/admin/logout` `` (template literal interpolating the prop — same proxy-gate reasoning as LoginForm), then on success redirects to `` `/${token}/admin/login` `` via `window.location.href`. Do NOT post to the bare `/api/admin/logout` path (would 404). The page intentionally has minimal admin content — Phase 3 (ADMN-03 delete, ADMN-04 rotate) will extend it.
  </action>
  <verify>
    <automated>grep -q 'verifyAdminSession' app/\[token\]/admin/page.tsx && grep -q 'redirect' app/\[token\]/admin/page.tsx && grep -q "force-dynamic" app/\[token\]/admin/page.tsx && grep -q 'await params' app/\[token\]/admin/page.tsx && grep -q 'LogoutButton token={token}' app/\[token\]/admin/page.tsx && grep -L "'use client'" app/\[token\]/admin/page.tsx && test -f components/admin/LogoutButton.tsx && grep -q "'use client'" components/admin/LogoutButton.tsx && grep -q 'token: string' components/admin/LogoutButton.tsx && grep -qE '/\$\{token\}/api/admin/logout' components/admin/LogoutButton.tsx && ! grep -qE "fetch\('/api/admin/logout'" components/admin/LogoutButton.tsx && npm run build 2>&1 | tee /tmp/t03b-04.log | grep -qE 'Compiled successfully|✓ Compiled'</automated>
  </verify>
  <acceptance_criteria>
    - `app/[token]/admin/page.tsx` is a Server Component (no `'use client'`)
    - Reads `admin_session` cookie via `(await cookies()).get('admin_session')?.value`
    - Calls `verifyAdminSession` on the value
    - Redirects to `/{token}/admin/login` when session is null (defense in depth — T-03-08)
    - Sets `export const dynamic = 'force-dynamic'`
    - Passes the token down to LogoutButton: `<LogoutButton token={token} />` literal present
    - `components/admin/LogoutButton.tsx` exists as a Client Component
    - LogoutButton declares a `token: string` prop
    - LogoutButton POSTs to `` `/${token}/api/admin/logout` `` (template literal; bare `/api/admin/logout` is forbidden)
    - LogoutButton then redirects to `/{token}/admin/login` on success
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>Admin landing page renders only with valid session; DAL re-verify in place per Architectural Responsibility Map; logout button posts to the [token]-gated logout route and redirects correctly.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 05: Human verification — full admin login + logout flow on localhost</name>
  <what-built>
    Admin login at /{token}/admin/login (form posts JSON to /{token}/api/admin/login under the [token] gate), bcrypt+rate-limit+constant-time auth, jose JWT issued in HttpOnly SameSite=Strict cookie, admin landing at /{token}/admin gated by proxy AND DAL re-verify, logout at /{token}/api/admin/logout clears cookie. Vertical slice: form -> [token]-gated API -> cookie -> protected page -> [token]-gated logout.
  </what-built>
  <how-to-verify>
    1. Restart dev server: `npm run dev`
    2. Read TOKEN: `TOKEN=$(grep '^INVITE_TOKEN=' .env.local | cut -d= -f2)`
    3. Read your admin password from your password manager (the plaintext you used in Plan 03 Task 02 / scripts/gen-hash.js)
    4. Confirm bare /api/admin/login is 404 (the route does NOT exist at that path — it lives under [token] so the proxy gates it):
       - `curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/admin/login -H 'Content-Type: application/json' -d '{}'` -> EXPECT 404
       - `curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/admin/logout` -> EXPECT 404
    5. Run these curl commands against the [token]-gated paths and confirm:
       - `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/$TOKEN/admin/login`                                   -> EXPECT 200
       - `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/$TOKEN/admin`                                          -> EXPECT 307 (redirect to /login)
       - `curl -s -X POST http://localhost:3000/$TOKEN/api/admin/login -H 'Content-Type: application/json' -d '{}' -o /dev/null -w "%{http_code}\n"` -> EXPECT 400
       - `curl -s -X POST http://localhost:3000/$TOKEN/api/admin/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"WRONG"}' -o /dev/null -w "%{http_code}\n"` -> EXPECT 401
       - For loop 6 times: `for i in $(seq 1 6); do curl -s -X POST http://localhost:3000/$TOKEN/api/admin/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"WRONG"}' -o /dev/null -w "Attempt $i: %{http_code}\n"; done` -> EXPECT 401,401,401,401,401,429 (or similar — 5 then 429)
       - Wait 16 minutes OR restart `npm run dev` to reset the in-memory limiter
       - `curl -i -X POST http://localhost:3000/$TOKEN/api/admin/login -H 'Content-Type: application/json' -d "{\"username\":\"admin\",\"password\":\"<YOUR-REAL-PASSWORD>\"}" | grep -i 'set-cookie'` -> EXPECT a Set-Cookie line containing `admin_session=`, `HttpOnly`, `SameSite=Strict`, `Path=/`
       - Save that cookie to a file: `curl -c /tmp/cookies.txt -X POST http://localhost:3000/$TOKEN/api/admin/login -H 'Content-Type: application/json' -d "{\"username\":\"admin\",\"password\":\"<PW>\"}"` then `curl -b /tmp/cookies.txt -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/$TOKEN/admin` -> EXPECT 200
       - `curl -b /tmp/cookies.txt -s http://localhost:3000/$TOKEN/admin | grep -c 'Logged in as admin'` -> EXPECT >= 1
       - `curl -b /tmp/cookies.txt -X POST http://localhost:3000/$TOKEN/api/admin/logout -i | grep -i 'set-cookie'` -> EXPECT a Set-Cookie line clearing admin_session (Max-Age=0 or empty value)
    6. In a real browser:
       a. Open http://localhost:3000/$TOKEN/admin/login — confirm the form renders, mobile-friendly, no horizontal scroll on 375px viewport
       b. Open DevTools -> Network. Submit the form with wrong credentials. Confirm the POST request goes to `/$TOKEN/api/admin/login` (NOT `/api/admin/login`). Confirm "Invalid credentials" appears inline.
       c. Submit correct credentials — confirm redirect to /$TOKEN/admin and "Logged in as admin" visible
       d. Click "Log out" — confirm the POST goes to `/$TOKEN/api/admin/logout` (NOT `/api/admin/logout`); confirm redirect back to login page
       e. Open DevTools -> Application -> Cookies: confirm `admin_session` cookie has HttpOnly checked, SameSite=Strict
    7. Confirm proxy unchanged: `git diff proxy.ts` should show NO changes from Plan 01 (this plan + Plan 03 extended lib/session.ts only)
    8. Confirm route file location: `test -f app/\[token\]/api/admin/login/route.ts && test -f app/\[token\]/api/admin/logout/route.ts && test ! -f app/api/admin/login/route.ts && test ! -f app/api/admin/logout/route.ts` -> EXPECT exit 0
    9. Constant-time sanity check (optional): the bcrypt.compare-on-username-mismatch property is unit-tested in Task 01 — no manual timing check required here.
  </how-to-verify>
  <resume-signal>Type "approved" if every curl + browser step matches expected output, or describe which step failed.</resume-signal>
</task>

</tasks>

<verification>

## Plan-Level Automated Verification

```bash
npm test
npm run build

# Route file location guards (BLOCKER 1 fix — routes MUST live under [token] so proxy.ts gates them):
test -f app/\[token\]/api/admin/login/route.ts                              # route under [token]
test -f app/\[token\]/api/admin/logout/route.ts                             # route under [token]
test ! -f app/api/admin/login/route.ts                                       # MUST NOT exist (would bypass proxy and 404)
test ! -f app/api/admin/logout/route.ts                                      # MUST NOT exist (would bypass proxy and 404)

# Client-component fetch target audit — must reference /${token}/api/... (with template literal token interpolation):
grep -qE '/\$\{token\}/api/admin/login' components/admin/LoginForm.tsx       # required
grep -qE '/\$\{token\}/api/admin/logout' components/admin/LogoutButton.tsx   # required
! grep -qE "fetch\('/api/admin/login'" components/admin/LoginForm.tsx        # bare path forbidden
! grep -qE "fetch\('/api/admin/logout'" components/admin/LogoutButton.tsx    # bare path forbidden

# Constant-time + rate-limit audit on login route:
grep -c 'checkRateLimit' app/\[token\]/api/admin/login/route.ts             # >= 1
grep -c 'compare(' app/\[token\]/api/admin/login/route.ts                   # >= 1 (bcrypt.compare always runs)
grep -c 'status: 429' app/\[token\]/api/admin/login/route.ts                # >= 1

# Defense-in-depth: admin page re-verifies
grep -c 'verifyAdminSession' app/\[token\]/admin/page.tsx                   # >= 1

# Token prop wiring (Server Component -> Client Component):
grep -c 'LoginForm token={token}' app/\[token\]/admin/login/page.tsx        # >= 1
grep -c 'LogoutButton token={token}' app/\[token\]/admin/page.tsx           # >= 1
grep -c 'token: string' components/admin/LoginForm.tsx                      # >= 1
grep -c 'token: string' components/admin/LogoutButton.tsx                   # >= 1

# Proxy + env unchanged:
git diff proxy.ts | wc -l                                                   # exactly 0
git diff lib/env.ts | wc -l                                                 # exactly 0
```

## Human Verification

See Task 05 — end-to-end login + logout flow with cookie inspection and route path verification.

</verification>

<success_criteria>

- ADMN-02 satisfied: session is a jose-signed HS256 JWT in a cookie with httpOnly=true, sameSite=strict, secure=true (production), path=/, 4h expiry. Real login flow exercises the cookie issuance.
- ADMN-01 closed in full (Plan 03 supplied the hash storage half; this plan supplies the login flow that exercises it).
- D-01 satisfied: login at /{token}/admin/login (inside the invite gate); admin API routes ALSO live inside the invite gate at /{token}/api/admin/* per the routing fix; proxy.ts skip rule from Plan 01 lets the login page through without a session cookie.
- D-03 satisfied: cookie attributes set by createAdminSession match what proxy.ts expects.
- T-03-03 mitigated: bcrypt.compare runs on every well-formed request, so username-mismatch and password-mismatch take indistinguishable time (unit-tested in Task 01).
- T-03-01 mitigated: rate-limit cap of 5 attempts / 15 min per IP enforced via checkRateLimit (Plan 03 primitive).
- T-03-08 mitigated: admin landing page re-verifies cookie at DAL even though proxy already gated.
- T-03-10 mitigated: admin routes live under [token] segment; bare `/api/admin/*` paths do NOT exist (proxy would 404 them).
- Plan 01's proxy.ts file is unchanged (`git diff proxy.ts | wc -l` == 0) — confirms additive contract.
- Plan 01's lib/env.ts file is unchanged.

</success_criteria>

<output>
Create `.planning/phases/01-foundation-security-gate/01-03b-SUMMARY.md` when done with:
- Confirmation proxy.ts was NOT modified (additive plan contract held)
- Confirmation lib/env.ts was NOT modified
- Confirmation route files live at app/[token]/api/admin/login/route.ts and app/[token]/api/admin/logout/route.ts (NOT app/api/admin/*)
- The exact response shapes for /{token}/api/admin/login (200/400/401/429) so Phase 3 can compose against them
- Cookie attributes as set by createAdminSession (verified live)
- Decision IDs implemented: D-01 (login URL inside invite gate), D-03 (cookie attributes match proxy expectations)
- Requirements closed: ADMN-02 (jose JWT in HttpOnly SameSite=Strict cookie); ADMN-01 (login flow half — hash storage half closed by Plan 03)
- Hand-off to Phase 3: import createAdminSession (already exported in lib/session.ts via Plan 03), DO NOT modify the route handlers (Phase 3's delete + rotate live in their own routes — also under /{token}/api/admin/* for consistency)
</output>
