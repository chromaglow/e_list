import 'server-only'
import { jwtVerify } from 'jose'
import { env } from '@/lib/env'

// lib/session.ts — jose JWT verification helper.
// createAdminSession() and deleteAdminSession() are added in Plan 03.
// This file only exports verifyAdminSession() which proxy.ts needs.

// Computed once at module scope — re-used on every verify call
const encodedKey = new TextEncoder().encode(env.SESSION_SECRET)

/**
 * Verify an admin session JWT.
 * Returns the payload (containing `role: 'admin'`) on success.
 * Returns null for any error: missing token, expired, wrong key,
 * wrong algorithm (alg:none or RS256 confusion), or malformed.
 *
 * @param token - The raw JWT string from the `admin_session` cookie
 */
export async function verifyAdminSession(
  token: string | undefined | null
): Promise<{ role: string } | null> {
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'], // T-01-04: explicit list defeats alg:none and algorithm confusion
    })
    return payload as { role: string }
  } catch {
    // Catches: JWTExpired, JWTInvalid, JWSSignatureVerificationFailed, etc.
    return null
  }
}
