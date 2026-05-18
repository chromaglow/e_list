// proxy.test.ts — vitest tests for proxy.ts
// Tests invite gate + admin JWT check behaviors.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SignJWT } from 'jose'

// ── Constants ────────────────────────────────────────────────────────────────
const VALID_TOKEN = 'a'.repeat(64)
const WRONG_TOKEN = 'b'.repeat(64)
const SESSION_SECRET = Buffer.from('a'.repeat(32)).toString('base64')
const encodedKey = new TextEncoder().encode(SESSION_SECRET)

// ── vi.hoisted: create spy functions before mocks are hoisted ────────────────
const { mockRewrite, mockRedirect, mockNext, mockVerifyAdminSession } = vi.hoisted(() => ({
  mockRewrite: vi.fn((url: URL) => ({ type: 'rewrite', destination: url.pathname })),
  mockRedirect: vi.fn((url: URL) => ({ type: 'redirect', destination: url.pathname })),
  mockNext: vi.fn(() => ({ type: 'next' })),
  mockVerifyAdminSession: vi.fn(),
}))

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('server-only', () => ({}))

vi.mock('@/lib/env', () => ({
  env: {
    get INVITE_TOKEN() { return VALID_TOKEN },
    get SESSION_SECRET() { return SESSION_SECRET },
  },
}))

vi.mock('@/lib/session', () => ({
  verifyAdminSession: mockVerifyAdminSession,
}))

vi.mock('next/server', () => ({
  NextResponse: {
    rewrite: mockRewrite,
    redirect: mockRedirect,
    next: mockNext,
  },
}))

// ── Import proxy after mocks ─────────────────────────────────────────────────
import { proxy, config } from './proxy'

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(pathname: string, cookieValue?: string) {
  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
    cookies: {
      get: (name: string) =>
        name === 'admin_session' && cookieValue
          ? { value: cookieValue }
          : undefined,
    },
  }
}

async function makeAdminToken(): Promise<string> {
  return await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('4h')
    .sign(encodedKey)
}

