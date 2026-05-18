import { deleteAdminSession } from '@/lib/session'

export async function POST() {
  await deleteAdminSession()
  return Response.json({ success: true })
}
