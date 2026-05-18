import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockHandleUpload = vi.fn()
vi.mock('@vercel/blob/client', () => ({
  handleUpload: mockHandleUpload,
}))

const { POST } = await import('./route')

beforeEach(() => {
  mockHandleUpload.mockReset()
})

describe('POST /[token]/api/upload', () => {
  it('returns 200 with handleUpload response on success', async () => {
    const fakeToken = { clientToken: 'tok_abc123', url: 'https://example.com' }
    mockHandleUpload.mockResolvedValueOnce(fakeToken)

    const req = new Request('http://localhost/test/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'blob.generate-client-token', payload: {} }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(fakeToken)
  })

  it('returns 400 with error message when handleUpload throws', async () => {
    mockHandleUpload.mockRejectedValueOnce(new Error('Invalid request body'))

    const req = new Request('http://localhost/test/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid request body')
  })

  it('onBeforeGenerateToken returns correct config', async () => {
    let capturedCallback: ((pathname: string) => Promise<unknown>) | null = null
    mockHandleUpload.mockImplementationOnce(async ({ onBeforeGenerateToken }) => {
      capturedCallback = onBeforeGenerateToken
      return { clientToken: 'tok_xyz' }
    })

    const req = new Request('http://localhost/test/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'blob.generate-client-token', payload: {} }),
    })

    await POST(req)
    expect(capturedCallback).toBeTruthy()

    const config = await capturedCallback!('test/photo.jpg') as {
      allowedContentTypes: string[]
      maximumSizeInBytes: number
      addRandomSuffix: boolean
    }

    expect(config.allowedContentTypes).toEqual(['image/jpeg', 'image/png', 'image/webp'])
    expect(config.maximumSizeInBytes).toBe(8 * 1024 * 1024)
    expect(config.addRandomSuffix).toBe(true)
  })

  it('onUploadCompleted is defined and is a function', async () => {
    let capturedCallback: unknown = null
    mockHandleUpload.mockImplementationOnce(async ({ onUploadCompleted }) => {
      capturedCallback = onUploadCompleted
      return { clientToken: 'tok_xyz' }
    })

    const req = new Request('http://localhost/test/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'blob.generate-client-token', payload: {} }),
    })

    await POST(req)
    expect(typeof capturedCallback).toBe('function')
  })
})
