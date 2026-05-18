// app/not-found.tsx — Rendered by proxy.ts via NextResponse.rewrite('/not-found')
// when an invalid or missing invite token is detected.
// Dependency-light: no shell component imports (route-agnostic, token-free).

export default function NotFound() {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#fff',
          color: '#111',
        }}
      >
        <header
          style={{
            borderBottom: '1px solid #e5e7eb',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>FriendSwap</span>
        </header>
        <main
          style={{
            maxWidth: '480px',
            margin: '0 auto',
            padding: '48px 16px',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '12px',
            }}
          >
            Page not found
          </h1>
          <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
            This is a private space. You need an invite link.
          </p>
        </main>
      </body>
    </html>
  )
}
