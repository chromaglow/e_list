import AppHeader from '@/components/shell/AppHeader'
import LoginForm from '@/components/admin/LoginForm'

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return (
    <>
      <AppHeader token={token} />
      <main className="min-h-[calc(100dvh-3.5rem)]">
        <LoginForm token={token} />
      </main>
    </>
  )
}
