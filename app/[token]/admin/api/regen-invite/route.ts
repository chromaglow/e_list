import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { verifyAdminSession } from '@/lib/session'
import { setSetting } from '@/lib/settings-service'

export async function POST() {
  const sessionCookie = (await cookies()).get('admin_session')?.value
  const session = await verifyAdminSession(sessionCookie)
  if (!session) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Generate 64-hex-char token: 32 bytes × 2 hex digits (T-03-11)
  const newToken = randomBytes(32).toString('hex')
  await setSetting('invite_token', newToken)

  return Response.json({ newToken })
}
