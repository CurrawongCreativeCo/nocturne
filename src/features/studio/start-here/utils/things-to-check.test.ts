import { describe, expect, it } from 'vitest'

import type { START_HERE_QUERY_RESULT } from '@/types/sanity.types'

import { buildThingsToCheck } from './things-to-check'

const NOW = Date.parse('2026-10-15T00:00:00Z')
const DAY = 86_400_000
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString()

const link = (ref: string) => ({
  _type: 'link',
  linkType: 'internal',
  internal: { _type: 'reference', _ref: ref },
})
const hero = (alt?: string) => ({
  _type: 'hero',
  _key: 'h',
  backgroundImage: {
    _type: 'image',
    asset: { _type: 'reference', _ref: 'image-x' },
    ...(alt ? { alt } : {}),
  },
})
const richText = (target: string) => ({
  _type: 'richText',
  _key: 'r',
  body: [{ markDefs: [link(target)] }],
})

type Data = Pick<START_HERE_QUERY_RESULT, 'pages' | 'sharedSections' | 'navigation' | 'drafts'>
const data = (overrides: Partial<Data> = {}): Data => ({
  pages: [],
  sharedSections: [],
  navigation: [],
  drafts: [],
  ...overrides,
})
const options = {
  now: NOW,
  includeSharedSections: false,
  shown: () => true,
  typeTitle: (type: string) => (type === 'page' ? 'Page' : type),
}
const page = (_id: string, title: string | null, pageBuilder: unknown[]) =>
  ({ _id, title, pageBuilder }) as unknown as Data['pages'][number]

describe('buildThingsToCheck', () => {
  it('is empty when nothing needs attention', () => {
    expect(
      buildThingsToCheck(data({ pages: [page('a', 'About', [hero('A photo')])] }), options),
    ).toEqual({
      items: [],
      more: 0,
    })
  })

  it('reports images without a description in plain words', () => {
    const { items } = buildThingsToCheck(data({ pages: [page('a', 'About', [hero()])] }), options)
    expect(items).toEqual([
      expect.objectContaining({
        kind: 'alt',
        id: 'a',
        type: 'page',
        message: '“About” has 1 image without a description',
      }),
    ])
  })

  it('reports a link to a page with no published version', () => {
    const { items } = buildThingsToCheck(
      data({
        pages: [
          page('a', 'Home', [richText('drafts-only')]),
          page('drafts.drafts-only', 'New', []),
        ],
      }),
      options,
    )
    expect(items.map((i) => i.message)).toEqual([
      '“Home” links to a page that is not published yet',
    ])
  })

  it('reports drafts waiting more than seven days, and only those', () => {
    const { items } = buildThingsToCheck(
      data({
        drafts: [
          { _id: 'drafts.old', _type: 'post', _updatedAt: iso(12), title: 'Spring offer' },
          { _id: 'drafts.fresh', _type: 'post', _updatedAt: iso(2), title: 'Fresh' },
        ],
      }),
      options,
    )
    expect(items).toEqual([
      expect.objectContaining({
        kind: 'draft',
        id: 'old',
        message: '“Spring offer” has had changes waiting to be published for 12 days',
      }),
    ])
  })

  it('leaves shared sections to agency staff', () => {
    const shared = {
      sharedSections: [
        { _id: 's', title: 'Footer promo', section: [hero()] },
      ] as unknown as Data['sharedSections'],
    }
    expect(buildThingsToCheck(data(shared), options).items).toEqual([])
    expect(
      buildThingsToCheck(data(shared), { ...options, includeSharedSections: true }).items,
    ).toHaveLength(1)
  })

  it('caps the list at five and counts the rest', () => {
    const pages = Array.from({ length: 8 }, (_, i) => page(`p${i}`, `Page ${i}`, [hero()]))
    const result = buildThingsToCheck(data({ pages }), options)
    expect(result.items).toHaveLength(5)
    expect(result.more).toBe(3)
  })

  it('puts broken links before missing descriptions before old drafts', () => {
    const result = buildThingsToCheck(
      data({
        pages: [page('a', 'A', [hero(), richText('gone')])],
        drafts: [{ _id: 'drafts.d', _type: 'post', _updatedAt: iso(30), title: 'D' }],
      }),
      options,
    )
    expect(result.items.map((i) => i.kind)).toEqual(['link', 'alt', 'draft'])
  })

  it('hides drafts of types that are not shown', () => {
    const result = buildThingsToCheck(
      data({ drafts: [{ _id: 'drafts.r', _type: 'redirect', _updatedAt: iso(30), title: null }] }),
      { ...options, shown: (type) => type !== 'redirect' },
    )
    expect(result.items).toEqual([])
  })
})
