const attempts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  key: string,
  opts: { max?: number; windowMs?: number } = {}
): boolean {
  const max = opts.max ?? 5
  const windowMs = opts.windowMs ?? 15 * 60 * 1000
  const now = Date.now()

  if (attempts.size > 1000) {
    for (const [k, v] of attempts) {
      if (now > v.resetAt) attempts.delete(k)
    }
  }

  const entry = attempts.get(key)
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}
