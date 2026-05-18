import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

vi.useFakeTimers()

import { checkRateLimit } from './rate-limit'

beforeEach(() => { vi.setSystemTime(0) })
afterEach(() => { vi.useRealTimers(); vi.useFakeTimers() })

describe('checkRateLimit', () => {
  it('allows the first 5 calls within the window', () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('ip-a')).toBe(true)
    }
  })

  it('blocks the 6th call within the window', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('ip-b')
    expect(checkRateLimit('ip-b')).toBe(false)
  })

  it('resets after the window elapses', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('ip-c')
    expect(checkRateLimit('ip-c')).toBe(false)
    vi.advanceTimersByTime(15 * 60 * 1000 + 1)
    expect(checkRateLimit('ip-c')).toBe(true)
  })

  it('independent counters per key', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('ip-d')
    expect(checkRateLimit('ip-d')).toBe(false)
    expect(checkRateLimit('ip-e')).toBe(true)
  })

  it('respects custom max and windowMs', () => {
    expect(checkRateLimit('ip-f', { max: 3, windowMs: 1000 })).toBe(true)
    checkRateLimit('ip-f', { max: 3, windowMs: 1000 })
    checkRateLimit('ip-f', { max: 3, windowMs: 1000 })
    expect(checkRateLimit('ip-f', { max: 3, windowMs: 1000 })).toBe(false)
  })

  it('resets with custom windowMs', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('ip-g', { max: 3, windowMs: 1000 })
    expect(checkRateLimit('ip-g', { max: 3, windowMs: 1000 })).toBe(false)
    vi.advanceTimersByTime(1001)
    expect(checkRateLimit('ip-g', { max: 3, windowMs: 1000 })).toBe(true)
  })
})
