export const runtime = 'nodejs'

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
 *   T-01-02: NextResponse.rewrite('/_not-found') — preserves URL, returns 404
 *   T-01-04: verifyAdminSession uses algorithms:['HS256'] — no alg:none or confusion
 *   T-01-05: /admin/login path is reachable without admin JWT (segments[2] !== 'login' guard)
 *
 * Token caching (T-03-15):
 *   getInviteToken() reads from DB with 60s TTL; falls back to env.INVITE_TOKEN if no DB row.
 */

// ── Module-level invite token cache (60s TTL) ──────────────────────────────
let tokenCache: { value: string; expiresAt: number } | null = null
const CACHE_TTL_MS = 60_000

/**
 * Returns the current invite token, preferring the DB-stored value with a 60s cache.
 * Falls back to env.INVITE_TOKEN if the settings table has no invite_token row (Pitfall 6 guard).
 */
async function getInviteToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.value
  }

  try {
    const { db } = await import('@/lib/db')
    const { settings } = await import('@/lib/schema')
    const { eq } = await import('drizzle-orm')

    const dbQuery = db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, 'invite_token'))
      .get()

    // 3s timeout — if Turso is slow/unavailable, fall back to env var rather than hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DB timeout')), 3000)
    )

    const row = await Promise.race([dbQuery, timeoutPromise])
    const value = row?.value ?? env.INVITE_TOKEN
    tokenCache = { value, expiresAt: Date.now() + CACHE_TTL_MS }
    return value
  } catch {
    // DB unavailable or timed out — fall back to env var (T-03-15)
    return env.INVITE_TOKEN
  }
}

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
    const expectedToken = await getInviteToken()
    const a = Buffer.from(urlToken, 'hex')
    const b = Buffer.from(expectedToken, 'hex')
    if (urlToken.length === expectedToken.length && urlToken.length > 0) {
      tokenMatch = timingSafeEqual(a, b)
    }
  } catch {
    tokenMatch = false
  }

  if (!tokenMatch) {
    // Rewrite to /_not-found with explicit 404 status (T-01-02).
    // URL stays unchanged in the browser; /_not-found renders app/not-found.tsx.
    return NextResponse.rewrite(new URL('/_not-found', request.url), { status: 404 })
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
        new URL(`/${await getInviteToken()}/admin/login`, request.url)
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.webp|.*\\.ico).*)'],
}
