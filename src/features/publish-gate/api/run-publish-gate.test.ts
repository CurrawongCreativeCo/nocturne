import { describe, expect, it, vi } from 'vitest'

import { runPublishGate, type AuditEntry, type GateDeps } from './run-publish-gate'
import type { Member, Transaction } from '../utils/authors'

type Plain = Record<string, unknown>

const PUBLISHED_AT = '2026-10-20T00:00:00Z'
const live = (): Plain => ({
  _id: 'about',
  _type: 'page',
  _rev: 'pub1',
  _updatedAt: PUBLISHED_AT,
  title: 'About',
  slug: { _type: 'slug', current: 'about' },
})
const draft = (extra: Plain = {}): Plain => ({
  ...live(),
  _id: 'drafts.about',
  _rev: 'draft1',
  title: 'About us',
  ...extra,
})
const tx = (author: string, at = '2026-10-25T00:00:00Z'): Transaction => ({
  id: `${author}-tx`,
  author,
  timestamp: at,
})

interface World {
  draft?: Plain
  published?: Plain
  transactions: Transaction[]
  complete: boolean
  members: Member[]
  requester: { id: string; roleNames: string[] } | null
  redirects: { source: string; destination: string }[]
  slugHolders: string[]
  assets: Plain[]
}

/** An in-memory dataset behind the gate's dependencies, with the Actions API's revision guards. */
function setup(over: Partial<World> = {}, hooks: { onTransactions?: (world: World) => void } = {}) {
  const world: World = {
    draft: draft(),
    published: live(),
    transactions: [tx('jo')],
    complete: true,
    members: [{ resourceUserId: 'jo', roleNames: ['contributor'] }],
    requester: { id: 'jo', roleNames: ['contributor'] },
    redirects: [],
    slugHolders: [],
    assets: [],
    ...over,
  }
  const audits: AuditEntry[] = []
  const published: Plain[] = []
  const calls = {
    identify: 0,
    getDocuments: 0,
    transactions: 0,
    publish: [] as Parameters<GateDeps['publish']>[0][],
  }
  const deps: GateDeps = {
    now: () => new Date('2026-10-26T01:00:00Z'),
    where: { projectId: 'proj', dataset: 'production' },
    identify: () => {
      calls.identify += 1
      return Promise.resolve(world.requester)
    },
    rateLimit: () => ({ allowed: true }),
    getDocuments: () => {
      calls.getDocuments += 1
      return Promise.resolve([
        world.draft && { ...world.draft },
        world.published && { ...world.published },
      ])
    },
    redirects: () => Promise.resolve(world.redirects),
    slugHolders: () => Promise.resolve(world.slugHolders),
    assetDocuments: () => Promise.resolve(world.assets),
    transactions: () => {
      calls.transactions += 1
      const snapshot = { transactions: [...world.transactions], complete: world.complete }
      hooks.onTransactions?.(world)
      return Promise.resolve(snapshot)
    },
    members: () => Promise.resolve(world.members),
    publish: (args) => {
      calls.publish.push(args)
      const stale =
        args.ifDraftRevisionId !== world.draft?._rev ||
        (args.ifPublishedRevisionId !== undefined &&
          args.ifPublishedRevisionId !== world.published?._rev)
      if (stale) return Promise.reject(Object.assign(new Error('revision'), { statusCode: 409 }))
      published.push({ ...world.draft })
      return Promise.resolve()
    },
    audit: (entry) => audits.push(entry),
  }
  return { world, deps, audits, published, calls }
}

const ask = (deps: GateDeps, request: Partial<Parameters<typeof runPublishGate>[1]> = {}) =>
  runPublishGate(deps, { documentId: 'about', token: 'user-token', ...request })

