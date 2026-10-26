import type { SanityClient } from 'next-sanity'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'proj'
  process.env.NEXT_PUBLIC_SANITY_DATASET = 'production'
})

const { createGateDeps } = await import('./create-gate-deps')

const actions: unknown[] = []
const client = {
  config: () => ({ token: 'editor-token', apiHost: 'https://api.sanity.io' }),
  getUrl: (path: string) => `https://proj.api.sanity.io/v2026-10-01${path}`,
  action: (action: unknown) => {
    actions.push(action)
    return Promise.resolve({})
  },
} as unknown as SanityClient

const deps = createGateDeps({ client, rateLimit: () => ({ allowed: true }), log: () => undefined })
const requests: { url: string; token: string | null }[] = []

function answer(...responses: unknown[]) {
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    requests.push({ url, token: new Headers(init?.headers).get('authorization') })
    const next = responses.shift()
    return Promise.resolve(
      next instanceof Response ? next : new Response(JSON.stringify(next), { status: 200 }),
    )
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  requests.length = 0
  actions.length = 0
})

describe('identify', () => {
  it("asks Sanity who the caller's own token belongs to", async () => {
    answer({ id: 'jo', roles: [{ name: 'contributor' }, {}] })
    expect(await deps.identify('user-token')).toEqual({ id: 'jo', roleNames: ['contributor'] })
    expect(requests).toEqual([
      { url: 'https://proj.api.sanity.io/v2026-10-01/users/me', token: 'Bearer user-token' },
    ])
  })

  it('returns null for a token Sanity rejects', async () => {
    answer(new Response('no', { status: 401 }))
    expect(await deps.identify('bad')).toBeNull()
  })
})

describe('members', () => {
  it('reads every page, keeps project memberships and matches on resourceUserId', async () => {
    answer(
      {
        data: [
          {
            memberships: [
              {
                resourceType: 'project',
                resourceId: 'proj',
                resourceUserId: 'a',
                roleNames: ['editor'],
              },
              {
                resourceType: 'organization',
                resourceId: 'org',
                resourceUserId: 'org-a',
                roleNames: ['owner'],
              },
            ],
          },
        ],
        nextCursor: 'c2',
      },
      {
        data: [
          {
            memberships: [
              {
                resourceType: 'project',
                resourceId: 'other',
                resourceUserId: 'x',
                roleNames: ['editor'],
              },
            ],
          },
          {
            memberships: [
              { resourceType: 'project', resourceId: 'proj', resourceUserId: 'b', roleNames: [] },
            ],
          },
        ],
        nextCursor: null,
      },
    )
    expect(await deps.members()).toEqual([
      { resourceUserId: 'a', roleNames: ['editor'] },
      { resourceUserId: 'b', roleNames: [] },
    ])
    expect(requests.map((request) => request.url)).toEqual([
      'https://api.sanity.io/v2025-07-11/access/project/proj/users?limit=100',
      'https://api.sanity.io/v2025-07-11/access/project/proj/users?limit=100&nextCursor=c2',
    ])
    expect(requests.every((request) => request.token === 'Bearer editor-token')).toBe(true)
  })

  it('fails when the Access API does, so an unseen author is never read as a robot', async () => {
    answer(new Response('no', { status: 403 }))
    await expect(deps.members()).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('transactions', () => {
  it('reads the draft history without content and marks a full page as incomplete', async () => {
    const line = (n: number) =>
      JSON.stringify({ id: `t${n}`, author: 'jo', timestamp: '2026-10-26T00:00:00Z' })
    answer(new Response([line(1), line(2)].join('\n'), { status: 200 }))
    const result = await deps.transactions('drafts.about')
    expect(result.complete).toBe(true)
    expect(result.transactions).toHaveLength(2)
    expect(requests[0]?.url).toContain('/data/history/production/transactions/drafts.about?')
    expect(requests[0]?.url).toContain('excludeContent=true')
    // Only parameters Sanity's reference documents.
    const query = new URL(requests[0]?.url ?? '').searchParams
    expect([...query.keys()].sort()).toEqual(['excludeContent', 'limit', 'reverse'])

    answer(new Response(Array.from({ length: 500 }, (_, n) => line(n)).join('\n'), { status: 200 }))
    expect((await deps.transactions('drafts.about')).complete).toBe(false)
  })
})

describe('publish', () => {
  it('sends one publish action carrying both revision guards', async () => {
    await deps.publish({
      draftId: 'drafts.about',
      publishedId: 'about',
      ifDraftRevisionId: 'd1',
      ifPublishedRevisionId: 'p1',
    })
    expect(actions).toEqual([
      {
        actionType: 'sanity.action.document.publish',
        draftId: 'drafts.about',
        publishedId: 'about',
        ifDraftRevisionId: 'd1',
        ifPublishedRevisionId: 'p1',
      },
    ])
  })
})
