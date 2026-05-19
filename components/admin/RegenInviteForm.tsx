'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function RegenInviteForm({ token }: { token: string }) {
  const [newUrl, setNewUrl] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegen() {
    setIsPending(true)
    setError(null)
    try {
      const res = await fetch(`/${token}/admin/api/regen-invite`, {
        method: 'POST',
      })
      if (res.ok) {
        const data: { newToken: string } = await res.json()
        const fullUrl = window.location.origin + '/' + data.newToken
        setNewUrl(fullUrl)
      } else {
        setError('Regeneration failed. Try again.')
      }
    } catch {
      setError('Network error. Try again.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="mt-8">
      <h3 className="text-base font-semibold">Invite Link</h3>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        Generate a new invite URL. The old link will stop working immediately.
      </p>
      <Button onClick={handleRegen} disabled={isPending}>
        {isPending ? 'Regenerating…' : 'Regenerate invite link'}
      </Button>
      {newUrl && (
        <div className="mt-4">
          <label className="text-sm font-medium">New invite URL:</label>
          <input
            type="text"
            readOnly
            value={newUrl}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}
      {error && (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
