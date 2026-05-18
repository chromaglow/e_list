import 'server-only'

// lib/env.ts — typed env var loader for ALL seven env vars.
// This is the SINGLE SOURCE for env var declarations.
// Wave 2 plans (01-02, 01-03, 01-04) NEVER modify this file.
// They only replace placeholder values in .env.local.

// ────────────────────────────────────────────────────────────────────────────
// Per-process cache — validated values are memoized after first successful read
// ────────────────────────────────────────────────────────────────────────────
const _cache = new Map<string, string>()

function cached(key: string, validate: () => string): string {
  if (_cache.has(key)) return _cache.get(key)!
  const value = validate()
  _cache.set(key, value)
  return value
}

// ────────────────────────────────────────────────────────────────────────────
// Validators
// ────────────────────────────────────────────────────────────────────────────

function getInviteToken(): string {
  return cached('INVITE_TOKEN', () => {
    const val = process.env.INVITE_TOKEN
    if (!val) {
      throw new Error(
        'Required env var INVITE_TOKEN is missing or required: set it in .env.local (64 hex chars from crypto.randomBytes(32))'
      )
    }
    if (!/^[a-f0-9]{64}$/.test(val)) {
      throw new Error(
        `Required env var INVITE_TOKEN is invalid: must match ^[a-f0-9]{64}$ (64 hex chars) — got length ${val.length}`
      )
    }
    return val
  })
}

function getSessionSecret(): string {
  return cached('SESSION_SECRET', () => {
    const val = process.env.SESSION_SECRET
    if (!val) {
      throw new Error(
        'Required env var SESSION_SECRET is missing or required: set it in .env.local (base64-encoded, >=32 bytes decoded)'
      )
    }
    const decoded = Buffer.from(val, 'base64')
    if (decoded.length < 32) {
      throw new Error(
        `Required env var SESSION_SECRET is invalid: base64 decoded length must be >= 32 bytes, got ${decoded.length}`
      )
    }
    return val
  })
}

function getTursoDatabaseUrl(): string {
  return cached('TURSO_DATABASE_URL', () => {
    const val = process.env.TURSO_DATABASE_URL
    if (!val) {
      throw new Error(
        'Required env var TURSO_DATABASE_URL is missing or required: set it in .env.local'
      )
    }
    if (!/^(libsql|https?):\/\//.test(val)) {
      throw new Error(
        `Required env var TURSO_DATABASE_URL is invalid: must match ^(libsql|https?):// — got "${val}"`
      )
    }
    return val
  })
}

function getTursoAuthToken(): string {
  return cached('TURSO_AUTH_TOKEN', () => {
    const val = process.env.TURSO_AUTH_TOKEN
    if (!val) {
      throw new Error(
        'Required env var TURSO_AUTH_TOKEN is missing or required: set it in .env.local'
      )
    }
    return val
  })
}

function getAdminUsername(): string {
  return cached('ADMIN_USERNAME', () => {
    const val = process.env.ADMIN_USERNAME
    if (!val) {
      throw new Error(
        'Required env var ADMIN_USERNAME is missing or required: set it in .env.local'
      )
    }
    return val
  })
}

function getAdminPasswordHash(): string {
  return cached('ADMIN_PASSWORD_HASH', () => {
    const val = process.env.ADMIN_PASSWORD_HASH
    if (!val) {
      throw new Error(
        'Required env var ADMIN_PASSWORD_HASH is missing or required: set it in .env.local (bcrypt hash, cost >=12)'
      )
    }
    // Validates bcrypt format with cost >= 12
    // Pattern: $2b$12$... or $2a$12$... or $2y$12$... (cost 12-19)
    if (!/^\$2[aby]?\$1[2-9]\$/.test(val)) {
      throw new Error(
        'Required env var ADMIN_PASSWORD_HASH is invalid: must be a bcrypt hash with cost >= 12 (run node scripts/gen-hash.js <password>)'
      )
    }
    return val
  })
}

function getBlobReadWriteToken(): string {
  return cached('BLOB_READ_WRITE_TOKEN', () => {
    const val = process.env.BLOB_READ_WRITE_TOKEN
    if (!val) {
      throw new Error(
        'Required env var BLOB_READ_WRITE_TOKEN is missing or required: set it in .env.local (from Vercel Blob store)'
      )
    }
    if (val === 'REPLACE_ME_in_plan_04') {
      throw new Error(
        'Required env var BLOB_READ_WRITE_TOKEN is invalid: placeholder value detected — replace with a real Vercel Blob token (Plan 04)'
      )
    }
    return val
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Exported frozen env object
// ────────────────────────────────────────────────────────────────────────────

export const env = Object.freeze({
  get INVITE_TOKEN() {
    return getInviteToken()
  },
  get SESSION_SECRET() {
    return getSessionSecret()
  },
  get TURSO_DATABASE_URL() {
    return getTursoDatabaseUrl()
  },
  get TURSO_AUTH_TOKEN() {
    return getTursoAuthToken()
  },
  get ADMIN_USERNAME() {
    return getAdminUsername()
  },
  get ADMIN_PASSWORD_HASH() {
    return getAdminPasswordHash()
  },
  get BLOB_READ_WRITE_TOKEN() {
    return getBlobReadWriteToken()
  },
})
