import { describe, expect, it } from 'vitest'

import {
  collectLinkTargets,
  findBrokenLinkTargets,
  findImagesWithoutAlt,
  findOrphanPages,
  findRedirectProblems,
  resolveVersions,
} from './detect'

const rule = (id: string, source: string, destination: string) => ({ id, source, destination })

describe('findRedirectProblems', () => {
  it('reports nothing for independent redirects and external destinations', () => {
    expect(
      findRedirectProblems([
        rule('a', '/old', '/new'),
        rule('b', '/promo', 'https://example.com/sale'),
      ]),
    ).toEqual([])
  })

  it('reports the start of a chain with every hop', () => {
    expect(
      findRedirectProblems([rule('a', '/a', '/b'), rule('b', '/b', '/c'), rule('c', '/c', '/d')]),
    ).toEqual([
      { id: 'a', kind: 'chain', path: ['/a', '/b', '/c', '/d'] },
      { id: 'b', kind: 'chain', path: ['/b', '/c', '/d'] },
    ])
  })

  it('ends a chain at an external URL', () => {
    expect(
      findRedirectProblems([rule('a', '/a', '/b'), rule('b', '/b', 'https://example.com')]),
    ).toEqual([{ id: 'a', kind: 'chain', path: ['/a', '/b', 'https://example.com'] }])
  })

  it('matches paths ignoring case and trailing slashes, like the site does', () => {
    expect(findRedirectProblems([rule('a', '/a', '/B/'), rule('b', '/b', '/c')])).toEqual([
      { id: 'a', kind: 'chain', path: ['/a', '/B/', '/c'] },
    ])
  })

  it('reports both redirects of a two-way loop', () => {
    expect(findRedirectProblems([rule('a', '/a', '/b'), rule('b', '/b', '/a')])).toEqual([
      { id: 'a', kind: 'loop', path: ['/a', '/b', '/a'] },
      { id: 'b', kind: 'loop', path: ['/b', '/a', '/b'] },
    ])
  })

  it('reports a redirect to itself as a loop', () => {
    expect(findRedirectProblems([rule('a', '/a', '/A/')])).toEqual([
      { id: 'a', kind: 'loop', path: ['/a', '/A/'] },
    ])
  })

  it('reports a chain that runs into a loop as a loop, once per redirect that enters it', () => {
    const problems = findRedirectProblems([
      rule('in', '/in', '/a'),
      rule('a', '/a', '/b'),
      rule('b', '/b', '/a'),
    ])
    expect(problems.map(({ id, kind }) => [id, kind])).toEqual([
      ['in', 'loop'],
      ['a', 'loop'],
      ['b', 'loop'],
    ])
  })

  it('ignores a redirect shadowed by an earlier one with the same source', () => {
    expect(
      findRedirectProblems([rule('a', '/a', '/b'), rule('x', '/b', '/c'), rule('y', '/B', '/a')]),
    ).toEqual([{ id: 'a', kind: 'chain', path: ['/a', '/b', '/c'] }])
  })
})

describe('findOrphanPages', () => {
  const pages = [
    { id: 'home', slug: 'home' },
    { id: 'about', slug: 'about' },
    { id: 'team', slug: 'about/team' },
    { id: 'lonely', slug: 'lonely' },
  ]

  it('returns pages nothing links to, never the home page', () => {
    expect(findOrphanPages(pages, [{ from: 'siteNavigation', to: 'about' }])).toEqual([
      { id: 'team', slug: 'about/team' },
      { id: 'lonely', slug: 'lonely' },
    ])
  })

  it('counts links from the navigation and from other pages', () => {
    const links = [
      { from: 'siteNavigation', to: 'about' },
      { from: 'about', to: 'team' },
      { from: 'home', to: 'lonely' },
    ]
    expect(findOrphanPages(pages, links)).toEqual([])
  })

  it('ignores a page linking to itself', () => {
    expect(findOrphanPages(pages, [{ from: 'lonely', to: 'lonely' }]).map(({ id }) => id)).toEqual([
      'about',
      'team',
      'lonely',
    ])
  })

  it('treats every page without a link as an orphan when nothing links anywhere', () => {
    expect(findOrphanPages(pages, []).map(({ id }) => id)).toEqual(['about', 'team', 'lonely'])
  })
})

