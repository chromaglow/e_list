import { describe, it, expect } from 'vitest'
import { loginSchema } from './admin-validators'

describe('loginSchema', () => {
  it('accepts valid username and password', () => {
    expect(loginSchema.safeParse({ username: 'admin', password: 'pw' }).success).toBe(true)
  })
  it('rejects empty username', () => {
    expect(loginSchema.safeParse({ username: '', password: 'pw' }).success).toBe(false)
  })
  it('rejects empty password', () => {
    expect(loginSchema.safeParse({ username: 'admin', password: '' }).success).toBe(false)
  })
  it('rejects missing fields', () => {
    expect(loginSchema.safeParse({}).success).toBe(false)
  })
  it('rejects non-string username', () => {
    expect(loginSchema.safeParse({ username: 123, password: 'pw' }).success).toBe(false)
  })
  it('rejects non-string password', () => {
    expect(loginSchema.safeParse({ username: 'admin', password: null }).success).toBe(false)
  })
})
