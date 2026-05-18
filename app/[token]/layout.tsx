// app/[token]/layout.tsx — Token-scoped layout.
// The dynamic [token] segment is consumed/validated by proxy.ts.
// This layout is a minimal pass-through so Next.js recognizes the dynamic route.

export default function TokenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