describe('runPublishGate', () => {
  it('publishes the validated revision with both guards and logs once', async () => {
    const { calls, deps, audits, published } = setup()
    const response = await ask(deps)
    expect(response).toMatchObject({
      status: 200,
      body: { status: 'published', revision: 'draft1' },
    })
    expect(calls.publish).toEqual([
      {
        draftId: 'drafts.about',
        publishedId: 'about',
        ifDraftRevisionId: 'draft1',
        ifPublishedRevisionId: 'pub1',
      },
    ])
    expect(published).toHaveLength(1)
    expect(audits).toEqual([
      {
        at: '2026-10-26T01:00:00.000Z',
        outcome: 'published',
        status: 200,
        requester: 'jo',
        authors: ['jo'],
        documentId: 'about',
        type: 'page',
        revision: 'draft1',
        changedPaths: ['title'],
      },
    ])
  })

  it('accepts the draft id and omits the published guard on a first publish', async () => {
    const { calls, deps } = setup({ published: undefined })
    const response = await ask(deps, { documentId: 'drafts.about' })
    expect(response.status).toBe(200)
    expect(calls.publish).toEqual([
      { draftId: 'drafts.about', publishedId: 'about', ifDraftRevisionId: 'draft1' },
    ])
  })

  it('refuses when the draft changes mid-request, and publishes nothing', async () => {
    const { deps, audits, published, world } = setup(
      {},
      {
        // A colleague saves between the gate's read and its publish.
        onTransactions: (current) => {
          current.draft = { ...current.draft, _rev: 'draft2', title: 'Sneaky edit' }
        },
      },
    )
    const response = await ask(deps)
    expect(response.status).toBe(409)
    expect(response.body.message).toMatch(/Someone changed this while you were publishing/)
    expect(published).toHaveLength(0)
    expect(world.draft?._rev).toBe('draft2')
    // The audit line names the revision that was validated, not the one that replaced it.
    expect(audits).toHaveLength(1)
    expect(audits[0]).toMatchObject({ outcome: 'conflict', revision: 'draft1' })
  })

  it('refuses when the published version changes mid-request', async () => {
    const { deps, published } = setup(
      {},
      { onTransactions: (current) => (current.published = { ...current.published, _rev: 'pub2' }) },
    )
    expect((await ask(deps)).status).toBe(409)
    expect(published).toHaveLength(0)
  })

  it('refuses when an author has since been suspended to Viewer', async () => {
    const { calls, deps, audits, published } = setup({
      transactions: [tx('jo'), tx('sam')],
      members: [
        { resourceUserId: 'jo', roleNames: ['contributor'] },
        { resourceUserId: 'sam', roleNames: ['viewer'] },
      ],
    })
    const response = await ask(deps)
    expect(response).toMatchObject({ status: 403, body: { status: 'refused' } })
    expect(calls.publish).toEqual([])
    expect(published).toHaveLength(0)
    expect(audits[0]).toMatchObject({ outcome: 'authors-role-not-allowed', authors: ['jo', 'sam'] })
  })

  it.each([
    ['a robot token', 'p-robot'],
    ['a removed member', 'gone'],
  ])('refuses when %s edited the draft', async (_name, author) => {
    const { calls, deps } = setup({ transactions: [tx('jo'), tx(author)] })
    expect(await ask(deps)).toMatchObject({ status: 403 })
    expect(calls.publish).toEqual([])
  })

  it('ignores authors from before the last publish', async () => {
    const { deps } = setup({ transactions: [tx('jo'), tx('sam', '2026-10-01T00:00:00Z')] })
    expect((await ask(deps)).status).toBe(200)
  })

  it('refuses when the history is incomplete or has no authors', async () => {
    expect((await ask(setup({ complete: false }).deps)).status).toBe(403)
    expect((await ask(setup({ transactions: [] }).deps)).status).toBe(403)
  })

  it('refuses without a token, with an unknown token, and for a Viewer', async () => {
    const anonymous = setup()
    expect((await ask(anonymous.deps, { token: null })).status).toBe(401)
    expect(anonymous.calls.identify).toBe(0)
    expect((await ask(setup({ requester: null }).deps)).status).toBe(401)
    const viewer = setup({ requester: { id: 'v', roleNames: ['viewer'] } })
    expect((await ask(viewer.deps)).status).toBe(403)
    expect(viewer.calls.publish).toEqual([])
  })

  it('rate limits the requester, with Retry-After seconds', async () => {
    const { calls, deps, audits } = setup()
    deps.rateLimit = () => ({ allowed: false, retryAfterMs: 12_300 })
    const response = await ask(deps)
    expect(response).toMatchObject({ status: 429, body: { retryAfterSeconds: 13 } })
    expect(calls.getDocuments).toBe(0)
    expect(audits).toHaveLength(1)
  })

  it('sends a protected change to review and leaves the draft alone', async () => {
    const { calls, deps } = setup({ draft: draft({ access: 'members' }) })
    const response = await ask(deps)
    expect(response).toMatchObject({ status: 202, body: { status: 'review' } })
    expect(response.body.reasons?.[0]).toMatchObject({ kind: 'protected-field', path: ['access'] })
    expect(calls.publish).toEqual([])
  })

  it('sends a slug change with no redirect to review, and publishes it once the redirect exists', async () => {
    const changed = draft({ slug: { _type: 'slug', current: 'about-us' } })
    expect((await ask(setup({ draft: changed }).deps)).status).toBe(202)
    const withRedirect = setup({
      draft: changed,
      redirects: [{ source: '/about', destination: '/about-us' }],
    })
    expect((await ask(withRedirect.deps)).status).toBe(200)
  })

  it('sends an unverified new asset to review', async () => {
    const hash = 'c'.repeat(40)
    const withImage = draft({
      seo: { _type: 'seo', ogImage: { asset: { _ref: `image-${hash}-9x9-png` } } },
    })
    const response = await ask(setup({ draft: withImage, assets: [] }).deps)
    expect(response.status).toBe(202)
    expect(response.body.reasons?.[0]).toMatchObject({ kind: 'unverified-asset' })
  })

  it('answers 422 with the problems for a draft that would not validate', async () => {
    const response = await ask(setup({ draft: draft({ title: '' }) }).deps)
    expect(response).toMatchObject({ status: 422, body: { status: 'invalid' } })
    expect(response.body.problems?.[0]).toMatchObject({ kind: 'missing-field', field: 'title' })
  })

  it('answers 422 for a taken slug', async () => {
    const response = await ask(setup({ slugHolders: ['other'] }).deps)
    expect(response.status).toBe(422)
    expect(response.body.problems?.[0]).toMatchObject({ kind: 'slug-taken' })
  })

  it.each(['delete', 'unpublish'])('never performs %s: it goes to review', async (operation) => {
    const { calls, deps, audits } = setup()
    const response = await ask(deps, { operation })
    expect(response).toMatchObject({ status: 202, body: { status: 'review' } })
    expect(calls.publish).toEqual([])
    expect(calls.transactions).toBe(0)
    expect(audits).toHaveLength(1)
  })

  it('rejects malformed requests before touching Sanity', async () => {
    for (const request of [
      { documentId: undefined },
      { documentId: 42 },
      { documentId: 'versions.r.about' },
      { documentId: 'drafts.drafts.about' },
      { documentId: '../x' },
      { operation: 'purge' },
    ]) {
      const { calls, deps, audits } = setup()
      expect((await ask(deps, request)).status).toBe(400)
      expect(calls.identify).toBe(0)
      expect(audits).toHaveLength(1)
    }
  })

  it('answers 404 when there is no draft, and 422 when the types disagree', async () => {
    expect((await ask(setup({ draft: undefined }).deps)).status).toBe(404)
    const mismatched = setup({ published: { ...live(), _type: 'post' } })
    expect((await ask(mismatched.deps)).status).toBe(422)
  })

  it('fails closed when a lookup fails, and logs no message from Sanity', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { calls, deps, audits } = setup()
    deps.members = () =>
      Promise.reject(Object.assign(new Error('secret document text'), { statusCode: 500 }))
    const response = await ask(deps)
    expect(response.status).toBe(502)
    expect(calls.publish).toEqual([])
    expect(audits).toHaveLength(1)
    expect(String(error.mock.calls[0]?.[0])).not.toMatch(/secret/)
    error.mockRestore()
  })

  it('does not treat agency-only document types as publishable by a Contributor', async () => {
    const redirectDoc = { _id: 'r', _type: 'redirect', _rev: 'r1', source: '/a', destination: '/b' }
    const { deps } = setup({
      draft: { ...redirectDoc, _id: 'drafts.r', _rev: 'r2', destination: '/c' },
      published: redirectDoc,
    })
    expect((await ask(deps, { documentId: 'r' })).status).toBe(202)
  })
})
