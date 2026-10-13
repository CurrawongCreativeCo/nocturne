import { describe, expect, it } from 'vitest'

import { getClientIp } from './client-ip'

const headers = (init: Record<string, string>) => ({ get: (name: string) => init[name] ?? null })

describe('getClientIp', () => {
  it('prefers x-real-ip', () => {
    expect(getClientIp(headers({ 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' }))).toBe(
      '1.1.1.1',
    )
  })

  it('takes the first address in x-forwarded-for', () => {
    expect(getClientIp(headers({ 'x-forwarded-for': '2.2.2.2, 3.3.3.3' }))).toBe('2.2.2.2')
  })

  it('falls back to one shared bucket when there are no headers', () => {
    expect(getClientIp(headers({}))).toBe('unknown')
  })
})