beforeEach(() => {
  mockRewrite.mockClear()
  mockRedirect.mockClear()
  mockNext.mockClear()
  mockVerifyAdminSession.mockReset()
  // Default: verifyAdminSession returns null (no valid session)
  mockVerifyAdminSession.mockResolvedValue(null)
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('proxy.ts — invite gate', () => {
  it('rewrites to /_not-found when path is / (no token)', async () => {
    await proxy(makeRequest('/') as any)
    expect(mockRewrite).toHaveBeenCalled()
    const url = mockRewrite.mock.calls[0][0] as URL
    expect(url.pathname).toBe('/_not-found')
  })

  it('rewrites to /_not-found for wrong 64-char token (same length, wrong value)', async () => {
    await proxy(makeRequest(`/${WRONG_TOKEN}/`) as any)
    expect(mockRewrite).toHaveBeenCalled()
    const url = mockRewrite.mock.calls[0][0] as URL
    expect(url.pathname).toBe('/_not-found')
  })

  it('rewrites to /_not-found for short/wrong token', async () => {
    await proxy(makeRequest('/wrong-short-token/') as any)
    expect(mockRewrite).toHaveBeenCalled()
    const url = mockRewrite.mock.calls[0][0] as URL
    expect(url.pathname).toBe('/_not-found')
  })

  it('calls NextResponse.next() for correct INVITE_TOKEN', async () => {
    await proxy(makeRequest(`/${VALID_TOKEN}/`) as any)
    expect(mockRewrite).not.toHaveBeenCalled()
    expect(mockNext).toHaveBeenCalled()
  })

  it('rewrites to /_not-found for /api path without invite token in first segment', async () => {
    await proxy(makeRequest('/api/anything') as any)
    expect(mockRewrite).toHaveBeenCalled()
    const url = mockRewrite.mock.calls[0][0] as URL
    expect(url.pathname).toBe('/_not-found')
  })

  it('uses NextResponse.rewrite for 404 (not error) — T-01-02', async () => {
    await proxy(makeRequest('/bad-token/') as any)
    // rewrite was called with /_not-found URL
    expect(mockRewrite).toHaveBeenCalled()
    // mockNext was NOT called (request blocked)
    expect(mockNext).not.toHaveBeenCalled()
  })
})

describe('proxy.ts — admin JWT gate', () => {
  it('redirects to /{token}/admin/login when /admin has no cookie', async () => {
    await proxy(makeRequest(`/${VALID_TOKEN}/admin`) as any)
    expect(mockRedirect).toHaveBeenCalled()
    const url = mockRedirect.mock.calls[0][0] as URL
    expect(url.pathname).toContain('/admin/login')
  })

  it('redirects to /admin/login when admin cookie is expired/malformed', async () => {
    mockVerifyAdminSession.mockResolvedValue(null)
    await proxy(makeRequest(`/${VALID_TOKEN}/admin`, 'bad.jwt.token') as any)
    expect(mockRedirect).toHaveBeenCalled()
    const url = mockRedirect.mock.calls[0][0] as URL
    expect(url.pathname).toContain('/admin/login')
  })

  it('passes through /admin/login WITHOUT requiring admin JWT (D-01 + T-01-05)', async () => {
    // Login page reachable without JWT — otherwise you can never log in
    await proxy(makeRequest(`/${VALID_TOKEN}/admin/login`) as any)
    expect(mockRedirect).not.toHaveBeenCalled()
    expect(mockNext).toHaveBeenCalled()
  })

  it('passes through /admin when admin_session cookie is valid', async () => {
    mockVerifyAdminSession.mockResolvedValue({ role: 'admin' })
    const token = await makeAdminToken()
    await proxy(makeRequest(`/${VALID_TOKEN}/admin`, token) as any)
    expect(mockRedirect).not.toHaveBeenCalled()
    expect(mockNext).toHaveBeenCalled()
  })

  it('passes through /admin/dashboard when admin JWT is valid', async () => {
    mockVerifyAdminSession.mockResolvedValue({ role: 'admin' })
    const token = await makeAdminToken()
    await proxy(makeRequest(`/${VALID_TOKEN}/admin/dashboard`, token) as any)
    expect(mockRedirect).not.toHaveBeenCalled()
    expect(mockNext).toHaveBeenCalled()
  })
})

describe('proxy.ts — constant-time comparison (T-01-01)', () => {
  it('handles length mismatch gracefully (does not throw)', async () => {
    // Short token — timingSafeEqual would throw on length mismatch; proxy.ts catches it
    await expect(proxy(makeRequest('/abc/') as any)).resolves.toBeDefined()
    expect(mockRewrite).toHaveBeenCalled()
  })

  it('handles completely empty path without throwing', async () => {
    await expect(proxy(makeRequest('/') as any)).resolves.toBeDefined()
    expect(mockRewrite).toHaveBeenCalled()
  })
})

describe('proxy.ts — config export', () => {
  it('exports config.matcher as an array', () => {
    expect(config).toBeDefined()
    expect(Array.isArray(config.matcher)).toBe(true)
  })

  it('matcher excludes _next/static, _next/image, favicon.ico, sitemap.xml, robots.txt', () => {
    const matcherStr = config.matcher[0]
    expect(matcherStr).toContain('_next/static')
    expect(matcherStr).toContain('_next/image')
    expect(matcherStr).toContain('favicon.ico')
    expect(matcherStr).toContain('sitemap.xml')
    expect(matcherStr).toContain('robots.txt')
  })

  it('exports proxy as a function that returns a Promise', () => {
    expect(typeof proxy).toBe('function')
    const result = proxy(makeRequest('/') as any)
    expect(result).toBeInstanceOf(Promise)
  })
})
