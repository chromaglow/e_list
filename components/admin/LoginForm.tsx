'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function LoginForm({ token }: { token: string }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/${token}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (res.ok) {
        window.location.href = `/${token}/admin`
        return
      }

      if (res.status === 401) {
        setError('Invalid credentials')
      } else if (res.status === 429) {
        setError('Too many attempts — try again later')
      } else if (res.status === 400) {
        setError('Please enter both fields')
      } else {
        setError('Could not reach server')
      }
    } catch {
      setError('Could not reach server')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-screen-sm px-4 py-12">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold">Admin sign in</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
