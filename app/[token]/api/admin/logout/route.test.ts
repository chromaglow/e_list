import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/session', () => ({ deleteAdminSession: vi.fn() }))

import { deleteAdminSession } from '@/lib/session'
import { POST } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(deleteAdminSession).mockResolvedValue(undefined)
})

describe('POST /[token]/api/admin/logout', () => {
  it('returns 200 + { success: true }', async () => {
    const req = new Request('http://localhost/abc/api/admin/logout', { method: 'POST' })
    const res = await POST()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('calls deleteAdminSession exactly once', async () => {
    await POST()
    expect(deleteAdminSession).toHaveBeenCalledOnce()
  })

  it('is idempotent — second call also returns 200', async () => {
    await POST()
    await POST()
    expect(deleteAdminSession).toHaveBeenCalledTimes(2)
    const res = await POST()
    expect(res.status).toBe(200)
  })
})
