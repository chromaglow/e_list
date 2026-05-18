import { describe, it, expect } from 'vitest'
import { ALLOWED_TYPES, MAX_SIZE_BYTES, isAllowedMagicBytes } from './upload-validators'

describe('ALLOWED_TYPES', () => {
  it('contains exactly jpeg, png, webp', () => {
    expect(ALLOWED_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })
})

describe('MAX_SIZE_BYTES', () => {
  it('is exactly 8 MB', () => {
    expect(MAX_SIZE_BYTES).toBe(8 * 1024 * 1024)
  })
})

describe('isAllowedMagicBytes', () => {
  it('returns true for JPEG magic bytes (FF D8 FF)', () => {
    const jpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01])
    expect(isAllowedMagicBytes(jpeg)).toBe(true)
  })

  it('returns true for PNG magic bytes (89 50 4E 47 0D 0A 1A 0A)', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D])
    expect(isAllowedMagicBytes(png)).toBe(true)
  })

  it('returns true for WebP magic bytes (RIFF....WEBP)', () => {
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x08, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
    expect(isAllowedMagicBytes(webp)).toBe(true)
  })

  it('returns false for SVG/XML prefix (<?xml)', () => {
    const svg = new Uint8Array([0x3C, 0x3F, 0x78, 0x6D, 0x6C, 0x20, 0x76, 0x65, 0x72, 0x73, 0x69, 0x6F])
    expect(isAllowedMagicBytes(svg)).toBe(false)
  })

  it('returns false for HTML prefix (<!doc)', () => {
    const html = new Uint8Array([0x3C, 0x21, 0x64, 0x6F, 0x63, 0x74, 0x79, 0x70, 0x65, 0x20, 0x68, 0x74])
    expect(isAllowedMagicBytes(html)).toBe(false)
  })

  it('returns false for GIF prefix (GIF8)', () => {
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00])
    expect(isAllowedMagicBytes(gif)).toBe(false)
  })

  it('returns false when buffer is shorter than 12 bytes', () => {
    const short = new Uint8Array([0xFF, 0xD8, 0xFF])
    expect(isAllowedMagicBytes(short)).toBe(false)
  })

  it('returns false for empty Uint8Array', () => {
    expect(isAllowedMagicBytes(new Uint8Array(0))).toBe(false)
  })
})
