import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const fetchMock = vi.fn<(options: unknown) => Promise<unknown>>()
vi.mock('./live', () => ({
  PUBLISHED: { perspective: 'published', stega: false },
  TAGS: { designSettings: 'designSettings' },
  cachedSanityFetch: (options: unknown): Promise<unknown> => fetchMock(options),
}))

import { getSiteDesign } from './site-design'

beforeEach(() => {
  fetchMock.mockReset()
})

describe('getSiteDesign', () => {
  it('returns the colours the page draws and the gradients with their stops', async () => {
    fetchMock.mockResolvedValue({
      data: {
        primary: '#aa3300',
        gradients: [{ name: 'Forest dusk', angle: 135, stops: ['#0b3d2e', '#1b2a3b'] }],
      },
    })
    const design = await getSiteDesign()
    expect(design?.colours.accent).toBe('#aa3300')
    expect(design?.gradients.map(({ slug, stops }) => [slug, stops])).toEqual([
      ['forest-dusk', ['#0b3d2e', '#1b2a3b']],
    ])
  })

  it('has no gradients, but knows it, when Design settings has none', async () => {
    fetchMock.mockResolvedValue({ data: null })
    expect((await getSiteDesign())?.gradients).toEqual([])
  })

  it('returns nothing when the request fails, so a gradient stays unknown and rendering stays conservative', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    await expect(getSiteDesign()).resolves.toBeUndefined()
  })

  it('asks again on the next render after a failure, since a thrown fetch is never cached', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: null })
    expect(await getSiteDesign()).toBeUndefined()
    expect(await getSiteDesign()).toBeDefined()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
