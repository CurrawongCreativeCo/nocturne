import { describe, expect, it } from 'vitest'

import { evaluatePublish, type PolicyInput } from './policy'

const base: PolicyInput = {
  operation: 'publish',
  type: 'page',
  published: null,
  draft: null,
  redirects: [],
  slugHolders: [],
  unverifiedAssets: [],
}

const run = (input: Partial<PolicyInput>) => evaluatePublish({ ...base, ...input })
const slug = (current: string) => ({ _type: 'slug', current })
const asset = (ref: string) => ({ _type: 'image', asset: { _type: 'reference', _ref: ref } })
const kinds = (input: Partial<PolicyInput>) => ({
  outcome: run(input).outcome,
  reasons: run(input).reasons.map((reason) => reason.kind),
  problems: run(input).problems.map((problem) => problem.kind),
})

describe('operations other than publish', () => {
  it.each(['delete', 'unpublish'] as const)(
    'sends %s to review, whatever the document',
    (operation) => {
      const verdict = run({ operation, published: { _type: 'page', title: 'A' }, draft: null })
      expect(verdict.outcome).toBe('review')
      expect(verdict.reasons.map((reason) => reason.kind)).toEqual([operation])
    },
  )

  it('refuses a publish with no draft', () => {
    expect(kinds({ draft: null })).toEqual({
      outcome: 'invalid',
      reasons: [],
      problems: ['no-draft'],
    })
  })
})

describe('page', () => {
  const live = { _type: 'page', title: 'About', slug: slug('about'), pageBuilder: [] }

  it('allows an edit to editable fields', () => {
    const verdict = run({
      published: live,
      draft: { ...live, title: 'About us', seo: { _type: 'seo', metaTitle: 'About' } },
    })
    expect(verdict.outcome).toBe('allow')
    expect(verdict.changedPaths).toEqual(['seo', 'title'])
  })

  it('sends a protected field change to review', () => {
    expect(kinds({ published: live, draft: { ...live, access: 'members' } })).toEqual({
      outcome: 'review',
      reasons: ['protected-field'],
      problems: [],
    })
  })

  it('sends a protected change inside a section to review', () => {
    const hero = { _type: 'hero', _key: 'h1', heading: 'Hi' }
    const verdict = run({
      published: { ...live, pageBuilder: [hero] },
      draft: { ...live, pageBuilder: [{ ...hero, imageShape: 'circle' }] },
    })
    expect(verdict.outcome).toBe('review')
    expect(verdict.reasons[0]).toMatchObject({ path: ['pageBuilder', 'hero', 'imageShape'] })
  })

  it('allows a new section whose protected fields hold their initial values', () => {
    const verdict = run({
      published: live,
      draft: {
        ...live,
        pageBuilder: [
          {
            _type: 'richText',
            _key: 'r1',
            body: [],
            access: 'public',
            style: { _type: 'sectionStyle', tone: 'surface' },
          },
        ],
      },
    })
    expect(verdict.outcome).toBe('allow')
  })

  it('sends a new section with a different tone to review', () => {
    const verdict = run({
      published: live,
      draft: {
        ...live,
        pageBuilder: [
          { _type: 'richText', _key: 'r1', style: { _type: 'sectionStyle', tone: 'accent' } },
        ],
      },
    })
    expect(verdict.outcome).toBe('review')
  })

  it('allows a first publish with the initial protected values', () => {
    const verdict = run({
      draft: {
        _type: 'page',
        title: 'New',
        slug: slug('new'),
        access: 'public',
        minimalLayout: false,
      },
    })
    expect(verdict.outcome).toBe('allow')
  })

  it('sends a new page with a protected value to review', () => {
    expect(
      kinds({ draft: { _type: 'page', title: 'New', slug: slug('new'), minimalLayout: true } }),
    ).toEqual({
      outcome: 'review',
      reasons: ['protected-field'],
      problems: [],
    })
  })

  it('sends a slug change without a redirect to review', () => {
    const verdict = run({ published: live, draft: { ...live, slug: slug('about-us') } })
    expect(verdict.outcome).toBe('review')
    expect(verdict.reasons[0]).toMatchObject({
      kind: 'address-change',
      from: '/about',
      to: '/about-us',
    })
  })

  it('allows a slug change that has a published redirect', () => {
    const verdict = run({
      published: live,
      draft: { ...live, slug: slug('about-us') },
      redirects: [{ source: '/About/', destination: '/about-us' }],
    })
    expect(verdict.outcome).toBe('allow')
  })

  it('does not accept a redirect that goes somewhere else', () => {
    const verdict = run({
      published: live,
      draft: { ...live, slug: slug('about-us') },
      redirects: [{ source: '/about', destination: '/contact' }],
    })
    expect(verdict.outcome).toBe('review')
  })

  it('treats removing the slug as invalid (required)', () => {
    expect(kinds({ published: live, draft: { ...live, slug: undefined } })).toMatchObject({
      outcome: 'invalid',
      problems: ['missing-field'],
    })
  })

  it('reports required fields, blank text included', () => {
    const verdict = run({ draft: { _type: 'page', title: '   ' } })
    expect(verdict.problems.map((problem) => problem.field)).toEqual(['title', 'slug'])
  })

  it('refuses a taken slug', () => {
    expect(kinds({ draft: { ...live }, slugHolders: ['other-page'] })).toMatchObject({
      outcome: 'invalid',
      problems: ['slug-taken'],
    })
  })

  it('refuses a reserved or malformed slug', () => {
    expect(kinds({ draft: { ...live, slug: slug('studio/x') } }).problems).toEqual(['slug-invalid'])
    expect(kinds({ draft: { ...live, slug: slug('About Us') } }).problems).toEqual(['slug-invalid'])
  })

  it('sends an unverified new asset to review', () => {
    const verdict = run({
      published: live,
      draft: { ...live, seo: { ogImage: asset('image-aaaa-1x1-png') } },
      unverifiedAssets: ['image-aaaa-1x1-png'],
    })
    expect(verdict.reasons.map((reason) => reason.kind)).toEqual(['unverified-asset'])
  })

  it('puts invalid ahead of review', () => {
    expect(
      kinds({
        draft: { _type: 'page', title: 'X', slug: slug('x'), access: 'members' },
        slugHolders: ['p'],
      }),
    ).toEqual({ outcome: 'invalid', reasons: ['protected-field'], problems: ['slug-taken'] })
  })
})

