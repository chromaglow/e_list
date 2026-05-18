import { compare } from 'bcryptjs'
import { createAdminSession } from '@/lib/session'
import { checkRateLimit } from '@/lib/rate-limit'
import { loginSchema } from '@/lib/admin-validators'
import { env } from '@/lib/env'

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  if (!checkRateLimit(ip)) {
    return Response.json({ error: 'Too many attempts' }, { status: 429 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { username, password } = parsed.data
  const usernameMatches = username === env.ADMIN_USERNAME
  // T-03-03: always run bcrypt.compare regardless of username match — constant-time defense
  const passwordMatches = await compare(password, env.ADMIN_PASSWORD_HASH)

  if (!usernameMatches || !passwordMatches) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  await createAdminSession()
  return Response.json({ success: true })
}
