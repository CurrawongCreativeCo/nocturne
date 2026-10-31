import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||= 'testproject'
  process.env.NEXT_PUBLIC_SANITY_DATASET ||= 'production'
})
vi.mock('server-only', () => ({}))
// next-sanity's image helper imports `next/image` without its extension, which Vitest can't resolve.
vi.mock('next-sanity/image', () => ({ Image: () => null }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
}))

vi.mock('@/lib/sanity/live', () => ({ getDraftFetchMode: vi.fn() }))

const getService = vi.hoisted(() => vi.fn())
vi.mock('../api/service', () => ({ getService }))

const { ServiceView } = await import('./service-view')

const MODE = { perspective: 'published', stega: false } as const
const base = {
  _id: 'service-1',
  _type: 'service',
  name: 'Plumbing',
  slug: 'plumbing',
  summary: 'We fix pipes.',
  image: { asset: null },
  people: [],
  articles: [],
  faqs: [{ _key: 'q', question: 'Q?', answer: 'A.' }],
}

describe('ServiceView', () => {
  it('asks for the sections only when the service has some: no sections, no second read', async () => {
    const renderSections = vi.fn(() => null)
    getService.mockResolvedValue({ ...base, hasSections: false })
    await ServiceView({ slug: 'plumbing', renderSections, ...MODE })
    expect(renderSections).not.toHaveBeenCalled()
  })

  it('hands the sections renderer the slug, the mode and the service’s own questions', async () => {
    const renderSections = vi.fn(() => null)
    getService.mockResolvedValue({ ...base, hasSections: true })
    await ServiceView({ slug: 'plumbing', renderSections, ...MODE })
    expect(renderSections).toHaveBeenCalledOnce()
    expect(renderSections).toHaveBeenCalledWith('plumbing', expect.objectContaining(MODE), [
      { question: 'Q?', answer: 'A.', field: 'faqs[_key=="q"]' },
    ])
  })
})
