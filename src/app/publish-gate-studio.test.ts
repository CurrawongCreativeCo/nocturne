/**
 * The Studio's Publish for Contributors against the real gate (README, "Publish gate"): the client
 * helper's request goes to `runPublishGate` over an in-memory dataset, and its answer is turned into
 * the words the dialog shows. Three journeys: an allowed edit publishes, a protected edit goes to
 * review naming the field, and a draft that changes after the gate read it is refused.
 */
import { describe, expect, it } from 'vitest'

import { runPublishGate, type GateDeps } from '@/features/publish-gate/api/run-publish-gate'
import { requestPublish } from '@/features/studio/utils/publish-gate-client'

type Plain = Record<string, unknown>

const live = (): Plain => ({
  _id: 'about',
  _type: 'page',
  _rev: 'pub1',
  _updatedAt: '2026-10-20T00:00:00Z',
  title: 'About',
  slug: { _type: 'slug', current: 'about' },
})

function dataset(draftOver: Plain, { changeDuringRead = false } = {}) {
  const world = { draft: { ...live(), _id: 'drafts.about', _rev: 'draft1', ...draftOver } as Plain }
  const published: Plain[] = []
  const deps: GateDeps = {
    now: () => new Date('2026-10-26T01:00:00Z'),
    where: { projectId: 'proj', dataset: 'production' },
    identify: (token) =>
      Promise.resolve(token === 'jo-token' ? { id: 'jo', roleNames: ['contributor'] } : null),
    rateLimit: () => ({ allowed: true }),
    getDocuments: () => Promise.resolve([{ ...world.draft }, live()]),
    redirects: () => Promise.resolve([]),
    slugHolders: () => Promise.resolve([]),
    assetDocuments: () => Promise.resolve([]),
    transactions: () => {
      const snapshot = {
        transactions: [{ id: 't1', author: 'jo', timestamp: '2026-10-25T00:00:00Z' }],
        complete: true,
      }
      // A colleague saves between the gate's read and its publish.
      if (changeDuringRead) world.draft = { ...world.draft, _rev: 'draft2' }
      return Promise.resolve(snapshot)
    },
    members: () => Promise.resolve([{ resourceUserId: 'jo', roleNames: ['contributor'] }]),
    publish: (args) => {
      if (args.ifDraftRevisionId !== world.draft._rev) {
        return Promise.reject(Object.assign(new Error('revision'), { statusCode: 409 }))
      }
      published.push({ ...world.draft })
      return Promise.resolve()
    },
    audit: () => undefined,
  }
  // The route handler's job, without HTTP: bearer token and JSON body in, status and JSON out.
  const fetchRoute = (async (_url: string, init: RequestInit) => {
    const token = new Headers(init.headers).get('authorization')?.replace('Bearer ', '') ?? null
    const body = JSON.parse(init.body as string) as { documentId: string }
    const { status, body: result } = await runPublishGate(deps, {
      documentId: body.documentId,
      token,
    })
    return Response.json(result, { status })
  }) as unknown as typeof fetch
  return { published, fetchRoute }
}

const publish = (fetchRoute: typeof fetch) =>
  requestPublish({
    origin: 'https://example.com',
    documentId: 'about',
    token: 'jo-token',
    fetch: fetchRoute,
  })

describe('Contributor Publish through the gate', () => {
  it('publishes an edit to a field clients may change', async () => {
    const { published, fetchRoute } = dataset({ title: 'About us' })
    const outcome = await publish(fetchRoute)
    expect(outcome.kind).toBe('published')
    expect(published).toHaveLength(1)
  })

  it('sends a protected edit to review and names the field', async () => {
    const { published, fetchRoute } = dataset({ noindex: true })
    const outcome = await publish(fetchRoute)
    expect(outcome.kind).toBe('review')
    expect(outcome.title).toBe('Sent to Currawong for review')
    expect(outcome.fields.join(' ')).toMatch(/noindex|search/i)
    expect(published).toHaveLength(0)
  })

  it('refuses a draft that changed after the gate read it', async () => {
    const { published, fetchRoute } = dataset({ title: 'About us' }, { changeDuringRead: true })
    const outcome = await publish(fetchRoute)
    expect(outcome.kind).toBe('conflict')
    expect(outcome.message).toBe(
      'Someone changed this while you were publishing. Review the latest changes and try again.',
    )
    expect(published).toHaveLength(0)
  })

  it('asks an unknown token to sign in again', async () => {
    const { fetchRoute } = dataset({ title: 'About us' })
    const outcome = await requestPublish({
      origin: 'https://example.com',
      documentId: 'about',
      token: 'stranger',
      fetch: fetchRoute,
    })
    expect(outcome.kind).toBe('refused')
  })
})
