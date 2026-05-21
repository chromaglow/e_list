import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPut = vi.fn()
vi.mock('@vercel/blob', () => ({ put: mockPut }))

const { POST } = await import('./route')

beforeEach(() => {
  mockPut.mockReset()
})

// Build a valid upload request, with per-test overrides.
function makeRequest(options: {
  contentType?: string
  filename?: string
  size?: number
  body?: BodyInit | null
} = {}) {
  const {
    contentType = 'image/jpeg',
    filename = 'photo.jpg',
    size = 1024,
    body = new Uint8Array([0xff, 0xd8, 0xff]),
  } = options

  const headers: Record<string, string> = {
    'x-upload-content-type': contentType,
    'x-upload-filename': filename,
    'x-upload-size': String(size),
  }

  return new Request('http://localhost/abc/api/upload', {
    method: 'POST',
    headers,
    ...(body !== null ? { body } : {}),
  })
}

describe('POST /[token]/api/upload', () => {
  describe('content-type validation', () => {
    it('returns 400 for a disallowed type (image/gif)', async () => {
      const res = await POST(makeRequest({ contentType: 'image/gif' }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('File type not allowed')
    })

    it('returns 400 when x-upload-content-type header is absent', async () => {
      const req = new Request('http://localhost/abc/api/upload', {
        method: 'POST',
        headers: { 'x-upload-filename': 'photo.jpg', 'x-upload-size': '1024' },
        body: new Uint8Array([0xff, 0xd8, 0xff]),
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('File type not allowed')
    })

    it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', async (type) => {
      mockPut.mockResolvedValueOnce({ url: 'https://blob.vercel.com/photo' })
      const res = await POST(makeRequest({ contentType: type }))
      expect(res.status).toBe(200)
    })
  })

  describe('size validation', () => {
    it('returns 400 when size exceeds 8 MB', async () => {
      const res = await POST(makeRequest({ size: 8 * 1024 * 1024 + 1 }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('File too large (max 8 MB)')
    })

    it('accepts a file at exactly 8 MB', async () => {
      mockPut.mockResolvedValueOnce({ url: 'https://blob.vercel.com/photo.jpg' })
      const res = await POST(makeRequest({ size: 8 * 1024 * 1024 }))
      expect(res.status).toBe(200)
    })
  })

  describe('body validation', () => {
    it('returns 400 when no body is present', async () => {
      const res = await POST(makeRequest({ body: null }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('No body')
    })
  })

  describe('success path', () => {
    it('returns 200 with the blob url', async () => {
      mockPut.mockResolvedValueOnce({ url: 'https://blob.vercel.com/shot.jpg' })
      const res = await POST(makeRequest())
      expect(res.status).toBe(200)
      expect((await res.json()).url).toBe('https://blob.vercel.com/shot.jpg')
    })

    it('calls put() with access:public, addRandomSuffix:true, and the correct contentType', async () => {
      mockPut.mockResolvedValueOnce({ url: 'https://blob.vercel.com/photo.png' })
      await POST(makeRequest({ contentType: 'image/png', filename: 'shot.png' }))
      expect(mockPut).toHaveBeenCalledWith(
        'shot.png',
        expect.anything(),
        expect.objectContaining({ access: 'public', addRandomSuffix: true, contentType: 'image/png' })
      )
    })

    it('defaults filename to "photo" when x-upload-filename header is absent', async () => {
      mockPut.mockResolvedValueOnce({ url: 'https://blob.vercel.com/photo' })
      const req = new Request('http://localhost/abc/api/upload', {
        method: 'POST',
        headers: { 'x-upload-content-type': 'image/jpeg', 'x-upload-size': '1024' },
        body: new Uint8Array([0xff, 0xd8, 0xff]),
      })
      await POST(req)
      expect(mockPut).toHaveBeenCalledWith('photo', expect.anything(), expect.anything())
    })
  })

  describe('error handling', () => {
    it('returns 500 with the error message when put() throws', async () => {
      mockPut.mockRejectedValueOnce(new Error('Blob storage unavailable'))
      const res = await POST(makeRequest())
      expect(res.status).toBe(500)
      expect((await res.json()).error).toBe('Blob storage unavailable')
    })
  })
})