const internal = (id: string, linkType = 'internal') => ({
  _type: 'link',
  linkType,
  internal: { _type: 'reference', _ref: id },
})

describe('collectLinkTargets', () => {
  it('finds internal links in CTAs, menus and rich text annotations', () => {
    const doc = {
      headerNav: [{ _type: 'navItem', label: 'A', link: internal('a') }],
      pageBuilder: [
        { _type: 'hero', ctas: [{ _type: 'cta', link: internal('b') }] },
        {
          _type: 'richText',
          body: [{ _type: 'block', markDefs: [{ _key: 'k', ...internal('c') }] }],
        },
      ],
    }
    expect(collectLinkTargets(doc)).toEqual(['a', 'b', 'c'])
  })

  it('ignores external links, including a stale reference left behind by switching type', () => {
    expect(
      collectLinkTargets([internal('a', 'external'), { _type: 'link', linkType: 'external' }]),
    ).toEqual([])
  })

  it('handles empty and non-object values', () => {
    expect(collectLinkTargets(null)).toEqual([])
    expect(collectLinkTargets('text')).toEqual([])
    expect(collectLinkTargets([{ _type: 'link', linkType: 'internal' }])).toEqual([])
  })
})

describe('findBrokenLinkTargets', () => {
  it('returns each target without a published page once', () => {
    const doc = [internal('live'), internal('draft-only'), internal('draft-only'), internal('gone')]
    expect(findBrokenLinkTargets(doc, new Set(['live']))).toEqual(['draft-only', 'gone'])
  })
})

describe('findImagesWithoutAlt', () => {
  const asset = { _type: 'reference', _ref: 'image-abc-1x1-png' }
  const image = (alt?: string) => ({ _type: 'image', asset, ...(alt === undefined ? {} : { alt }) })

  it('flags the hero background, Image + text image, testimonial photos and rich text images', () => {
    const sections = [
      { _type: 'hero', backgroundImage: image() },
      { _type: 'mediaText', image: image(''), body: [image('   ')] },
      { _type: 'testimonials', items: [{ avatar: image() }, { avatar: image('Alex') }] },
      { _type: 'richText', body: [{ _type: 'block' }, image()] },
      { _type: 'faq', items: [{ answer: [image()] }] },
    ]
    expect(findImagesWithoutAlt(sections)).toEqual([
      'Hero background image',
      'Image + text image',
      'Rich text image',
      'Testimonial photo',
      'Rich text image',
      'Rich text image',
    ])
  })

  it('ignores images with alt text, and fields with no image or no asset', () => {
    const sections = [
      { _type: 'hero', backgroundImage: image('A view') },
      { _type: 'hero', backgroundImage: { _type: 'image', alt: '' } },
      { _type: 'mediaText' },
      { _type: 'testimonials', items: [{ name: 'No photo' }] },
      { _type: 'richText', body: [image('Chart')] },
    ]
    expect(findImagesWithoutAlt(sections)).toEqual([])
  })

  it('leaves logos and other decorative images alone', () => {
    const sections = [{ _type: 'logoCloud', logos: [{ name: 'Acme', image: image() }] }]
    expect(findImagesWithoutAlt(sections)).toEqual([])
  })

  it('handles a missing page builder', () => {
    expect(findImagesWithoutAlt(null)).toEqual([])
  })
})

describe('resolveVersions', () => {
  it('prefers the draft and reports whether a published version exists', () => {
    const docs = [
      { _id: 'drafts.a', title: 'Draft A' },
      { _id: 'a', title: 'Published A' },
      { _id: 'b', title: 'Published B' },
      { _id: 'drafts.c', title: 'Draft C' },
    ]
    expect(resolveVersions(docs)).toEqual([
      { id: 'a', doc: docs[0], published: true },
      { id: 'b', doc: docs[2], published: true },
      { id: 'c', doc: docs[3], published: false },
    ])
  })
})
