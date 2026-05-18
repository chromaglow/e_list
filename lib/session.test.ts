// lib/session.test.ts — vitest tests for lib/session.ts
// Tests verifyAdminSession helper behaviors.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SignJWT } from 'jose'

// Mock server-only
vi.mock('server-only', () => ({}))

const validToken = 'a'.repeat(64)
const validSecret = Buffer.from('a'.repeat(32)).toString('base64')
const correctKey = new TextEncoder().encode(validSecret)
const wrongKey = new TextEncoder().encode('wrongwrongwrongwrongwrongwrongwrongwrong')

// Helper: create a valid HS256 JWT signed with the correct key
async function makeToken(
  payload: Record<string, unknown>,
  key: Uint8Array = correctKey,
  expiresIn = '4h'
): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key)
}

// Helper: create an expired JWT
async function makeExpiredToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now - 7200)
    .setExpirationTime(now - 3600) // expired 1 hour ago
    .sign(correctKey)
}

beforeEach(() => {
  vi.resetModules()
  process.env.INVITE_TOKEN = validToken
  process.env.SESSION_SECRET = validSecret
  process.env.TURSO_DATABASE_URL = 'libsql://REPLACE_ME.turso.io'
  process.env.TURSO_AUTH_TOKEN = 'REPLACE_ME'
  process.env.ADMIN_USERNAME = 'admin'
  process.env.ADMIN_PASSWORD_HASH = '$2b$12$' + 'a'.repeat(53)
  process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_real_token_abc123'
})

describe('lib/session.ts — verifyAdminSession', () => {
  it('returns payload with role=admin for a valid HS256 JWT', async () => {
    const { verifyAdminSession } = await import('./session')
    const token = await makeToken({ role: 'admin' })
    const result = await verifyAdminSession(token)
    expect(result).not.toBeNull()
    expect(result?.role).toBe('admin')
  })

  it('returns null for undefined input', async () => {
    const { verifyAdminSession } = await import('./session')
    expect(await verifyAdminSession(undefined)).toBeNull()
  })

  it('returns null for null input', async () => {
    const { verifyAdminSession } = await import('./session')
    expect(await verifyAdminSession(null)).toBeNull()
  })

  it('returns null for empty string', async () => {
    const { verifyAdminSession } = await import('./session')
    expect(await verifyAdminSession('')).toBeNull()
  })

  it('returns null for a malformed/garbage token', async () => {
    const { verifyAdminSession } = await import('./session')
    expect(await verifyAdminSession('not.a.valid.jwt.token')).toBeNull()
  })

  it('returns null for an expired JWT', async () => {
    const { verifyAdminSession } = await import('./session')
    const token = await makeExpiredToken()
    expect(await verifyAdminSession(token)).toBeNull()
  })

  it('returns null for a JWT signed with the wrong key', async () => {
    const { verifyAdminSession } = await import('./session')
    const token = await makeToken({ role: 'admin' }, wrongKey)
    expect(await verifyAdminSession(token)).toBeNull()
  })

  it('returns null for a JWT with alg:none (algorithm confusion attack)', async () => {
    const { verifyAdminSession } = await import('./session')
    // Craft a JWT header with alg:none
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')
    const algNoneToken = `${header}.${payload}.`
    expect(await verifyAdminSession(algNoneToken)).toBeNull()
  })

  it('does not export createAdminSession', async () => {
    const session = await import('./session')
    expect((session as Record<string, unknown>).createAdminSession).toBeUndefined()
  })

  it('does not export deleteAdminSession', async () => {
    const session = await import('./session')
    expect((session as Record<string, unknown>).deleteAdminSession).toBeUndefined()
  })
})
