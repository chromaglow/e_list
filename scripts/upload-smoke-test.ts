import { config } from 'dotenv'
config({ path: '.env.local' })
import { isAllowedMagicBytes } from '@/lib/upload-validators'

async function main() {
  const INVITE_TOKEN = process.env.INVITE_TOKEN
  if (!INVITE_TOKEN) {
    console.error('ERROR: INVITE_TOKEN is not set in environment')
    process.exit(1)
  }

  // ── Client-side magic-byte demonstration ──────────────────────────────────

  // Known JPEG magic bytes (FF D8 FF E0 ... JFIF header)
  const jpegHead = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01])
  if (!isAllowedMagicBytes(jpegHead)) {
    console.error('FAIL: magic-byte JPEG check returned false — expected true')
    process.exit(1)
  }
  console.log('magic-byte JPEG check: ok')

  // Known SVG/XML prefix (<?xml versio)
  const svgHead = new Uint8Array([0x3C, 0x3F, 0x78, 0x6D, 0x6C, 0x20, 0x76, 0x65, 0x72, 0x73, 0x69, 0x6F])
  if (isAllowedMagicBytes(svgHead)) {
    console.error('FAIL: magic-byte SVG rejection returned true — expected false')
    process.exit(1)
  }
  console.log('magic-byte SVG rejection: ok')

  // ── Token-exchange smoke test ──────────────────────────────────────────────

  const url = `http://localhost:3000/${INVITE_TOKEN}/api/upload`

  const payload = {
    type: 'blob.generate-client-token',
    payload: {
      pathname: 'test/smoke.jpg',
      callbackUrl: `http://localhost:3000/${INVITE_TOKEN}/api/upload`,
      clientPayload: null,
      multipart: false,
    },
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('ERROR: Could not reach dev server at', url)
    console.error('Make sure `npm run dev` is running.')
    console.error(err)
    process.exit(1)
  }

  const text = await res.text()
  let body: Record<string, unknown>
  try {
    body = JSON.parse(text)
  } catch {
    console.error(`ERROR: Response was not JSON (status ${res.status}):`, text)
    process.exit(1)
  }

  console.log(`status: ${res.status}`)
  console.log('body:', JSON.stringify(body, null, 2))

  if (res.status === 404) {
    console.error('FAIL: 404 — route not found. Verify the file is at app/[token]/api/upload/route.ts (not app/api/upload/route.ts)')
    process.exit(1)
  }

  if (res.status === 500) {
    console.error('FAIL: 500 — likely a missing or invalid BLOB_READ_WRITE_TOKEN in .env.local')
    process.exit(1)
  }

  if (res.status === 400) {
    console.error('FAIL: 400 — handleUpload rejected the body. Consult RESEARCH.md Pattern 5 for the correct HandleUploadBody shape.')
    console.error('Response:', body)
    process.exit(1)
  }

  if (res.status !== 200) {
    console.error(`FAIL: unexpected status ${res.status}`)
    process.exit(1)
  }

  if (!('token' in body || 'clientToken' in body || 'uploadUrl' in body)) {
    console.error('FAIL: response does not contain token/clientToken/uploadUrl field')
    console.error('Response:', body)
    process.exit(1)
  }

  console.log('smoke-test ok')
}

main().catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
