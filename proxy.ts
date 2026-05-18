import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { env } from '@/lib/env'
import { verifyAdminSession } from '@/lib/session'

/**
 * proxy.ts — FriendSwap invite gate + admin JWT check.
 *
 * Sequential checks per D-03:
 *   1. Validate invite token on ALL paths (→ 404 on mismatch)
 *   2. Validate admin JWT on /admin/* paths (→ redirect to /{token}/admin/login if missing/expired)
 *
 * Security:
 *   T-01-01: timingSafeEqual for constant-time comparison
 *   T-01-02: NextResponse.rewrite('/not-found') — preserves URL, returns 404
 *   T-01-04: verifyAdminSession uses algorithms:['HS256'] — no alg:none or confusion
 *   T-01-05: /admin/login path is reachable without admin JWT (segments[2] !== 'login' guard)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Check 1: Invite token gate (all paths) ──────────────────────────────
  // URL structure: /{token}/... — first path segment is the invite token
  const segments = pathname.split('/').filter(Boolean)
  const urlToken = segments[0] ?? ''

  // Constant-time comparison (T-01-01)
  // timingSafeEqual throws if buffer lengths differ — catch and treat as mismatch
  let tokenMatch = false
  try {
    const expectedToken = env.INVITE_TOKEN
    const a = Buffer.from(urlToken, 'hex')
    const b = Buffer.from(expectedToken, 'hex')
    if (urlToken.length === expectedToken.length && urlToken.length > 0) {
      tokenMatch = timingSafeEqual(a, b)
    }
  } catch {
    tokenMatch = false
  }

  if (!tokenMatch) {
    // Rewrite to /not-found — renders app/not-found.tsx with 404 status,
    // URL unchanged (T-01-02). Rewrite is the reliable approach for this runtime.
    return NextResponse.rewrite(new URL('/not-found', request.url))
  }

  // ── Check 2: Admin session gate (admin paths only, excluding login) ──────
  // Per D-01 + T-01-05: the login page itself must be reachable without a JWT
  // (segments[2] === 'login' is the login page: /{token}/admin/login)
  const isAdminPath = segments[1] === 'admin' && segments[2] !== 'login'
  if (isAdminPath) {
    const sessionCookie = request.cookies.get('admin_session')?.value
    const payload = await verifyAdminSession(sessionCookie)
    if (!payload) {
      return NextResponse.redirect(
        new URL(`/${env.INVITE_TOKEN}/admin/login`, request.url)
      )
    }
  }

  return NextResponse.next()
}

/**
 * Matcher: apply proxy to ALL requests EXCEPT static assets.
 * This ensures /api/* routes are also gated — they live under
 * app/[token]/api/... so segments[0] will be the token (D-03).
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
}
