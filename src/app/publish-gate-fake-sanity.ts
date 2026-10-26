/**
 * A small stand-in for the parts of Sanity's HTTP API the publish gate uses (users/me, documents,
 * GROQ, History, Access and Actions), serving a stateful in-memory dataset on a real local port.
 * The gate's own code (create-gate-deps.ts and the route) runs unchanged against it over real HTTP,
 * so the tests can assert on the dataset afterwards: a refusal means the published document is
 * byte-for-byte what it was. Test only; faults can be injected per endpoint.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'

import * as groqJs from 'groq-js'

type Plain = Record<string, unknown>

/** groq-js, typed by what this file uses of it. */
const groq = groqJs as unknown as {
  parse(query: string, options: { params: Plain }): unknown
  evaluate(
    tree: unknown,
    options: { dataset: Plain[]; params: Plain },
  ): Promise<{ get(): Promise<unknown> }>
}

export interface FakeUser {
  /** Sent as `Bearer <token>`; /users/me answers with `id` and `roles`. */
  token: string
  /** The id the History API reports as author, and the Access API's `resourceUserId`. */
  id: string
  roles: string[]
  /** Leave out of the Access API's member list (a removed member). */
  removed?: boolean
}

export type Fault = 'users-me' | 'doc' | 'query' | 'history' | 'access' | 'actions'

export interface FakeSanity {
  url: string
  projectId: string
  dataset: string
  editorToken: string
  docs: Map<string, Plain>
  history: Map<string, { id: string; author: string; timestamp: string }[]>
  users: FakeUser[]
  /** Every Actions API call received, with the token it carried. */
  actions: { token: string | null; body: unknown }[]
  /** Answer 500 for this endpoint until cleared. */
  faults: Set<Fault>
  /** Runs once, just before the next Actions API call is applied (a colleague saving at the worst moment). */
  beforeAction: (() => void) | null
  /** A person saves a draft: writes the document and records them as the author. */
  save(draft: Plain, author: string, at?: string): void
  close(): Promise<void>
}

let revision = 0
export const nextRev = () => `rev${++revision}`

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

async function readBody(req: IncomingMessage) {
  let body = ''
  for await (const chunk of req) body += String(chunk)
  return body
}