describe('post', () => {
  const live = {
    _type: 'post',
    title: 'Hello',
    slug: slug('hello'),
    excerpt: 'Hi',
    mainImage: asset('image-a-1x1-png'),
    body: [{ _type: 'block', _key: 'b' }],
    author: { _type: 'reference', _ref: 'jo' },
    publishedAt: '2026-10-01T00:00:00Z',
  }

  it('allows editing the body', () => {
    expect(
      run({ type: 'post', published: live, draft: { ...live, excerpt: 'Hello there' } }).outcome,
    ).toBe('allow')
  })

  it('requires every schema-required field', () => {
    const verdict = run({ type: 'post', draft: { _type: 'post', title: 'Hello' } })
    expect(verdict.problems.map((problem) => problem.field)).toEqual([
      'slug',
      'excerpt',
      'mainImage',
      'body',
      'author',
      'publishedAt',
    ])
  })

  it('needs a redirect when the slug changes, using the blog path', () => {
    const verdict = run({
      type: 'post',
      published: live,
      draft: { ...live, slug: slug('hello-world') },
    })
    expect(verdict.reasons[0]).toMatchObject({ from: '/blog/hello', to: '/blog/hello-world' })
  })

  it('refuses a taken slug', () => {
    expect(
      run({ type: 'post', draft: live, slugHolders: ['p2'] }).problems.map((p) => p.kind),
    ).toEqual(['slug-taken'])
  })
})

describe('author', () => {
  it('requires a name and allows a bio change', () => {
    expect(run({ type: 'author', draft: { _type: 'author' } }).problems).toHaveLength(1)
    const live = { _type: 'author', name: 'Jo' }
    expect(run({ type: 'author', published: live, draft: { ...live, bio: [] } }).outcome).toBe(
      'allow',
    )
  })
})

describe('category', () => {
  const live = { _type: 'category', title: 'News', slug: slug('news') }
  it('requires a title and a slug, and redirects are not available for it', () => {
    expect(run({ type: 'category', draft: { _type: 'category' } }).problems).toHaveLength(2)
    const verdict = run({
      type: 'category',
      published: live,
      draft: { ...live, slug: slug('updates') },
    })
    expect(verdict.reasons.map((reason) => reason.kind)).toEqual(['address-change'])
  })
})

describe('siteIdentity (singleton)', () => {
  const live = { _type: 'siteIdentity', title: 'Acme', allowAiCrawlers: true }
  it('allows a title change and reviews the crawler switch', () => {
    expect(
      run({ type: 'siteIdentity', published: live, draft: { ...live, title: 'Acme Co' } }).outcome,
    ).toBe('allow')
    expect(
      run({ type: 'siteIdentity', published: live, draft: { ...live, allowAiCrawlers: false } })
        .outcome,
    ).toBe('review')
  })
})

describe('siteIdentity required fields', () => {
  it('needs a site title', () => {
    expect(run({ type: 'siteIdentity', draft: { _type: 'siteIdentity' } }).problems).toHaveLength(1)
  })
})

