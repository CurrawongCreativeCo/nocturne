/**
 * The publish gate as an attacker or an unlucky Contributor meets it (README, "Publish gate"): the
 * real `POST /api/publish` handler, `createGateDeps` and `runPublishGate`, talking real HTTP to a
 * stateful fake of Sanity's API (publish-gate-fake-sanity.ts). Every refusal checks the dataset, not
 * just the status: the published document must be exactly what it was, and no publish may have
 * reached Sanity. The Studio button's own states are tested in features/studio.
 */
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { startFakeSanity, type FakeSanity } from './publish-gate-fake-sanity'

vi.mock('server-only', () => ({}))
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'proj'
  process.env.NEXT_PUBLIC_SANITY_DATASET = 'production'
})

const flags = vi.hoisted(() => ({ publishGate: true, host: '' }))
vi.mock('next/server', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  connection: () => Promise.resolve(),
}))
vi.mock('@/config/profile', () => ({ isFeatureEnabled: () => flags.publishGate }))
vi.mock('@/lib/sanity/write-client', async () => {
  const { createClient } = await import('next-sanity')
  return {
    getWriteClient: () =>
      createClient({
        projectId: 'proj',
        dataset: 'production',
        apiVersion: '2026-10-01',
        token: process.env.SANITY_WRITE_TOKEN,
        apiHost: flags.host,
        useProjectHostname: false,
        useCdn: false,
        perspective: 'raw',
        stega: false,
      }),
  }
})

type Plain = Record<string, unknown>

const slug = (current: string) => ({ _type: 'slug', current })
const hero = (extra: Plain = {}) => ({ _type: 'hero', _key: 'h1', heading: 'Hello', ...extra })
const livePage = (): Plain => ({
  _id: 'about',
  _type: 'page',
  _rev: 'pub-rev',
  _updatedAt: '2026-10-20T00:00:00Z',
  title: 'About',
  slug: slug('about'),
  pageBuilder: [hero()],
})
const draftOf = (extra: Plain = {}): Plain => ({
  ...livePage(),
  _id: 'drafts.about',
  _rev: 'draft-rev',
  ...extra,
})

let lake: FakeSanity
let post: (init?: {
  body?: unknown
  token?: string | null
  headers?: Record<string, string>
}) => Promise<{ status: number; body: Plain; headers: Headers; text: string }>
let warnings: string[]

beforeEach(async () => {
  lake = await startFakeSanity()
  flags.publishGate = true
  flags.host = lake.url
  process.env.SANITY_WRITE_TOKEN = lake.editorToken
  lake.users = [
    { token: 'jo-token', id: 'jo', roles: ['contributor'] },
    { token: 'ed-token', id: 'ed', roles: ['editor'] },
    { token: 'viewer-token', id: 'vi', roles: ['viewer'] },
    { token: 'custom-token', id: 'cu', roles: ['custom-role'] },
    { token: 'ann-token', id: 'ann', roles: ['contributor'] },
    { token: 'gone-token', id: 'gone', roles: ['contributor'], removed: true },
  ]
  lake.docs.set('about', livePage())
  lake.save(draftOf({ title: 'About us' }), 'jo')
  lake.save({ ...draftOf({ title: 'About us' }) }, 'jo')
  setRev('drafts.about', 'draft-rev')

  vi.resetModules() // fresh rate limiters for every test
  const { POST } = await import('./api/publish/route')
  warnings = []
  vi.spyOn(console, 'warn').mockImplementation((line: unknown) => void warnings.push(String(line)))
  vi.spyOn(console, 'error').mockImplementation((line: unknown) => void warnings.push(String(line)))
  post = async ({ body = { documentId: 'about' }, token = 'jo-token', headers = {} } = {}) => {
    const response = await POST(
      new NextRequest('http://localhost/api/publish', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }),
    )
    const text = await response.text()
    return {
      status: response.status,
      body: text ? (JSON.parse(text) as Plain) : {},
      headers: response.headers,
      text,
    }
  }
})

afterEach(async () => {
  vi.restoreAllMocks()
  await lake.close()
})

