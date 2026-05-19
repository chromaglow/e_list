// middleware.ts — Next.js entry point for the invite-gate + admin session middleware.
// Logic lives in proxy.ts; this file is the required Next.js entry point name.
export const runtime = 'nodejs'
export { proxy as middleware, config } from './proxy'
