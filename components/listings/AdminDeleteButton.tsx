'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdminDeleteButton({
  listingId,
  token,
}: {
  listingId: string
  token: string
}) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  async function handleClick() {
    if (!window.confirm('Delete this listing?')) return
    setIsPending(true)
    try {
      const res = await fetch(`/${token}/api/listings/${listingId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.refresh()
      }
    } catch {
      // non-fatal — card will still be visible; user can retry
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Delete listing"
    >
      <Trash2 className="size-4" />
    </Button>
  )
}