/** Fixes a document's revision so the guards under test have a known value. */
const setRev = (id: string, rev: string) => {
  const doc = lake.docs.get(id)
  if (doc) doc._rev = rev
}
const publishedAbout = () => structuredClone(lake.docs.get('about'))
const draftAbout = () => lake.docs.get('drafts.about')

/** A refusal changed nothing: the live document is identical, the draft is still there, no publish was sent. */
function expectNothingPublished(before: Plain | undefined) {
  expect(publishedAbout()).toEqual(before)
  expect(draftAbout()).toBeDefined()
  expect(lake.actions).toHaveLength(0)
}

/** Replaces the draft the way someone using the API directly (not Studio) could. */
const editDraft = (extra: Plain, author = 'jo') => {
  lake.history.set('drafts.about', [])
  lake.save(draftOf(extra), author)
}

describe('1. a Contributor publishes a permitted change', () => {
  it('goes live, with the Editor token and both revision guards', async () => {
    const before = publishedAbout()
    const { status, body } = await post()
    expect(status).toBe(200)
    expect(body.status).toBe('published')
    expect(publishedAbout()).toMatchObject({ _id: 'about', title: 'About us' })
    expect(publishedAbout()).not.toEqual(before)
    expect(draftAbout()).toBeUndefined()
    expect(lake.actions).toHaveLength(1)
    expect(lake.actions[0]?.token).toBe(lake.editorToken)
    expect(JSON.stringify(lake.actions[0]?.body)).toContain('"ifPublishedRevisionId":"pub-rev"')
    expect(JSON.stringify(lake.actions[0]?.body)).toContain('"ifDraftRevisionId":"draft-rev"')
  })

  it('accepts a new section whose protected fields hold their starting values', async () => {
    editDraft({
      title: 'About us',
      pageBuilder: [
        hero(),
        { _type: 'richText', _key: 'r1', body: [], access: 'public', style: { tone: 'surface' } },
      ],
    })
    expect((await post()).status).toBe(200)
  })
})

