// lib/env.test.ts — vitest tests for lib/env.ts
// Covers ALL seven env var getters.
// This file is the COMPLETE test suite — Plans 02/03/04 will NOT add tests here.

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock server-only so it doesn't throw in test environment
vi.mock('server-only', () => ({}))

const validToken = 'a'.repeat(64) // 64 lowercase hex chars
const validSecret = Buffer.from('a'.repeat(32)).toString('base64') // 32 bytes base64
const validHash = '$2b$12$' + 'a'.repeat(53) // bcrypt format, cost 12

// We reset module registry before each test to clear the per-process cache
// and allow process.env mutations to take effect cleanly
beforeEach(() => {
  vi.resetModules()
  // Set a valid baseline for all vars to avoid cascade failures
  process.env.INVITE_TOKEN = validToken
  process.env.SESSION_SECRET = validSecret
  process.env.TURSO_DATABASE_URL = 'libsql://REPLACE_ME.turso.io'
  process.env.TURSO_AUTH_TOKEN = 'REPLACE_ME'
  process.env.ADMIN_USERNAME = 'admin'
  process.env.ADMIN_PASSWORD_HASH = validHash
  process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_real_token_abc123'
})

describe('lib/env.ts', () => {
  describe('INVITE_TOKEN', () => {
    it('returns value when set to 64 lowercase hex chars', async () => {
      const { env } = await import('./env')
      expect(env.INVITE_TOKEN).toBe(validToken)
    })

    it('throws when INVITE_TOKEN is missing', async () => {
      delete process.env.INVITE_TOKEN
      const { env } = await import('./env')
      expect(() => env.INVITE_TOKEN).toThrow(/INVITE_TOKEN/)
    })

    it('throws with message containing "missing" or "required" when unset', async () => {
      delete process.env.INVITE_TOKEN
      const { env } = await import('./env')
      expect(() => env.INVITE_TOKEN).toThrow(/missing|required/i)
    })

    it('throws when INVITE_TOKEN is too short (not 64 chars)', async () => {
      process.env.INVITE_TOKEN = 'abc123'
      const { env } = await import('./env')
      expect(() => env.INVITE_TOKEN).toThrow(/64 hex chars/)
    })

    it('throws when INVITE_TOKEN has uppercase chars (not lowercase hex)', async () => {
      process.env.INVITE_TOKEN = 'A'.repeat(64)
      const { env } = await import('./env')
      expect(() => env.INVITE_TOKEN).toThrow(/INVITE_TOKEN/)
    })

    it('throws when INVITE_TOKEN is 63 chars (one short of 64)', async () => {
      process.env.INVITE_TOKEN = 'a'.repeat(63)
      const { env } = await import('./env')
      expect(() => env.INVITE_TOKEN).toThrow()
    })
  })

  describe('SESSION_SECRET', () => {
    it('returns value when base64 decodes to >= 32 bytes', async () => {
      const { env } = await import('./env')
      expect(env.SESSION_SECRET).toBe(validSecret)
    })

    it('throws when SESSION_SECRET is missing', async () => {
      delete process.env.SESSION_SECRET
      const { env } = await import('./env')
      expect(() => env.SESSION_SECRET).toThrow(/SESSION_SECRET/)
    })

    it('throws when SESSION_SECRET base64 decodes to < 32 bytes', async () => {
      // 5 bytes encoded as base64
      process.env.SESSION_SECRET = Buffer.from('short').toString('base64')
      const { env } = await import('./env')
      expect(() => env.SESSION_SECRET).toThrow(/SESSION_SECRET/)
    })
  })

  describe('TURSO_DATABASE_URL', () => {
    it('accepts libsql:// scheme', async () => {
      process.env.TURSO_DATABASE_URL = 'libsql://mydb.turso.io'
      const { env } = await import('./env')
      expect(env.TURSO_DATABASE_URL).toBe('libsql://mydb.turso.io')
    })

    it('accepts the placeholder libsql://REPLACE_ME.turso.io (format-valid)', async () => {
      process.env.TURSO_DATABASE_URL = 'libsql://REPLACE_ME.turso.io'
      const { env } = await import('./env')
      expect(env.TURSO_DATABASE_URL).toBe('libsql://REPLACE_ME.turso.io')
    })

    it('accepts https:// scheme', async () => {
      process.env.TURSO_DATABASE_URL = 'https://mydb.turso.io'
      const { env } = await import('./env')
      expect(env.TURSO_DATABASE_URL).toBe('https://mydb.turso.io')
    })

    it('throws when TURSO_DATABASE_URL is missing', async () => {
      delete process.env.TURSO_DATABASE_URL
      const { env } = await import('./env')
      expect(() => env.TURSO_DATABASE_URL).toThrow(/TURSO_DATABASE_URL/)
    })

    it('throws when scheme is invalid (not libsql/http/https)', async () => {
      process.env.TURSO_DATABASE_URL = 'mysql://host'
      const { env } = await import('./env')
      expect(() => env.TURSO_DATABASE_URL).toThrow(/TURSO_DATABASE_URL/)
    })
  })

  describe('TURSO_AUTH_TOKEN', () => {
    it('returns value when set to any non-empty string', async () => {
      process.env.TURSO_AUTH_TOKEN = 'REPLACE_ME'
      const { env } = await import('./env')
      expect(env.TURSO_AUTH_TOKEN).toBe('REPLACE_ME')
    })

    it('throws when TURSO_AUTH_TOKEN is missing', async () => {
      delete process.env.TURSO_AUTH_TOKEN
      const { env } = await import('./env')
      expect(() => env.TURSO_AUTH_TOKEN).toThrow(/TURSO_AUTH_TOKEN/)
    })
  })

  describe('ADMIN_USERNAME', () => {
    it('returns value when set to non-empty string', async () => {
      process.env.ADMIN_USERNAME = 'admin'
      const { env } = await import('./env')
      expect(env.ADMIN_USERNAME).toBe('admin')
    })

    it('throws when ADMIN_USERNAME is missing', async () => {
      delete process.env.ADMIN_USERNAME
      const { env } = await import('./env')
      expect(() => env.ADMIN_USERNAME).toThrow(/ADMIN_USERNAME/)
    })
  })

  describe('ADMIN_PASSWORD_HASH', () => {
    it('returns value when set to a valid bcrypt hash cost 12', async () => {
      process.env.ADMIN_PASSWORD_HASH = validHash
      const { env } = await import('./env')
      expect(env.ADMIN_PASSWORD_HASH).toBe(validHash)
    })

    it('returns value for cost 13 hash', async () => {
      const hash13 = '$2b$13$' + 'a'.repeat(53)
      process.env.ADMIN_PASSWORD_HASH = hash13
      const { env } = await import('./env')
      expect(env.ADMIN_PASSWORD_HASH).toBe(hash13)
    })

    it('throws when ADMIN_PASSWORD_HASH is the placeholder REPLACE_ME_in_plan_03', async () => {
      process.env.ADMIN_PASSWORD_HASH = 'REPLACE_ME_in_plan_03'
      const { env } = await import('./env')
      expect(() => env.ADMIN_PASSWORD_HASH).toThrow(/ADMIN_PASSWORD_HASH/)
    })

    it('throws when cost is below 12 (cost 10)', async () => {
      process.env.ADMIN_PASSWORD_HASH = '$2b$10$' + 'a'.repeat(53)
      const { env } = await import('./env')
      expect(() => env.ADMIN_PASSWORD_HASH).toThrow(/ADMIN_PASSWORD_HASH/)
    })

    it('throws when cost is 11', async () => {
      process.env.ADMIN_PASSWORD_HASH = '$2b$11$' + 'a'.repeat(53)
      const { env } = await import('./env')
      expect(() => env.ADMIN_PASSWORD_HASH).toThrow(/ADMIN_PASSWORD_HASH/)
    })

    it('throws when missing', async () => {
      delete process.env.ADMIN_PASSWORD_HASH
      const { env } = await import('./env')
      expect(() => env.ADMIN_PASSWORD_HASH).toThrow(/ADMIN_PASSWORD_HASH/)
    })
  })

  describe('BLOB_READ_WRITE_TOKEN', () => {
    it('returns value when set to a real non-placeholder token', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_real_token_abc123'
      const { env } = await import('./env')
      expect(env.BLOB_READ_WRITE_TOKEN).toBe('vercel_blob_rw_real_token_abc123')
    })

    it('throws when BLOB_READ_WRITE_TOKEN is the placeholder REPLACE_ME_in_plan_04', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'REPLACE_ME_in_plan_04'
      const { env } = await import('./env')
      expect(() => env.BLOB_READ_WRITE_TOKEN).toThrow(/BLOB_READ_WRITE_TOKEN/)
    })

    it('throws when BLOB_READ_WRITE_TOKEN is missing', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN
      const { env } = await import('./env')
      expect(() => env.BLOB_READ_WRITE_TOKEN).toThrow(/BLOB_READ_WRITE_TOKEN/)
    })
  })
})
