export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_SIZE_BYTES = 8 * 1024 * 1024

/**
 * Client-side magic-byte validator. CALL BEFORE @vercel/blob/client upload().
 * Browser pattern:
 *   const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())
 *   if (!isAllowedMagicBytes(head)) { showError('Not a real JPEG/PNG/WebP image'); return }
 *   await upload(file.name, file, { access: 'public', handleUploadUrl: `/${token}/api/upload` })
 *
 * Recognizes:
 *   JPEG: FF D8 FF
 *   PNG:  89 50 4E 47 0D 0A 1A 0A
 *   WebP: 'RIFF' (52 49 46 46) at bytes 0-3 AND 'WEBP' (57 45 42 50) at bytes 8-11
 *
 * The @vercel/blob/client architecture transfers file bytes BROWSER->CDN directly;
 * the server never sees file content, so server-side magic-byte validation is
 * architecturally impossible. CLAUDE.md's "validate by magic bytes (not Content-Type)"
 * intent is satisfied by browser-side enforcement here, plus Vercel CDN's
 * allowedContentTypes server-side enforcement as a second layer.
 */
export function isAllowedMagicBytes(buf: Uint8Array): boolean {
  if (buf.length < 12) return false

  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
    buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A
  ) return true

  // WebP: 'RIFF' at 0-3 AND 'WEBP' at 8-11
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return true

  return false
}
