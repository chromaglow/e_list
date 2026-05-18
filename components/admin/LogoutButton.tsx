'use client'

import { Button } from '@/components/ui/button'

export default function LogoutButton({ token }: { token: string }) {
  async function handleLogout() {
    await fetch(`/${token}/api/admin/logout`, { method: 'POST' })
    window.location.href = `/${token}/admin/login`
  }

  return (
    <Button variant="outline" onClick={handleLogout}>
      Log out
    </Button>
  )
}
