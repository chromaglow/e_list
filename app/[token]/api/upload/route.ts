import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { ALLOWED_TYPES, MAX_SIZE_BYTES } from '@/lib/upload-validators'

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('x-upload-content-type') ?? ''
    const filename = request.headers.get('x-upload-filename') ?? 'photo'
    const sizeHeader = request.headers.get('x-upload-size')
    const size = sizeHeader ? parseInt(sizeHeader, 10) : 0

    if (!ALLOWED_TYPES.includes(contentType as (typeof ALLOWED_TYPES)[number])) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }
    if (size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large (max 8 MB)' }, { status: 400 })
    }
    if (!request.body) {
      return NextResponse.json({ error: 'No body' }, { status: 400 })
    }

    const blob = await put(filename, request.body, {
      access: 'public',
      addRandomSuffix: true,
      contentType,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error('[upload] put() failed:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
