import { describe, expect, it, vi } from 'vitest'

// The query module reads the Sanity project at import time; any value will do for this test.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||= 'testproject'
  process.env.NEXT_PUBLIC_SANITY_DATASET ||= 'production'
})

// The cache helpers are server-only modules, which throw outside a server bundle.
vi.mock('server-only', () => ({}))
vi.mock('@/lib/sanity/live', () => ({
  cachedSanityFetch: vi.fn(),
  PUBLISHED: { perspective: 'published', stega: false },
  TAGS: { service: 'service', teamMember: 'teamMember', post: 'post', page: 'page' },
}))

import { SERVICE_QUERY } from './service'

describe('SERVICE_QUERY', () => {
  it('reads the people who list the service from the team member side', () => {
    expect(SERVICE_QUERY).toContain('*[_type == "teamMember" && references(^._id)]')
    // Single ownership: the service has no people[] field of its own.
    expect(SERVICE_QUERY).not.toMatch(/\n\s+people\b(?!")/)
  })

  it('reads related articles from the post side, newest first and capped', () => {
    expect(SERVICE_QUERY).toContain(
      '*[_type == "post" && defined(slug.current) && references(^._id)]',
    )
    expect(SERVICE_QUERY).toContain('order(publishedAt desc, _id desc) [0...6]')
  })

  it('leaves members-only pages out of the proof of work, and says whether there are sections', () => {
    // Filtered before the reference is followed: filtering after leaves a null in the array.
    expect(SERVICE_QUERY).toContain(
      'evidence[defined(@->slug.current) && @->access != "members"]->{',
    )
    expect(SERVICE_QUERY).not.toContain('evidence[]->[')
    expect(SERVICE_QUERY).toContain('"hasSections": count(sections[access != "members"]) > 0')
  })

  it('reads the enquiry button, so a missing one is simply absent', () => {
    expect(SERVICE_QUERY).toContain('enquiry { label, variant, link {')
  })
})