describe('siteNavigation (singleton)', () => {
  it('allows menu edits, reviews the social icons, and accepts initial values on first publish', () => {
    const live = { _type: 'siteNavigation', footerText: 'a' }
    expect(
      run({ type: 'siteNavigation', published: live, draft: { ...live, footerText: 'b' } }).outcome,
    ).toBe('allow')
    expect(
      run({ type: 'siteNavigation', published: live, draft: { ...live, footerShowSocial: true } })
        .outcome,
    ).toBe('review')
    expect(
      run({
        type: 'siteNavigation',
        draft: { _type: 'siteNavigation', footerShowSocial: false, footerSocialStyle: 'plain' },
      }).outcome,
    ).toBe('allow')
  })
})

describe('announcement (singleton)', () => {
  it('allows every field it has', () => {
    const live = { _type: 'announcement', message: 'Hi' }
    expect(
      run({ type: 'announcement', published: live, draft: { ...live, message: 'Hello' } }).outcome,
    ).toBe('allow')
  })
})

describe('businessInfo (singleton)', () => {
  const live = { _type: 'businessInfo', tradingName: 'Acme', timeZone: 'Australia/Brisbane' }
  it('requires the trading name and time zone', () => {
    expect(run({ type: 'businessInfo', draft: { _type: 'businessInfo' } }).problems).toHaveLength(2)
  })
  it('reviews the structured-data fields', () => {
    expect(
      run({ type: 'businessInfo', published: live, draft: { ...live, priceRange: '$$' } }).outcome,
    ).toBe('review')
    expect(
      run({ type: 'businessInfo', published: live, draft: { ...live, phone: '07 5555 0100' } })
        .outcome,
    ).toBe('allow')
  })
})

describe('teamMember', () => {
  const live = { _type: 'teamMember', name: 'Jo', portrait: asset('image-a-1x1-png') }
  it('requires a name and portrait; an optional slug stays unchecked when empty', () => {
    expect(run({ type: 'teamMember', draft: { _type: 'teamMember' } }).problems).toHaveLength(2)
    expect(
      run({ type: 'teamMember', published: live, draft: { ...live, role: 'Lead' } }).outcome,
    ).toBe('allow')
  })
  it('reviews any change to a live profile address (no redirect exists for it)', () => {
    const withSlug = { ...live, slug: slug('jo') }
    const verdict = run({
      type: 'teamMember',
      published: withSlug,
      draft: { ...withSlug, slug: slug('joanne') },
    })
    expect(verdict.outcome).toBe('review')
  })
})

describe('event', () => {
  const live = {
    _type: 'event',
    title: 'Open day',
    slug: slug('open-day'),
    start: '2026-11-01T00:00:00Z',
    status: 'scheduled',
  }
  it('requires title, slug, start and status', () => {
    expect(run({ type: 'event', draft: { _type: 'event' } }).problems).toHaveLength(4)
  })
  it('allows an edit and reviews a new address', () => {
    expect(run({ type: 'event', published: live, draft: { ...live, summary: 'x' } }).outcome).toBe(
      'allow',
    )
    expect(
      run({ type: 'event', published: live, draft: { ...live, slug: slug('open') } }).outcome,
    ).toBe('review')
  })
})

describe('eventCategory', () => {
  it('requires a title', () => {
    expect(run({ type: 'eventCategory', draft: { _type: 'eventCategory' } }).problems).toHaveLength(
      1,
    )
    expect(
      run({ type: 'eventCategory', draft: { _type: 'eventCategory', title: 'Talks' } }).outcome,
    ).toBe('allow')
  })
})

describe('panel', () => {
  const live = {
    _type: 'panel',
    title: 'Offer',
    content: [{ _type: 'panelText', _key: 'p' }],
    presentation: 'auto',
    width: 'medium',
  }
  it('allows a content edit and a new panel with the initial design values', () => {
    expect(run({ type: 'panel', published: live, draft: { ...live, title: 'Deal' } }).outcome).toBe(
      'allow',
    )
    expect(run({ type: 'panel', draft: live }).outcome).toBe('allow')
  })
  it('reviews a different presentation, and a new panel that differs from the initial one', () => {
    expect(
      run({ type: 'panel', published: live, draft: { ...live, presentation: 'drawer' } }).outcome,
    ).toBe('review')
    expect(run({ type: 'panel', draft: { ...live, width: 'wide' } }).outcome).toBe('review')
  })
})

describe('agency-only and unknown types', () => {
  it.each(['redirect', 'form', 'cookieBanner', 'designSettings', 'someFutureType'])(
    'sends every change to %s to review',
    (type) => {
      const verdict = run({
        type,
        published: { _type: type, label: 'a' },
        draft: { _type: type, label: 'b' },
      })
      expect(verdict.outcome).toBe('review')
    },
  )

  it('sends a brand-new redirect to review', () => {
    expect(
      run({ type: 'redirect', draft: { _type: 'redirect', source: '/a', destination: '/b' } })
        .outcome,
    ).toBe('review')
  })
})