export async function startFakeSanity(
  options: { projectId?: string; dataset?: string } = {},
): Promise<FakeSanity> {
  const projectId = options.projectId ?? 'proj'
  const dataset = options.dataset ?? 'production'
  const editorToken = 'editor-token'
  const state: FakeSanity = {
    url: '',
    projectId,
    dataset,
    editorToken,
    docs: new Map(),
    history: new Map(),
    users: [],
    actions: [],
    faults: new Set(),
    beforeAction: null,
    save(draft, author, at = '2026-10-25T00:00:00Z') {
      const id = String(draft._id)
      state.docs.set(id, { ...draft, _rev: nextRev(), _updatedAt: at })
      const log = state.history.get(id) ?? []
      // Newest first, like `reverse=true`.
      state.history.set(id, [{ id: `tx-${nextRev()}`, author, timestamp: at }, ...log])
    },
    close: () =>
      new Promise((resolve) =>
        server.close(() => {
          resolve()
        }),
      ),
  }

  const server: Server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const token = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '')?.[1] ?? null
      const path = url.pathname.replace(/^\/v[\w-]+/, '')

      if (path === '/users/me') {
        if (state.faults.has('users-me')) {
          json(res, 500, {})
          return
        }
        const user = state.users.find((candidate) => candidate.token === token)
        if (!user) {
          json(res, 401, { error: 'Unauthorized' })
          return
        }
        json(res, 200, { id: user.id, roles: user.roles.map((name) => ({ name })) })
        return
      }

      // Everything else needs the Editor token, as on a private dataset.
      if (token !== editorToken) {
        json(res, 401, { error: 'Unauthorized' })
        return
      }

      if (path.startsWith(`/access/project/${projectId}/users`)) {
        if (state.faults.has('access')) {
          json(res, 500, {})
          return
        }
        const data = state.users
          .filter((user) => !user.removed)
          .map((user) => ({
            memberships: [
              {
                resourceType: 'project',
                resourceId: projectId,
                resourceUserId: user.id,
                roleNames: user.roles,
              },
            ],
          }))
        json(res, 200, { data, nextCursor: null })
        return
      }

      const doc = new RegExp(`^/data/doc/${dataset}/(.+)$`).exec(path)
      if (doc?.[1]) {
        if (state.faults.has('doc')) {
          json(res, 500, {})
          return
        }
        const ids = decodeURIComponent(doc[1]).split(',')
        json(res, 200, {
          documents: ids.flatMap((id) => (state.docs.has(id) ? [state.docs.get(id)] : [])),
        })
        return
      }

      const history = new RegExp(`^/data/history/${dataset}/transactions/(.+)$`).exec(path)
      if (history?.[1]) {
        if (state.faults.has('history')) {
          json(res, 500, {})
          return
        }
        if (url.searchParams.get('excludeContent') !== 'true') {
          json(res, 403, {})
          return
        }
        const log = state.history.get(decodeURIComponent(history[1])) ?? []
        res.writeHead(200, { 'content-type': 'application/x-ndjson' })
        return void res.end(log.map((entry) => JSON.stringify(entry)).join('\n'))
      }

      if (path === `/data/query/${dataset}`) {
        if (state.faults.has('query')) {
          json(res, 500, {})
          return
        }
        let query = url.searchParams.get('query') ?? ''
        const params: Plain = {}
        for (const [name, value] of url.searchParams) {
          if (name.startsWith('$')) params[name.slice(1)] = JSON.parse(value)
        }
        if (req.method === 'POST') {
          const body = JSON.parse(await readBody(req)) as { query: string; params?: Plain }
          query = body.query
          Object.assign(params, body.params)
        }
        const result = await (
          await groq.evaluate(groq.parse(query, { params }), {
            dataset: [...state.docs.values()],
            params,
          })
        ).get()
        json(res, 200, { result, ms: 1 })
        return
      }

      if (req.method === 'POST' && path === `/data/actions/${dataset}`) {
        state.actions.push({ token, body: null })
        if (state.faults.has('actions')) {
          json(res, 500, {})
          return
        }
        const body = JSON.parse(await readBody(req)) as { actions: Plain[] }
        state.actions[state.actions.length - 1] = { token, body }
        state.beforeAction?.()
        state.beforeAction = null
        // All or nothing, like a single Actions API transaction: check every guard, then apply.
        const writes: [string, Plain | null][] = []
        for (const action of body.actions) {
          if (action.actionType !== 'sanity.action.document.publish') {
            json(res, 400, { error: 'unsupported action' })
            return
          }
          const draftId = String(action.draftId ?? action.versionId)
          const publishedId = String(action.publishedId)
          const draft = state.docs.get(draftId)
          if (!draft) {
            json(res, 404, { error: 'no draft' })
            return
          }
          const guardDraft = action.ifDraftRevisionId ?? action.ifVersionRevisionId
          if (guardDraft !== undefined && guardDraft !== draft._rev) {
            json(res, 409, { error: 'draft revision mismatch' })
            return
          }
          if (
            action.ifPublishedRevisionId !== undefined &&
            action.ifPublishedRevisionId !== state.docs.get(publishedId)?._rev
          ) {
            json(res, 409, { error: 'published revision mismatch' })
            return
          }
          writes.push(
            [publishedId, { ...draft, _id: publishedId, _rev: nextRev() }],
            [draftId, null],
          )
        }
        for (const [id, value] of writes) {
          if (value) state.docs.set(id, value)
          else state.docs.delete(id)
        }
        json(res, 200, { transactionId: 'tx' })
        return
      }

      json(res, 404, { error: `fake Sanity has no ${req.method} ${path}` })
    })().catch((error: unknown) => {
      json(res, 500, { error: String(error) })
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  state.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return state
}