describe('2 and 3. protected fields, however they were written', () => {
  const protectedEdits: Record<string, Plain> = {
    'a page-level design field': { minimalLayout: true },
    'who can see the page': { access: 'members' },
    "a section's design field": { pageBuilder: [hero({ imageShape: 'circle' })] },
    "a section's tone": {
      pageBuilder: [hero({ style: { _type: 'sectionStyle', tone: 'accent' } })],
    },
    'hiding the page from search': { seo: { _type: 'seo', noIndex: true } },
    'a field the schema does not have': { sneakyField: 'x' },
    'a new section with a changed tone': {
      pageBuilder: [hero(), { _type: 'richText', _key: 'r1', style: { tone: 'accent' } }],
    },
    'a new section hiding behind members only': {
      pageBuilder: [hero(), { _type: 'richText', _key: 'r1', access: 'members' }],
    },
  }

  for (const [name, edit] of Object.entries(protectedEdits)) {
    it(`sends ${name} to review and publishes nothing`, async () => {
      editDraft({ title: 'About us', ...edit })
      const before = publishedAbout()
      const { status, body } = await post()
      expect(status).toBe(202)
      expect(body.status).toBe('review')
      expect(body.reasons).not.toHaveLength(0)
      expectNothingPublished(before)
    })
  }

  it('catches a protected field being removed, and a section swapped under the same key', async () => {
    const styled = hero({ style: { _type: 'sectionStyle', tone: 'accent' }, imageShape: 'circle' })
    lake.docs.set('about', { ...livePage(), access: 'members', pageBuilder: [styled] })
    const before = publishedAbout()
    const attempts: Plain[] = [
      // Unsetting a protected field is a change to it.
      { access: undefined, pageBuilder: [styled] },
      // The same key with another section type and the design stripped.
      { access: 'members', pageBuilder: [{ _type: 'richText', _key: 'h1', body: [] }] },
      // A copy of a styled section under a new key keeps its design, which is new and not the starting value.
      { access: 'members', pageBuilder: [styled, { ...styled, _key: 'copy' }] },
    ]
    for (const attempt of attempts) {
      editDraft({ title: 'About us', ...attempt })
      setRev('about', 'pub-rev')
      const { status } = await post()
      expect(status).toBe(202)
      expect(publishedAbout()).toEqual(before)
    }
    expect(lake.actions).toHaveLength(0)
  })

  it('catches a protected change slipped in alongside permitted ones, by a Contributor or an Editor', async () => {
    for (const author of ['jo', 'ed']) {
      editDraft({ title: 'Fine edit', access: 'members' }, author)
      const before = publishedAbout()
      expect((await post()).status).toBe(202)
      expect(publishedAbout()).toEqual(before)
    }
    expect(lake.actions).toHaveLength(0)
  })

  it('catches a change to a document type the gate does not know', async () => {
    lake.docs.set('designSettings', {
      _id: 'designSettings',
      _type: 'designSettings',
      _rev: 'd1',
      primary: '#000',
    })
    lake.save({ _id: 'drafts.designSettings', _type: 'designSettings', primary: '#f00' }, 'jo')
    const before = structuredClone(lake.docs.get('designSettings'))
    const { status } = await post({ body: { documentId: 'designSettings' } })
    expect(status).toBe(202)
    expect(lake.docs.get('designSettings')).toEqual(before)
    expect(lake.actions).toHaveLength(0)
  })

  it('refuses to change what kind of document it is', async () => {
    editDraft({ _type: 'post' })
    const before = publishedAbout()
    expect((await post()).status).toBe(422)
    expectNothingPublished(before)
  })

  it('sends a changed address with no redirect to review, and allows it with one', async () => {
    editDraft({ slug: slug('about-us') })
    const before = publishedAbout()
    expect((await post()).status).toBe(202)
    expectNothingPublished(before)

    lake.docs.set('redirect-1', {
      _id: 'redirect-1',
      _type: 'redirect',
      source: '/about',
      destination: '/about-us',
    })
    expect((await post()).status).toBe(200)
    expect(publishedAbout()).toMatchObject({ slug: slug('about-us') })
  })

  it('sends a picture whose asset the gate cannot verify to review', async () => {
    editDraft({
      pageBuilder: [
        hero({
          image: { _type: 'image', asset: { _type: 'reference', _ref: 'image-abc123-10x10-png' } },
        }),
      ],
    })
    const before = publishedAbout()
    expect((await post()).status).toBe(202)
    expectNothingPublished(before)
  })

  it('never deletes or unpublishes: both go to review and the live page stays', async () => {
    for (const operation of ['delete', 'unpublish']) {
      const before = publishedAbout()
      const { status } = await post({ body: { documentId: 'about', operation } })
      expect(status).toBe(202)
      expectNothingPublished(before)
    }
  })
})

describe('4 and 5. who is asking', () => {
  it('rejects a request with no token, a bad token, or a token sent the wrong way', async () => {
    const before = publishedAbout()
    expect((await post({ token: null })).status).toBe(401)
    expect((await post({ token: 'nobody' })).status).toBe(401)
    expect(
      (await post({ token: null, headers: { authorization: 'Basic am8tdG9rZW4=' } })).status,
    ).toBe(401)
    expect(
      (await post({ token: null, body: { documentId: 'about', token: 'jo-token' } })).status,
    ).toBe(401)
    expect(
      (await post({ token: null, headers: { cookie: 'sanitySession=jo-token' } })).status,
    ).toBe(401)
    expectNothingPublished(before)
  })

  it('does not take the editor token as proof of a person', async () => {
    expect((await post({ token: lake.editorToken })).status).toBe(401)
    expect(lake.actions).toHaveLength(0)
  })

  it('refuses Viewers and custom roles', async () => {
    const before = publishedAbout()
    expect((await post({ token: 'viewer-token' })).status).toBe(403)
    expect((await post({ token: 'custom-token' })).status).toBe(403)
    expectNothingPublished(before)
  })

  it('ignores identity and roles claimed in the request body or headers', async () => {
    const before = publishedAbout()
    const { status } = await post({
      token: 'viewer-token',
      body: { documentId: 'about', userId: 'jo', author: 'jo', roles: ['editor'], requester: 'ed' },
      headers: { 'x-sanity-user': 'jo', 'x-user-id': 'ed' },
    })
    expect(status).toBe(403)
    expectNothingPublished(before)
  })

  it('refuses a draft anyone no longer permitted has touched', async () => {
    for (const author of ['vi', 'cu', 'gone', 'p-robot', 'stranger']) {
      lake.history.set('drafts.about', [
        { id: 'a', author: 'jo', timestamp: '2026-10-25T00:00:00Z' },
        { id: 'b', author, timestamp: '2026-10-25T01:00:00Z' },
      ])
      const before = publishedAbout()
      expect((await post()).status).toBe(403)
      expectNothingPublished(before)
    }
  })

  it('refuses a draft it cannot attribute, or whose history is too long to check', async () => {
    lake.history.set('drafts.about', [])
    expect((await post()).status).toBe(403)
    lake.history.set(
      'drafts.about',
      Array.from({ length: 500 }, (_, i) => ({
        id: `t${i}`,
        author: 'jo',
        timestamp: '2026-10-25T00:00:00Z',
      })),
    )
    expect((await post()).status).toBe(403)
    expectNothingPublished(publishedAbout())
  })
})

