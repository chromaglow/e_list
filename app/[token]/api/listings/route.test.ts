import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({ db: { insert: vi.fn() } }))
vi.mock('@/lib/schema', () => ({ listings: {} }))
vi.mock('nanoid', () => ({ nanoid: vi.fn() }))

import { db } from '@/lib/db'
import { nanoid } from 'nanoid'

const { POST } = await import('./route')

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/abc/api/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(nanoid).mockReturnValue('test-id-123')
  vi.mocked(db.insert).mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) } as unknown as ReturnType<typeof db.insert>)
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-edit-token-uuid' as `${string}-${string}-${string}-${string}-${string}`)
})

describe('POST /[token]/api/listings', () => {
  it('returns 201 + { id, editToken } on valid body with all fields', async () => {
    const res = await POST(makeRequest({
      title: 'Free couch',
      description: 'Good condition, barely used',
      price: '$0',
      posterName: 'Alice',
      contactInfo: 'alice@example.com',
      photoKey: 'uploads/couch.jpg',
    }))

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json).toEqual({ id: 'test-id-123', editToken: 'test-edit-token-uuid' })
    expect(db.insert).toHaveBeenCalledOnce()
  })

  it('returns 201 + { id, editToken } on valid body without optional price and photoKey', async () => {
    const res = await POST(makeRequest({
      title: 'Old lamp',
      description: 'Works fine',
      posterName: 'Bob',
      contactInfo: 'bob@example.com',
    }))

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json).toHaveProperty('id', 'test-id-123')
    expect(json).toHaveProperty('editToken', 'test-edit-token-uuid')
    expect(db.insert).toHaveBeenCalledOnce()
  })

  it('returns 400 on missing required field (no title)', async () => {
    const res = await POST(makeRequest({
      description: 'Good condition',
      posterName: 'Alice',
      contactInfo: 'alice@example.com',
    }))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toEqual({ error: 'Invalid request' })
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('returns 400 on malformed JSON body', async () => {
    const req = new Request('http://localhost/abc/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json{{{',
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toEqual({ error: 'Invalid request' })
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('editToken is server-generated and never echoed from request body', async () => {
    const res = await POST(makeRequest({
      title: 'Test',
      description: 'Test description',
      posterName: 'Tester',
      contactInfo: 'tester@example.com',
      // Attacker tries to inject their own editToken — should be ignored
      editToken: 'attacker-token',
    }))

    // The response should always use the server-generated token, not the submitted one
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.editToken).toBe('test-edit-token-uuid')
    expect(json.editToken).not.toBe('attacker-token')
    // The response body should not contain "photoKey" (camelCase field name from request)
    const text = JSON.stringify(json)
    expect(text).not.toContain('photoKey')
  })
})
