import { afterEach, describe, expect, it, vi } from 'vitest'

import { colorHex } from '@/config/tokens.generated'

import { fetchBrandColours } from './brand-colours'

afterEach(() => {
  vi.useRealTimers()
})

const clientReturning = (value: unknown) => ({ fetch: vi.fn(() => Promise.resolve(value)) })

describe('fetchBrandColours', () => {
  it('resolves Design settings the way the page does', async () => {
    vi.useFakeTimers({ now: 1_000_000 })
    const client = clientReturning({ primary: '#ffd200' })
    const { colours, custom } = await fetchBrandColours(client as never)
    expect(custom).toBe(true)
    expect(colours.accent).toBe('#ffd200')
    expect(colours.surface).toBe(colorHex.surface)
  })

  it('counts a site with nothing set as the defaults', async () => {
    vi.useFakeTimers({ now: 2_000_000 })
    const { colours, custom } = await fetchBrandColours(clientReturning(null) as never)
    expect(custom).toBe(false)
    expect(colours).toEqual(colorHex)
  })

  it('shares one request between the fields of a form, then asks again', async () => {
    vi.useFakeTimers({ now: 3_000_000 })
    const client = clientReturning(null)
    await Promise.all([fetchBrandColours(client as never), fetchBrandColours(client as never)])
    expect(client.fetch).toHaveBeenCalledOnce()
    vi.setSystemTime(3_010_000)
    await fetchBrandColours(client as never)
    expect(client.fetch).toHaveBeenCalledTimes(2)
  })

  it('falls back to the defaults when the request fails', async () => {
    vi.useFakeTimers({ now: 4_000_000 })
    const client = { fetch: vi.fn(() => Promise.reject(new Error('offline'))) }
    const result = await fetchBrandColours(client as never)
    expect(result.custom).toBe(false)
    expect(result.colours).toEqual(colorHex)
  })
})
