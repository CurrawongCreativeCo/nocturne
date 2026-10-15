import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchBrandGradients } from './brand-gradients'

afterEach(() => {
  vi.useRealTimers()
})

const clientReturning = (value: unknown) => ({ fetch: vi.fn(() => Promise.resolve(value)) })

describe('fetchBrandGradients', () => {
  it('returns the gradients with the slugs the page defines', async () => {
    vi.useFakeTimers({ now: 1_000_000 })
    const client = clientReturning([{ name: 'Forest dusk', stops: ['#0b3d2e', '#1b2a3b'] }])
    const found = await fetchBrandGradients(client as never)
    expect(found.map(({ slug }) => slug)).toEqual(['forest-dusk'])
    expect(client.fetch).toHaveBeenCalledOnce()
  })

  it('shares one request between the fields of a form, then asks again', async () => {
    vi.useFakeTimers({ now: 2_000_000 })
    const client = clientReturning(null)
    await Promise.all([fetchBrandGradients(client as never), fetchBrandGradients(client as never)])
    expect(client.fetch).toHaveBeenCalledOnce()
    vi.setSystemTime(2_010_000)
    await fetchBrandGradients(client as never)
    expect(client.fetch).toHaveBeenCalledTimes(2)
  })

  it('counts a failed request as no gradients', async () => {
    vi.useFakeTimers({ now: 3_000_000 })
    const client = { fetch: vi.fn(() => Promise.reject(new Error('offline'))) }
    await expect(fetchBrandGradients(client as never)).resolves.toEqual([])
  })
})