describe('6. which document', () => {
  const cases = [
    'versions.rel.about',
    'drafts.drafts.about',
    '_.groups.x',
    '../about',
    'about/../x',
    '',
    123,
    null,
    ['about'],
  ]
  for (const documentId of cases) {
    it(`rejects the target ${JSON.stringify(documentId)} before touching Sanity`, async () => {
      const before = publishedAbout()
      const { status } = await post({ body: { documentId } })
      expect(status).toBe(400)
      expectNothingPublished(before)
    })
  }

  it('answers 404 for a document with no draft, and never invents a publish', async () => {
    lake.docs.set('other', {
      _id: 'other',
      _type: 'page',
      _rev: 'o1',
      title: 'Other',
      slug: slug('other'),
    })
    const { status } = await post({ body: { documentId: 'other' } })
    expect(status).toBe(404)
    expect(lake.actions).toHaveLength(0)
  })

  it('rejects a body that is not JSON', async () => {
    expect((await post({ body: 'not json' })).status).toBe(400)
    expect(lake.actions).toHaveLength(0)
  })
})

describe('7. stale revisions and concurrent edits', () => {
  it('refuses when a colleague saves between the gate reading and publishing', async () => {
    const before = publishedAbout()
    lake.beforeAction = () => {
      // A protected change lands after the gate validated the earlier draft.
      lake.save(draftOf({ title: 'About us', access: 'members' }), 'ann')
    }
    const { status, body } = await post()
    expect(status).toBe(409)
    expect(body.message).toBe(
      'Someone changed this while you were publishing. Review the latest changes and try again.',
    )
    expect(publishedAbout()).toEqual(before)
    expect(draftAbout()).toMatchObject({ access: 'members' })
  })

  it('refuses when the live page changes after the gate read it', async () => {
    lake.beforeAction = () => {
      lake.docs.set('about', { ...livePage(), _rev: 'pub-rev-2', title: 'Edited by the agency' })
    }
    const { status } = await post()
    expect(status).toBe(409)
    expect(publishedAbout()).toMatchObject({ title: 'Edited by the agency', _rev: 'pub-rev-2' })
    expect(draftAbout()).toBeDefined()
  })

  it('lets only one of two simultaneous publishes through', async () => {
    const results = await Promise.all([post(), post()])
    expect(results.filter((result) => result.status === 200)).toHaveLength(1)
    expect(
      results.some(
        (result) => result.status === 200 || result.status === 409 || result.status >= 500,
      ),
    ).toBe(true)
    expect(publishedAbout()).toMatchObject({ title: 'About us' })
    expect(draftAbout()).toBeUndefined()
  })
})

