import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AppHeader from '@/components/shell/AppHeader'
import { verifyAdminSession } from '@/lib/session'
import LogoutButton from '@/components/admin/LogoutButton'

// T-03-08: re-verify at DAL even though proxy.ts already gated (defense in depth)
export const dynamic = 'force-dynamic'

export default async function AdminPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const sessionCookie = (await cookies()).get('admin_session')?.value
  const session = await verifyAdminSession(sessionCookie)
  if (!session) redirect(`/${token}/admin/login`)

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-screen-sm px-4 py-12">
        <h2 className="mb-4 text-lg font-semibold">Admin</h2>
        <p className="mb-6 text-sm text-muted-foreground">Logged in as admin.</p>
        <LogoutButton token={token} />
      </main>
    </>
  )
}
