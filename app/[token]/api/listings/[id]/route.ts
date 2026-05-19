import { z } from 'zod'
import { timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { listings } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { verifyAdminSession } from '@/lib/session'
import { markListingTaken, deleteListingAdmin } from '@/lib/listing-service'

const MarkTakenSchema = z.object({ editToken: z.string().min(1).max(500) })

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { id } = await params

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const parsed = MarkTakenSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const row = await db
    .select({ edit_token: listings.edit_token, status: listings.status })
    .from(listings)
    .where(eq(listings.id, id))
    .get()

  if (!row || row.status !== 'active') {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  // Constant-time comparison (T-03-08, T-03-12)
  // timingSafeEqual throws if buffer lengths differ — catch and treat as mismatch
  let tokenMatch = false
  try {
    const a = Buffer.from(parsed.data.editToken)
    const b = Buffer.from(row.edit_token)
    if (parsed.data.editToken.length === row.edit_token.length && parsed.data.editToken.length > 0) {
      tokenMatch = timingSafeEqual(a, b)
    }
  } catch {
    tokenMatch = false
  }

  if (!tokenMatch) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  await markListingTaken(id)
  return Response.json({ ok: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { id } = await params

  const sessionCookie = (await cookies()).get('admin_session')?.value
  const session = await verifyAdminSession(sessionCookie)
  if (!session) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  await deleteListingAdmin(id)
  return Response.json({ ok: true })
}
