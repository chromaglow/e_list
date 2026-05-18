import 'server-only'
import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'
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
export async function createAdminSession(): Promise<void> {
  const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000)
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('4h')
    .sign(encodedKey)
  const cookieStore = await cookies()
  cookieStore.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expiresAt,
    path: '/',
  })
}

export async function deleteAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
}

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
