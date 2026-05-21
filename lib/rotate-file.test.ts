import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rotateFile } from './rotate-file'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeFile(name = 'photo.jpg', type = 'image/jpeg'): File {
  return new File([new Uint8Array([0xff, 0xd8, 0xff])], name, { type })
}

function makeMockCanvas(blob: Blob | null) {
  const ctx = {
    translate: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(blob)),
  }
  return { canvas, ctx }
}

// ── per-test state ────────────────────────────────────────────────────────────

// Holds a reference to the `this` created by `new Image()` so tests can
// inspect drawImage calls without needing the original mock object.
let imgInstance: { src: string; naturalWidth: number; naturalHeight: number; decode: ReturnType<typeof vi.fn> }
let mockCanvas: ReturnType<typeof makeMockCanvas>['canvas']
let mockCtx: ReturnType<typeof makeMockCanvas>['ctx']

beforeEach(() => {
  ;({ canvas: mockCanvas, ctx: mockCtx } = makeMockCanvas(new Blob(['rotated'], { type: 'image/jpeg' })))

  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  })

  // Must be a regular function (not arrow) so it can be used with `new`.
  vi.stubGlobal('Image', vi.fn(function (this: typeof imgInstance) {
    this.src = ''
    this.naturalWidth = 400
    this.naturalHeight = 300
    this.decode = vi.fn().mockResolvedValue(undefined)
    imgInstance = this
  }))

  vi.stubGlobal('document', {
    createElement: vi.fn(() => mockCanvas),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── tests ─────────────────────────────────────────────────────────────────────

describe('rotateFile', () => {
  describe('0 degrees', () => {
    it('returns the original file without touching the canvas', async () => {
      const file = makeFile()
      const result = await rotateFile(file, 0)
      expect(result).toBe(file)
      expect(document.createElement).not.toHaveBeenCalled()
    })
  })

  describe('canvas dimensions', () => {
    it('keeps width × height for 180°', async () => {
      await rotateFile(makeFile(), 180)
      expect(mockCanvas.width).toBe(400)
      expect(mockCanvas.height).toBe(300)
    })

    it('swaps width and height for 90°', async () => {
      await rotateFile(makeFile(), 90)
      // naturalWidth=400, naturalHeight=300 → swap: canvas 300×400
      expect(mockCanvas.width).toBe(300)
      expect(mockCanvas.height).toBe(400)
    })

    it('swaps width and height for 270°', async () => {
      await rotateFile(makeFile(), 270)
      expect(mockCanvas.width).toBe(300)
      expect(mockCanvas.height).toBe(400)
    })
  })

  describe('canvas transform calls', () => {
    it('translates to canvas centre before rotating (90°)', async () => {
      await rotateFile(makeFile(), 90)
      // canvas is 300×400 after swap
      expect(mockCtx.translate).toHaveBeenCalledWith(150, 200)
    })

    it('rotates by π/2 radians for 90°', async () => {
      await rotateFile(makeFile(), 90)
      expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI / 2)
    })

    it('rotates by π radians for 180°', async () => {
      await rotateFile(makeFile(), 180)
      expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI)
    })

    it('rotates by 3π/2 radians for 270°', async () => {
      await rotateFile(makeFile(), 270)
      expect(mockCtx.rotate).toHaveBeenCalledWith((270 * Math.PI) / 180)
    })

    it('draws image centred at negative half its natural size', async () => {
      await rotateFile(makeFile(), 90)
      expect(mockCtx.drawImage).toHaveBeenCalledWith(imgInstance, -200, -150)
    })
  })

  describe('returned File', () => {
    it('preserves the original filename', async () => {
      const result = await rotateFile(makeFile('my-photo.jpg', 'image/jpeg'), 90)
      expect(result.name).toBe('my-photo.jpg')
    })

    it('preserves the original MIME type', async () => {
      const result = await rotateFile(makeFile('shot.png', 'image/png'), 90)
      expect(result.type).toBe('image/png')
    })

    it('passes the MIME type to canvas.toBlob', async () => {
      await rotateFile(makeFile('shot.webp', 'image/webp'), 90)
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp')
    })

    it('is a File instance (not a plain Blob)', async () => {
      const result = await rotateFile(makeFile(), 90)
      expect(result).toBeInstanceOf(File)
    })
  })

  describe('URL lifecycle', () => {
    it('creates an object URL from the original file', async () => {
      const file = makeFile()
      await rotateFile(file, 90)
      expect(URL.createObjectURL).toHaveBeenCalledWith(file)
    })

    it('revokes the object URL after success', async () => {
      await rotateFile(makeFile(), 90)
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    it('revokes the object URL even when toBlob returns null', async () => {
      const { canvas: nullCanvas } = makeMockCanvas(null)
      vi.stubGlobal('document', { createElement: vi.fn(() => nullCanvas) })

      await expect(rotateFile(makeFile(), 90)).rejects.toThrow('canvas.toBlob failed')
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  describe('error handling', () => {
    it('rejects when canvas.toBlob returns null', async () => {
      const { canvas: nullCanvas } = makeMockCanvas(null)
      vi.stubGlobal('document', { createElement: vi.fn(() => nullCanvas) })

      await expect(rotateFile(makeFile(), 90)).rejects.toThrow('canvas.toBlob failed')
    })
  })
})
