import AppHeader from '@/components/shell/AppHeader'
import CreateListingForm from '@/components/listings/CreateListingForm'

export const dynamic = 'force-dynamic'

export default async function NewListingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return (
    <>
      <AppHeader />
      <main className="min-h-[calc(100dvh-3.5rem)]">
        <CreateListingForm token={token} />
      </main>
    </>
  )
}
