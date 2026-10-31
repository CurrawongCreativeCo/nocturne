import { describe, expect, it } from 'vitest'

import { resolveTiming } from '@/lib/events/recurrence'

import { graph } from './graph'
import { buildArticle } from './nodes/article'
import { buildEvent } from './nodes/event'
import { buildPerson } from './nodes/person'

const origin = 'https://example.com.au'

/** The same document read in draft mode (`drafts.<id>`), as a release version, and published. */
const readings = ['drafts.doc1', 'versions.rSummer.doc1', 'doc1']

describe('document-keyed @ids (approved R2-3)', () => {
  const timing = resolveTiming({
    start: '2026-03-13T23:00:00Z',
    end: '2026-03-14T01:00:00Z',
    timeZone: 'Australia/Sydney',
  })
  if (!timing) throw new Error('timing should resolve')

  const render = (id: string) =>
    JSON.stringify(
      graph(
        buildPerson({ origin, id, url: `${origin}/team/sam`, name: 'Sam Lee' }),
        buildArticle({
          origin,
          id,
          url: `${origin}/blog/hello`,
          headline: 'Hello',
          datePublished: '2026-10-01T00:00:00Z',
          author: { name: 'Sam Lee', teamMemberId: id },
          language: 'en-AU',
        }),
        buildEvent({
          origin,
          id,
          url: `${origin}/events/pottery`,
          title: 'Pottery',
          occurrence: { start: timing.start, end: timing.end, date: '2026-03-14' },
          timing,
          status: 'scheduled',
        }),
      ),
    )

  it('renders identical @ids in draft mode, in a release version and published', () => {
    const [draft, version, published] = readings.map(render)
    expect(draft).toBe(published)
    expect(version).toBe(published)
  })

  it('never emits a draft or version id', () => {
    for (const id of readings) expect(render(id)).not.toMatch(/drafts\.|versions\./)
  })
})
