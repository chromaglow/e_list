import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('bcryptjs', () => ({ compare: vi.fn() }))
vi.mock('@/lib/session', () => ({ createAdminSession: vi.fn(), verifyAdminSession: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/lib/env', () => ({
  env: {
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD_HASH: '$2b$12$' + 'a'.repeat(53),
  },
}))

import { compare } from 'bcryptjs'
import { createAdminSession } from '@/lib/session'
import { checkRateLimit } from '@/lib/rate-limit'
import { POST } from './route'

function makeRequest(body: unknown, ip = '1.2.3.4'): Request {
  return new Request('http://localhost/abc/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockReturnValue(true)
  vi.mocked(compare).mockResolvedValue(false as never)
  vi.mocked(createAdminSession).mockResolvedValue(undefined)
})

describe('POST /[token]/api/admin/login', () => {
  it('returns 200 + { success: true } on correct credentials, calls createAdminSession', async () => {
    vi.mocked(compare).mockResolvedValue(true as never)
    const res = await POST(makeRequest({ username: 'admin', password: 'correct' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(createAdminSession).toHaveBeenCalledOnce()
  })

  it('returns 401 on wrong password, does not call createAdminSession', async () => {
    vi.mocked(compare).mockResolvedValue(false as never)
    const res = await POST(makeRequest({ username: 'admin', password: 'wrong' }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Invalid credentials' })
    expect(createAdminSession).not.toHaveBeenCalled()
  })

  it('returns 401 on wrong username AND still calls bcrypt.compare (constant-time T-03-03)', async () => {
    vi.mocked(compare).mockResolvedValue(false as never)
    const res = await POST(makeRequest({ username: 'notadmin', password: 'any' }))
    expect(res.status).toBe(401)
    expect(compare).toHaveBeenCalledOnce()
    expect(createAdminSession).not.toHaveBeenCalled()
  })

  it('returns 400 on malformed JSON body', async () => {
    const req = new Request('http://localhost/abc/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json{{{',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid request' })
  })

  it('returns 400 when username is empty (zod validation)', async () => {
    const res = await POST(makeRequest({ username: '', password: 'pw' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid request' })
  })

  it('returns 400 when password is missing (zod validation)', async () => {
    const res = await POST(makeRequest({ username: 'admin' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid request' })
  })

  it('returns 429 when rate-limit is exceeded', async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false)
    const res = await POST(makeRequest({ username: 'admin', password: 'pw' }))
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'Too many attempts' })
  })

  it('calls checkRateLimit before bcrypt.compare (order)', async () => {
    const order: string[] = []
    vi.mocked(checkRateLimit).mockImplementation(() => { order.push('rate'); return true })
    vi.mocked(compare).mockImplementation(async () => { order.push('bcrypt'); return false as never })
    await POST(makeRequest({ username: 'admin', password: 'pw' }))
    expect(order[0]).toBe('rate')
    expect(order[1]).toBe('bcrypt')
  })

  it('does not echo password or hash in the response body', async () => {
    vi.mocked(compare).mockResolvedValue(false as never)
    const res = await POST(makeRequest({ username: 'admin', password: 'super-secret-pw' }))
    const text = await res.text()
    expect(text).not.toContain('super-secret-pw')
    expect(text).not.toContain('$2b$12$')
  })
})