describe('8. Sanity failures never publish', () => {
  const reads = ['doc', 'query', 'history', 'access'] as const
  for (const fault of reads) {
    it(`answers 502 and publishes nothing when the ${fault} lookup fails`, async () => {
      // A page with a redirect-relevant change so the query lookup is made.
      if (fault === 'query') editDraft({ slug: slug('about-us') })
      lake.faults.add(fault)
      const before = publishedAbout()
      const { status } = await post()
      expect(status).toBe(502)
      expectNothingPublished(before)
    })
  }

  it('fails closed (401) when Sanity cannot say who the caller is', async () => {
    lake.faults.add('users-me')
    const before = publishedAbout()
    expect((await post()).status).toBe(401)
    expectNothingPublished(before)
  })

  it('answers 502 and leaves everything as it was when the publish call fails', async () => {
    lake.faults.add('actions')
    const before = publishedAbout()
    const { status } = await post()
    expect(status).toBe(502)
    expect(publishedAbout()).toEqual(before)
    expect(draftAbout()).toBeDefined()
  })
})

describe('9. validation failures', () => {
  it('leaves the live page alone when a required field is empty', async () => {
    editDraft({ title: '   ' })
    const before = publishedAbout()
    const { status, body } = await post()
    expect(status).toBe(422)
    expect(body.problems).not.toHaveLength(0)
    expectNothingPublished(before)
  })

  it('leaves the live page alone when the address is taken or reserved', async () => {
    lake.docs.set('team', {
      _id: 'team',
      _type: 'page',
      _rev: 't1',
      title: 'Team',
      slug: slug('team'),
    })
    editDraft({ slug: slug('team') })
    const before = publishedAbout()
    expect((await post()).status).toBe(422)
    editDraft({ slug: slug('studio') })
    expect((await post()).status).toBe(422)
    expect(publishedAbout()).toEqual(before)
    expect(lake.actions).toHaveLength(0)
  })
})

describe('10. Editors and agency staff', () => {
  it('an Editor can still publish a permitted change through the route', async () => {
    lake.history.set('drafts.about', [])
    lake.save(draftOf({ title: 'Editor edit' }), 'ed')
    const { status } = await post({ token: 'ed-token' })
    expect(status).toBe(200)
    expect(publishedAbout()).toMatchObject({ title: 'Editor edit' })
  })

  it('the route does not stand in the way of an Editor publishing in Sanity itself', () => {
    // Editors keep Sanity's own Publish (src/features/studio/actions/publish-through-gate.test.tsx);
    // the gate only ever adds a path for Contributors, and nothing here removes a permission.
    expect(lake.users.find((user) => user.id === 'ed')?.roles).toEqual(['editor'])
  })
})

describe('off by default, and nothing leaks', () => {
  it('answers 404 and calls Sanity not at all when the feature is off or the token is missing', async () => {
    const requests = vi.spyOn(globalThis, 'fetch')
    flags.publishGate = false
    expect((await post()).status).toBe(404)
    flags.publishGate = true
    delete process.env.SANITY_WRITE_TOKEN
    expect((await post()).status).toBe(404)
    expect(requests).not.toHaveBeenCalled()
    expect(lake.actions).toHaveLength(0)
  })

  it('keeps tokens, hosts and document text out of responses and the audit log', async () => {
    lake.faults.add('doc')
    const failure = await post()
    lake.faults.clear()
    editDraft({ title: 'Secret launch title', access: 'members' })
    const review = await post()
    const published = await (async () => {
      editDraft({ title: 'Another private title' })
      return post()
    })()

    for (const response of [failure, review, published]) {
      for (const secret of [
        lake.editorToken,
        'jo-token',
        lake.url,
        'Secret launch title',
        'Another private title',
      ]) {
        expect(response.text).not.toContain(secret)
      }
      expect(response.headers.get('cache-control')).toBe('private, no-store')
    }
    const log = warnings.join('\n')
    expect(log).toContain('publish-gate')
    for (const secret of [
      lake.editorToken,
      'jo-token',
      lake.url,
      'Secret launch title',
      'Another private title',
    ]) {
      expect(log).not.toContain(secret)
    }
  })

  it('rate limits one person after ten publishes a minute, without publishing', async () => {
    lake.docs.delete('drafts.about')
    let last = 0
    for (let i = 0; i < 11; i += 1) last = (await post()).status
    expect(last).toBe(429)
    expect(lake.actions).toHaveLength(0)
  })
})
