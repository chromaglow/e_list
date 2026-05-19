'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function MarkTakenButton({
  listingId,
  token,
}: {
  listingId: string
  token: string
}) {
  const router = useRouter()
  const [hasToken, setHasToken] = useState(false)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(`edit_token_${listingId}`)
    setHasToken(!!stored)
  }, [listingId])

  if (!hasToken) return null

  async function handleClick() {
    const editToken = localStorage.getItem(`edit_token_${listingId}`)
    if (!editToken) return
    setIsPending(true)
    try {
      const res = await fetch(`/${token}/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editToken }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? 'Marking…' : 'Mark as taken'}
    </Button>
  )
}
