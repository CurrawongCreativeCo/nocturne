import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  fetchBrandGradientState,
  fetchBrandGradients,
  gradientFieldWarning,
} from './brand-gradients'

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

describe('fetchBrandGradientState', () => {
  it('says the list is known when the request worked, even if it is empty', async () => {
    vi.useFakeTimers({ now: 4_000_000 })
    const state = await fetchBrandGradientState(clientReturning(null) as never)
    expect(state).toEqual({ known: true, gradients: [] })
  })

  it('says the list is unknown when the request failed, not that there are none', async () => {
    vi.useFakeTimers({ now: 5_000_000 })
    const client = { fetch: vi.fn(() => Promise.reject(new Error('offline'))) }
    expect(await fetchBrandGradientState(client as never)).toEqual({ known: false, gradients: [] })
  })

  it('asks again straight after a failure, so the check runs once Studio can reach the project', async () => {
    vi.useFakeTimers({ now: 6_000_000 })
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([{ name: 'Forest dusk', stops: ['#0b3d2e', '#1b2a3b'] }])
    const client = { fetch }
    expect((await fetchBrandGradientState(client as never)).known).toBe(false)
    // No time has passed: a failure is not shared.
    const again = await fetchBrandGradientState(client as never)
    expect(again.known).toBe(true)
    expect(again.gradients.map(({ slug }) => slug)).toEqual(['forest-dusk'])
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

describe('gradientFieldWarning', () => {
  const dusk = {
    slug: 'forest-dusk',
    name: 'Forest dusk',
    angle: 135,
    stops: ['#0b3d2e', '#1b2a3b'],
    css: '',
  }

  it('never calls a gradient removed when the list could not be read, and keeps the choice', () => {
    const message = gradientFieldWarning({
      slug: 'forest-dusk',
      tone: 'inverse',
      state: { known: false, gradients: [] },
    })
    expect(message).toMatch(/couldn’t load the brand gradients/)
    expect(message).toMatch(/choice is kept/)
    expect(message).not.toMatch(/no longer/)
  })

  it('calls it removed only when the list was read and it is not there', () => {
    expect(
      gradientFieldWarning({
        slug: 'gone',
        tone: 'inverse',
        state: { known: true, gradients: [dusk] },
      }),
    ).toMatch(/no longer in Brand colours/)
  })

  it('says nothing for a readable gradient the tone reads on', () => {
    expect(
      gradientFieldWarning({
        slug: 'forest-dusk',
        tone: 'inverse',
        state: { known: true, gradients: [dusk] },
      }),
    ).toBe(true)
  })
})
