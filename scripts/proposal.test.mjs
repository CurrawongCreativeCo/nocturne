import { describe, expect, it, vi } from 'vitest'

import manifest from '../design-manifest.generated.json'
import {
  assertScratchDataset,
  createHttpClient,
  parseArgs,
  releaseIdFor,
  parseValidationOutput,
  RELEASE_MODE_VERIFIED,
  runProposal,
  sanityValidator,
} from './proposal-utils.mjs'
import densityAiry from '../src/lib/proposals/fixtures/density-airy.proposal.json'
import documentsFile from '../src/lib/proposals/fixtures/documents.json'
import glassImageLeft from '../src/lib/proposals/fixtures/glass-image-left.proposal.json'
import supportingVideo from '../src/lib/proposals/fixtures/supporting-video.proposal.json'
import { insertAt, parsePath, setAt, unsetAt } from '../src/lib/proposals/paths'
import * as plan from '../src/lib/proposals/plan'
import { validateProposal } from '../src/lib/proposals/validate'

describe('assertScratchDataset', () => {
  it.each(['scratch', 'scratch-abc', 'scratch_2026'])('allows %s', (name) => {
    expect(() => assertScratchDataset(name)).not.toThrow()
  })

  it.each([
    'production',
    'staging',
    'my-scratch',
    'Scratch',
    ' scratch',
    'scratchpad',
    'scratchy-not',
    'scratch-',
    'scratch/x',
    'scratch-A',
    '',
    undefined,
    null,
  ])('refuses %j', (name) => {
    expect(() => assertScratchDataset(name)).toThrow(/scratch/)
  })
})

describe('parseArgs', () => {
  it('reads apply with its options', () => {
    expect(parseArgs(['apply', 'p.json', '--dataset', 'scratch-a', '--yes', '--release'])).toEqual({
      command: 'apply',
      file: 'p.json',
      dataset: 'scratch-a',
      documents: undefined,
      yes: true,
      release: true,
    })
    expect(parseArgs(['apply', 'p.json', '--dataset=scratch-a']).dataset).toBe('scratch-a')
  })

  it('has no override for the scratch rule, and no unknown options', () => {
    expect(parseArgs(['apply', 'p.json', '--dataset', 'x', '--force']).error).toMatch(/Unknown/)
    expect(parseArgs(['apply', 'p.json']).error).toMatch(/--dataset/)
  })

  it('asks validate for its documents, and keeps it read-only', () => {
    expect(parseArgs(['validate', 'p.json']).error).toMatch(/documents/)
    expect(parseArgs(['validate', 'p.json', '--documents', 'd.json']).command).toBe('validate')
    expect(parseArgs(['validate', 'p.json', '--documents', 'd.json', '--yes']).error).toMatch(
      /writes nothing/,
    )
  })

  it('rejects a missing or unknown command', () => {
    expect(parseArgs([]).error).toBeTruthy()
    expect(parseArgs(['publish', 'p.json']).error).toMatch(/Unknown command/)
  })
})

const HERO = 'pageBuilder[_key=="hero1"]'
const TOKEN_CANARY = 'sk-canary-token-value'

const clone = (value) => structuredClone(value)

/**
 * A stateful stand-in for a Sanity dataset that follows the documented rules this code relies on:
 * a mutate request is one transaction (all or nothing); `create` fails when the id exists;
 * `ifRevisionID` fails when the revision differs; a `set` under a missing parent fails; every
 * successful write gets a new revision; results carry the written documents. These tests show the
 * applier behaves correctly against those rules. They do NOT show Sanity follows them: the real
 * dataset run (README, "Change proposals") is what verifies that.
 */
function fakeLake({ documents = [], roles = ['administrator'], beforeMutate } = {}) {
  let counter = 0
  let store = new Map(documents.map((doc) => [doc._id, clone(doc)]))
  const lake = {
    mutations: [],
    get store() {
      return store
    },
    roles,
    stripResults: false,
    getDocuments: vi.fn(async (ids) =>
      ids.flatMap((id) => {
        if (id.startsWith('_.releases.')) {
          const release = lake.releases.get(id.slice('_.releases.'.length))
          return release ? [{ _id: id, ...release }] : []
        }
        return store.has(id) ? [clone(store.get(id))] : []
      }),
    ),
    releases: new Map(),
    actions: [],
    query: vi.fn(async (groq) => {
      const match = /match "(versions\.[^"]+)\.\*"/.exec(groq)
      if (!match) throw new Error(`fake lake cannot answer ${groq}`)
      return [...store.keys()].filter((id) => id.startsWith(`${match[1]}.`))
    }),
    /** Sanity's release rules as observed on a scratch dataset (README, "Change proposals"). */
    action: vi.fn(async (actions) => {
      lake.actions.push(actions)
      const fail = (status, message) => Object.assign(new Error(message), { status })
      const types = actions.map((a) => a.actionType)
      if (types.includes('sanity.action.release.create') && types.length > 1) {
        throw fail(400, 'release.create must be alone')
      }
      if (
        types.includes('sanity.action.document.version.discard') &&
        types.includes('sanity.action.release.archive')
      ) {
        throw fail(400, 'discard and archive together')
      }
      for (const action of actions) {
        const { releaseId, versionId } = action
        if (action.actionType === 'sanity.action.release.create') {
          if (lake.releases.has(releaseId)) throw fail(409, 'release exists')
          lake.releases.set(releaseId, { state: 'active' })
        } else if (action.actionType === 'sanity.action.document.version.create') {
          const id = action.document._id
          const release = id.split('.')[1]
          if (!lake.releases.has(release)) throw fail(400, 'no such release')
          if (store.has(id)) throw fail(409, 'version exists')
          if (!store.has(action.publishedId) && !store.has(`drafts.${action.publishedId}`))
            throw fail(400, 'no base document')
          store.set(id, { ...clone(action.document), _rev: `r${++counter}` })
        } else if (action.actionType === 'sanity.action.document.version.discard') {
          if (!store.has(versionId)) throw fail(400, 'no such version')
          store.delete(versionId)
        } else if (action.actionType === 'sanity.action.release.archive') {
          lake.releases.get(releaseId).state = 'archived'
        } else if (action.actionType === 'sanity.action.release.delete') {
          if (lake.releases.get(releaseId)?.state !== 'archived')
            throw fail(400, 'release must be archived')
          lake.releases.delete(releaseId)
        } else {
          throw fail(400, `unexpected action ${action.actionType}`)
        }
      }
      return {}
    }),
    getRoles: vi.fn(async () => {
      if (lake.roles instanceof Error) throw lake.roles
      return lake.roles
    }),
    mutate: vi.fn(async (mutations) => {
      lake.mutations.push(mutations)
      beforeMutate?.(lake, mutations)
      const next = new Map([...store].map(([id, doc]) => [id, clone(doc)]))
      const results = []
      const conflict = (message) => Object.assign(new Error(message), { status: 409 })
      for (const mutation of mutations) {
        if (mutation.create) {
          const id = mutation.create._id
          if (next.has(id)) throw conflict('document already exists')
          next.set(id, { ...clone(mutation.create), _rev: `r${++counter}` })
          results.push({ id, operation: 'create', document: clone(next.get(id)) })
        } else if (mutation.createOrReplace) {
          const id = mutation.createOrReplace._id
          next.set(id, { ...clone(mutation.createOrReplace), _rev: `r${++counter}` })
          results.push({ id, operation: 'update', document: clone(next.get(id)) })
        } else if (mutation.delete) {
          next.delete(mutation.delete.id)
          results.push({ id: mutation.delete.id, operation: 'delete' })
        } else if (mutation.patch) {
          const { id, ifRevisionID, setIfMissing, set, unset, insert } = mutation.patch
          let doc = next.get(id)
          if (!doc) throw Object.assign(new Error('not found'), { status: 404 })
          if (ifRevisionID && doc._rev !== ifRevisionID) throw conflict('revision mismatch')
          const bad = (error) => Object.assign(error, { status: 400 })
          try {
            for (const [path, value] of Object.entries(setIfMissing ?? {})) {
              const segments = parsePath(path)
              if (segments && doc[segments[0].name] === undefined && segments.length === 1) {
                doc = setAt(doc, segments, value)
              } else if (segments) {
                const parent = JSON.stringify(path)
                void parent
                const exists = (function find() {
                  try {
                    return segments.reduce(
                      (current, segment) =>
                        segment.kind === 'field'
                          ? current?.[segment.name]
                          : Array.isArray(current)
                            ? segment.kind === 'key'
                              ? current.find((item) => item._key === segment.key)
                              : current.at(segment.index)
                            : undefined,
                      doc,
                    )
                  } catch {
                    return undefined
                  }
                })()
                if (exists === undefined) doc = setAt(doc, segments, value)
              }
            }
            for (const [path, value] of Object.entries(set ?? {}))
              doc = setAt(doc, parsePath(path), value)
            for (const path of unset ?? []) doc = unsetAt(doc, parsePath(path))
            if (insert) {
              const where = ['before', 'after', 'replace'].find((key) => insert[key])
              doc = insertAt(doc, parsePath(insert[where]), where, insert.items)
            }
          } catch (error) {
            throw bad(error)
          }
          next.set(id, { ...doc, _rev: `r${++counter}` })
          results.push({ id, operation: 'update', document: clone(next.get(id)) })
        }
      }
      store = next
      // The real API returns one result per document, holding its final state.
      const finals = new Map()
      for (const result of results) {
        const id = result.document?._id ?? result.id
        finals.set(
          id,
          result.operation === 'delete'
            ? { operation: 'delete' }
            : { operation: result.operation, document: next.get(id) && clone(next.get(id)) },
        )
      }
      return lake.stripResults
        ? { transactionId: 't' }
        : { transactionId: 't', results: [...finals.values()] }
    }),
    /** Someone else edits a document between the proposal's write and its clean-up. */
    editBehindBack(id, set) {
      const doc = store.get(id)
      store.set(id, {
        ...setAt(doc, parsePath(Object.keys(set)[0]), Object.values(set)[0]),
        _rev: `r${++counter}`,
      })
    },
  }
  return lake
}

const published = documentsFile['page-home']
const otherPublished = {
  _id: 'page-about',
  _type: 'page',
  _rev: 'rev-about-1',
  title: 'About',
  pageBuilder: [],
}
const otherDraft = {
  _id: 'drafts.page-contact',
  _type: 'page',
  _rev: 'rev-contact-9',
  title: 'Contact (editing)',
  pageBuilder: [],
}
const baseDocuments = () => [published, documentsFile.designSettings, otherPublished, otherDraft]

const withTitle = (baseRev = 'rev-home-1') => ({
  ...glassImageLeft,
  id: 'title-and-spacing',
  changes: [
    {
      documentId: 'page-home',
      baseRev,
      patches: [
        { set: { [`${HERO}.title`]: 'A better heading', [`${HERO}.style.spacing`]: 'spacious' } },
      ],
    },
  ],
})

const noErrors = { errors: [], warnings: [] }

const run = (overrides = {}) =>
  runProposal({
    proposal: glassImageLeft,
    client: fakeLake({ documents: baseDocuments() }),
    dataset: 'scratch-test',
    validate: validateProposal,
    plan,
    manifest,
    yes: true,
    release: false,
    releasesEnabled: false,
    sanityValidate: async () => noErrors,
    ...overrides,
  })

describe('runProposal: drafts and revisions', () => {
  it('refuses a dataset that is not scratch before reading anything', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    for (const dataset of ['production', 'scratchy-not', 'my-scratch', 'Scratch']) {
      await expect(run({ client, dataset })).rejects.toThrow(/scratch/)
    }
    expect(client.getDocuments).not.toHaveBeenCalled()
    expect(client.mutate).not.toHaveBeenCalled()
  })

  it('is a dry run without yes: reads and plans, writes nothing', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    const result = await run({ client, yes: false })
    expect(result.status).toBe('dry-run')
    expect(client.mutate).not.toHaveBeenCalled()
  })

  it.each([
    ['glass with the image on the left', glassImageLeft],
    ['density airy', densityAiry],
    ['a supporting video', supportingVideo],
  ])(
    'creates a draft from the published document for "%s", leaving everything else alone',
    async (_name, proposal) => {
      const client = fakeLake({ documents: baseDocuments() })
      const before = clone(Object.fromEntries(client.store))
      const result = await run({ client, proposal })
      expect(result.status).toBe('applied')
      expect(result.cleanup.status).toBe('not-needed')
      expect(client.mutate).toHaveBeenCalledTimes(1)
      const draft = client.store.get('drafts.page-home')
      expect(draft).toBeDefined()
      expect(draft._rev).not.toBe('rev-home-1')
      for (const id of ['page-home', 'designSettings', 'page-about', 'drafts.page-contact']) {
        expect(client.store.get(id)).toEqual(before[id])
      }
      expect(JSON.stringify(client.mutations)).not.toMatch(/publish/i)
    },
  )

  it('updates an existing draft when baseRev is the draft’s revision', async () => {
    const draft = {
      ...clone(published),
      _id: 'drafts.page-home',
      _rev: 'rev-draft-3',
      title: 'Editing',
    }
    const client = fakeLake({ documents: [...baseDocuments(), draft] })
    const result = await run({ client, proposal: withTitle('rev-draft-3') })
    expect(result.status).toBe('applied')
    expect(client.mutations[0][0].patch.ifRevisionID).toBe('rev-draft-3')
    const after = client.store.get('drafts.page-home')
    expect(after.title).toBe('Editing')
    expect(after.pageBuilder[0].title).toBe('A better heading')
    expect(client.store.get('page-home')).toEqual(published)
  })

  it('refuses a stale revision without writing anything', async () => {
    const draft = { ...clone(published), _id: 'drafts.page-home', _rev: 'rev-draft-9' }
    const client = fakeLake({ documents: [...baseDocuments(), draft] })
    const result = await run({ client, proposal: withTitle('rev-home-1') })
    expect(result.status).toBe('nothing-to-apply')
    expect(result.validation.rejected[0].reasons[0].code).toBe('stale-revision')
    expect(client.mutate).not.toHaveBeenCalled()
    expect(client.store.get('drafts.page-home')).toEqual(draft)
  })

  it('refuses when a draft is created after planning, and keeps that editor’s draft', async () => {
    const concurrent = {
      ...clone(published),
      _id: 'drafts.page-home',
      _rev: 'rev-theirs-1',
      title: 'Their work',
    }
    const client = fakeLake({
      documents: baseDocuments(),
      beforeMutate: (lake) => {
        if (!lake.store.has('drafts.page-home')) lake.store.set('drafts.page-home', concurrent)
      },
    })
    const sanityValidate = vi.fn()
    const result = await run({ client, sanityValidate })
    expect(result.status).toBe('conflict')
    expect(result.notes.join(' ')).toMatch(/Propose again/)
    expect(sanityValidate).not.toHaveBeenCalled()
    expect(client.mutate).toHaveBeenCalledTimes(1)
    expect(client.store.get('drafts.page-home')).toEqual(concurrent)
  })

  it('refuses when an existing draft is edited after planning', async () => {
    const draft = { ...clone(published), _id: 'drafts.page-home', _rev: 'rev-draft-3' }
    const client = fakeLake({
      documents: [...baseDocuments(), draft],
      beforeMutate: (lake) =>
        lake.editBehindBack('drafts.page-home', { title: 'Edited meanwhile' }),
    })
    const result = await run({ client, proposal: withTitle('rev-draft-3') })
    expect(result.status).toBe('conflict')
    expect(client.store.get('drafts.page-home').title).toBe('Edited meanwhile')
  })

  it('refuses to reapply the same proposal: the draft has moved on', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    expect((await run({ client })).status).toBe('applied')
    const afterFirst = clone(client.store.get('drafts.page-home'))
    const second = await run({ client })
    expect(second.status).toBe('nothing-to-apply')
    expect(second.validation.rejected[0].reasons[0].code).toBe('stale-revision')
    expect(client.store.get('drafts.page-home')).toEqual(afterFirst)
    expect(client.mutate).toHaveBeenCalledTimes(1)
  })
})

describe('runProposal: agency review is enforced', () => {
  const mixed = withTitle()
  const heroOf = (client) => client.store.get('drafts.page-home')?.pageBuilder[0]

  it('applies the client-editable part and rejects the agency-only part for an Editor token', async () => {
    const client = fakeLake({ documents: baseDocuments(), roles: ['editor'] })
    const result = await run({ client, proposal: mixed })
    expect(result.status).toBe('applied')
    expect(result.validation.rejected.map((p) => p.reasons[0].code)).toEqual([
      'agency-approval-required',
    ])
    expect(result.validation.rejected[0].path).toBe(`${HERO}.style.spacing`)
    expect(heroOf(client).title).toBe('A better heading')
    expect(heroOf(client).style.spacing).toBeUndefined()
  })

  it('applies both for an Administrator or Developer token', async () => {
    for (const roles of [['administrator'], ['developer']]) {
      const client = fakeLake({ documents: baseDocuments(), roles })
      const result = await run({ client, proposal: mixed })
      expect(result.validation.rejected).toEqual([])
      expect(heroOf(client).style.spacing).toBe('spacious')
    }
  })

  it('fails closed when the token’s roles cannot be read', async () => {
    const client = fakeLake({ documents: baseDocuments(), roles: new Error('boom') })
    const result = await run({ client, proposal: densityAiry })
    expect(result.status).toBe('nothing-to-apply')
    expect(result.validation.rejected[0].reasons[0].code).toBe('agency-approval-required')
    expect(client.mutate).not.toHaveBeenCalled()
  })

  it('rejects an agency-only proposal from a Contributor token entirely', async () => {
    const client = fakeLake({ documents: baseDocuments(), roles: ['contributor'] })
    for (const proposal of [glassImageLeft, supportingVideo]) {
      expect((await run({ client, proposal })).status).toBe('nothing-to-apply')
    }
    expect(client.mutate).not.toHaveBeenCalled()
  })

  it('does not ask for roles when nothing needs review', async () => {
    const client = fakeLake({
      documents: baseDocuments(),
      roles: new Error('should not be called'),
    })
    const titleOnly = {
      ...mixed,
      changes: [{ ...mixed.changes[0], patches: [{ set: { [`${HERO}.title`]: 'Only a title' } }] }],
    }
    expect((await run({ client, proposal: titleOnly })).status).toBe('applied')
    expect(client.getRoles).not.toHaveBeenCalled()
  })

  it('keeps a rejected design part from altering the content part', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    const bad = {
      ...mixed,
      changes: [
        {
          ...mixed.changes[0],
          patches: [{ set: { [`${HERO}.title`]: 'Content ok', [`${HERO}.style.panel`]: 'neon' } }],
        },
      ],
    }
    const result = await run({ client, proposal: bad })
    expect(result.status).toBe('applied')
    expect(heroOf(client).title).toBe('Content ok')
    expect(heroOf(client).style).toEqual({ tone: 'surface' })
    expect(result.validation.rejected).toHaveLength(1)
  })

  it('writes nothing for a proposal the manifest rejects as a whole', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    const result = await run({ client, proposal: { ...glassImageLeft, manifestVersion: '9.0.0' } })
    expect(result.status).toBe('rejected')
    expect(client.mutate).not.toHaveBeenCalled()
  })
})

describe('runProposal: validation failure and clean-up', () => {
  const failing = async () => ({ errors: ['drafts.page-home: Title is required'], warnings: [] })

  it('discards only the draft it created, leaving every other document alone', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    const before = clone(Object.fromEntries(client.store))
    const result = await run({ client, sanityValidate: failing })
    expect(result.status).toBe('invalid-in-sanity')
    expect(result.studio.errors).toEqual(['drafts.page-home: Title is required'])
    expect(result.cleanup).toEqual({ status: 'done', remaining: [] })
    expect(Object.fromEntries(client.store)).toEqual(before)
  })

  it('restores a draft that existed before, keeping unrelated drafts', async () => {
    const draft = {
      ...clone(published),
      _id: 'drafts.page-home',
      _rev: 'rev-draft-3',
      title: 'Editing',
    }
    const client = fakeLake({ documents: [...baseDocuments(), draft] })
    const result = await run({
      client,
      proposal: withTitle('rev-draft-3'),
      sanityValidate: failing,
    })
    expect(result.cleanup.status).toBe('done')
    const { _rev, ...restored } = client.store.get('drafts.page-home')
    const { _rev: _original, ...original } = draft
    expect(restored).toEqual(original)
    expect(_rev).not.toBe('rev-draft-3')
    expect(client.store.get('drafts.page-contact')).toEqual(otherDraft)
  })

  it('treats a validation that could not run as a failure, never a pass', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    const result = await run({
      client,
      sanityValidate: async () => {
        throw new Error('Studio validation did not run.')
      },
    })
    expect(result.status).toBe('invalid-in-sanity')
    expect(result.notes.join(' ')).toMatch(/could not be checked/)
    expect(client.store.has('drafts.page-home')).toBe(false)
  })

  it('does not discard a draft that was edited after the write, and reports it', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    const result = await run({
      client,
      sanityValidate: async () => {
        client.editBehindBack('drafts.page-home', { title: 'Their later edit' })
        return { errors: ['bad'], warnings: [] }
      },
    })
    expect(result.status).toBe('invalid-in-sanity')
    expect(result.cleanup).toEqual({ status: 'failed', remaining: ['drafts.page-home'] })
    expect(result.manualActions.join(' ')).toContain('drafts.page-home')
    expect(result.notes.join(' ')).toMatch(/NOT discarded/)
    expect(client.store.get('drafts.page-home').title).toBe('Their later edit')
  })

  it('reports what remains when the clean-up request itself fails', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    const original = client.mutate.getMockImplementation()
    client.mutate.mockImplementation(async (mutations) => {
      if (client.mutations.length >= 1) throw new Error('network down')
      return original(mutations)
    })
    const result = await run({ client, sanityValidate: failing })
    expect(result.cleanup).toEqual({ status: 'failed', remaining: ['drafts.page-home'] })
    expect(result.manualActions).toHaveLength(1)
    expect(result.notes.join(' ')).not.toMatch(/were discarded/)
  })

  it('will not discard what it cannot guard: no revision came back', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    client.stripResults = true
    const result = await run({ client })
    expect(result.status).toBe('invalid-in-sanity')
    expect(result.cleanup.status).toBe('failed')
    expect(result.cleanup.remaining).toEqual(['drafts.page-home'])
    expect(client.store.has('drafts.page-home')).toBe(true)
    expect(client.mutate).toHaveBeenCalledTimes(1)
  })

  it('passes the documents Sanity returned to validation, and reports warnings without failing', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    const sanityValidate = vi.fn(async () => ({
      errors: [],
      warnings: ['drafts.page-home: Long title'],
    }))
    const result = await run({ client, sanityValidate })
    expect(result.status).toBe('applied')
    expect(result.studio.warnings).toEqual(['drafts.page-home: Long title'])
    expect(sanityValidate.mock.calls[0][0][0]).toMatchObject({
      _id: 'drafts.page-home',
      _rev: expect.any(String),
    })
    expect(result.written).toEqual([
      { id: 'drafts.page-home', revision: client.store.get('drafts.page-home')._rev },
    ])
  })

  it('a failed write reports that nothing was written', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    client.mutate.mockRejectedValueOnce(new Error('HTTP 500'))
    const result = await run({ client })
    expect(result.status).toBe('failed')
    expect(result.notes.join(' ')).toMatch(/Nothing was written/)
    expect(client.store.has('drafts.page-home')).toBe(false)
  })
})

describe('release mode', () => {
  const releaseRun = (client, overrides = {}) =>
    run({ client, release: true, releasesEnabled: true, ...overrides })
  const versionId = (proposal) => `versions.${releaseIdFor(proposal.id)}.page-home`

  it('needs the releases flag in the profile, before anything is read', async () => {
    expect(RELEASE_MODE_VERIFIED).toBe(true)
    const client = fakeLake({ documents: baseDocuments() })
    await expect(run({ client, release: true, releasesEnabled: false })).rejects.toThrow(/releases/)
    expect(client.getDocuments).not.toHaveBeenCalled()
  })

  it('creates the release, then the version, then patches it: separate requests, nothing published', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    const before = clone(Object.fromEntries(client.store))
    const result = await releaseRun(client)
    expect(result.status).toBe('applied')
    expect(client.actions.map((a) => a.map((x) => x.actionType))).toEqual([
      ['sanity.action.release.create'],
      ['sanity.action.document.version.create'],
    ])
    expect(
      client.actions
        .flat()
        .map((a) => a.actionType)
        .join(),
    ).not.toMatch(/publish|schedule/)
    expect(client.store.get(versionId(glassImageLeft)).pageBuilder[0].imagePosition).toBe('left')
    expect(client.store.get('page-home')).toEqual(before['page-home'])
    expect(client.store.has('drafts.page-home')).toBe(false)
    expect(result.release).toBe(releaseIdFor(glassImageLeft.id))
  })

  it('removes the whole release when Studio validation fails: discard, archive, then delete, each alone', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    const before = clone(Object.fromEntries(client.store))
    const result = await releaseRun(client, {
      sanityValidate: async () => ({ errors: ['bad'], warnings: [] }),
    })
    expect(result.status).toBe('invalid-in-sanity')
    expect(result.cleanup).toEqual({ status: 'done', remaining: [] })
    expect(client.actions.slice(2).map((a) => a.map((x) => x.actionType))).toEqual([
      ['sanity.action.document.version.discard'],
      ['sanity.action.release.archive'],
      ['sanity.action.release.delete'],
    ])
    expect(client.releases.size).toBe(0)
    expect(Object.fromEntries(client.store)).toEqual(before)
  })

  it('keeps a version someone edited after the write, and the release with it', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    const result = await releaseRun(client, {
      sanityValidate: async () => {
        client.editBehindBack(versionId(glassImageLeft), { title: 'Their edit' })
        return { errors: ['bad'], warnings: [] }
      },
    })
    expect(result.cleanup.status).toBe('failed')
    expect(result.cleanup.remaining).toContain(versionId(glassImageLeft))
    expect(client.store.get(versionId(glassImageLeft)).title).toBe('Their edit')
    expect(client.releases.has(releaseIdFor(glassImageLeft.id))).toBe(true)
    expect(result.manualActions).toHaveLength(1)
  })

  it('does not delete a release that holds something it did not put there', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    const result = await releaseRun(client, {
      sanityValidate: async () => {
        client.store.set(`versions.${releaseIdFor(glassImageLeft.id)}.page-about`, {
          _id: 'x',
          _type: 'page',
          _rev: 'z',
        })
        return { errors: ['bad'], warnings: [] }
      },
    })
    expect(result.cleanup.status).toBe('failed')
    expect(client.releases.has(releaseIdFor(glassImageLeft.id))).toBe(true)
  })

  it('refuses to run the same proposal into a release twice', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    expect((await releaseRun(client)).status).toBe('applied')
    const second = await releaseRun(client)
    expect(second.status).toBe('conflict')
    expect(client.store.get(versionId(glassImageLeft))).toBeDefined()
    expect(second.cleanup.status).not.toBe('done')
  })

  it('cleans up a release whose version could not be created', async () => {
    const client = fakeLake({ documents: baseDocuments() })
    const action = client.action.getMockImplementation()
    client.action.mockImplementation(async (actions) => {
      if (actions[0].actionType === 'sanity.action.document.version.create')
        throw Object.assign(new Error('boom'), { status: 500 })
      return action(actions)
    })
    const result = await releaseRun(client)
    expect(result.status).toBe('failed')
    expect(result.cleanup.status).toBe('done')
    expect(client.releases.size).toBe(0)
  })
})

const marker = (level, message = 'm') => ({ level, message, path: [] })
const entry = (documentId, ...markers) => ({
  documentId,
  documentType: 'page',
  level: markers[0].level,
  markers,
  revision: 'r',
})

describe('parseValidationOutput (the CLI’s --format json)', () => {
  it('reads errors and warnings per document', () => {
    const out = JSON.stringify([
      entry('drafts.a', marker('error', 'Required'), marker('warning', 'Long')),
    ])
    expect(parseValidationOutput(out)).toEqual({
      errors: ['drafts.a: Required'],
      warnings: ['drafts.a: Long'],
    })
    expect(parseValidationOutput('[]')).toEqual({ errors: [], warnings: [] })
  })

  it.each([
    '',
    'not json',
    '{"documentId":"a"}',
    '[{"documentId":"a"}]',
    '[1]',
    'null',
    'Error: not signed in',
  ])('throws on unreadable output %j', (output) => {
    expect(() => parseValidationOutput(output)).toThrow(/Studio validation output/)
  })
})

describe('sanityValidator', () => {
  const docs = [{ _id: 'drafts.a', _type: 'page', _rev: 'r1' }]
  const validator = (result, extra = {}) =>
    sanityValidator({ projectId: 'p1', dataset: 'scratch-x', run: () => result, ...extra })

  it('a valid document: exit 0 and an empty list', async () => {
    await expect(validator({ status: 0, stdout: '[]' })(docs)).resolves.toEqual({
      errors: [],
      warnings: [],
    })
  })

  it('a validation error: exit 1 with an error marker', async () => {
    const stdout = JSON.stringify([entry('drafts.a', marker('error', 'Required'))])
    await expect(validator({ status: 1, stdout })(docs)).resolves.toEqual({
      errors: ['drafts.a: Required'],
      warnings: [],
    })
  })

  it('warnings only: exit 0, reported, not errors', async () => {
    const stdout = JSON.stringify([entry('drafts.a', marker('warning', 'Long'))])
    await expect(validator({ status: 0, stdout })(docs)).resolves.toEqual({
      errors: [],
      warnings: ['drafts.a: Long'],
    })
  })

  it('an error marker is an error even if the exit code says 0', async () => {
    const stdout = JSON.stringify([entry('drafts.a', marker('error', 'Required'))])
    const result = await validator({ status: 0, stdout })(docs)
    expect(result.errors).toHaveLength(1)
  })

  it.each([
    ['malformed output', { status: 0, stdout: 'garbage' }],
    ['empty output on success', { status: 0, stdout: '' }],
    ['not signed in (exit 1, no JSON)', { status: 1, stdout: '', stderr: 'Not logged in' }],
    [
      'exit 1 with warnings only',
      { status: 1, stdout: JSON.stringify([entry('drafts.a', marker('warning'))]) },
    ],
    ['exit 1 with an empty list', { status: 1, stdout: '[]' }],
    ['an unexpected exit status', { status: 127, stdout: '' }],
    ['a signal', { status: null, signal: 'SIGKILL', stdout: '' }],
    ['the CLI missing', { status: null, error: Object.assign(new Error('x'), { code: 'ENOENT' }) }],
  ])('throws, never passes, for %s', async (_name, result) => {
    await expect(validator(result)(docs)).rejects.toThrow()
  })

  it('reports a timeout as a timeout', async () => {
    const result = { status: null, error: Object.assign(new Error('x'), { code: 'ETIMEDOUT' }) }
    await expect(validator(result, { timeoutMs: 5000 })(docs)).rejects.toThrow(
      /timed out after 5 seconds/,
    )
  })

  it('validates a file of just the documents written, as explicit JSON, then removes it', async () => {
    let call
    let contents
    const { readFileSync, existsSync } = await import('node:fs')
    const run = (args, options) => {
      call = { args, options }
      contents = readFileSync(args[args.indexOf('--file') + 1], 'utf8')
      return { status: 0, stdout: '[]' }
    }
    await sanityValidator({ projectId: 'p1', dataset: 'scratch-x', run, timeoutMs: 1234 })(docs)
    expect(call.args).toEqual(
      expect.arrayContaining([
        '--format',
        'json',
        '--dataset',
        'scratch-x',
        '--project-id',
        'p1',
        '--yes',
      ]),
    )
    expect(call.options.timeout).toBe(1234)
    expect(call.options.env).toEqual({
      NEXT_PUBLIC_SANITY_PROJECT_ID: 'p1',
      NEXT_PUBLIC_SANITY_DATASET: 'scratch-x',
    })
    expect(JSON.parse(contents.trim())).toEqual(docs[0])
    expect(existsSync(call.args[call.args.indexOf('--file') + 1])).toBe(false)
  })

  it('removes the file even when validation fails', async () => {
    const { existsSync } = await import('node:fs')
    let file
    const run = (args) => {
      file = args[args.indexOf('--file') + 1]
      return { status: 127 }
    }
    await expect(
      sanityValidator({ projectId: 'p1', dataset: 'scratch-x', run })(docs),
    ).rejects.toThrow()
    expect(existsSync(file)).toBe(false)
  })
})

describe('createHttpClient', () => {
  it('sends the token as a bearer header, to the dataset it was given', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({}) }))
    const client = createHttpClient({
      projectId: 'p1',
      dataset: 'scratch-x',
      token: TOKEN_CANARY,
      fetchImpl,
    })
    await client.mutate([{ delete: { id: 'x' } }])
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toContain('/mutate/scratch-x')
    expect(url).toContain('returnDocuments=true')
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN_CANARY}`)
  })

  it('throws an error that carries the status and not the token', async () => {
    const fetchImpl = async () => ({ ok: false, status: 409, json: async () => ({}) })
    const client = createHttpClient({
      projectId: 'p1',
      dataset: 'scratch-x',
      token: TOKEN_CANARY,
      fetchImpl,
    })
    const error = await client.mutate([]).catch((e) => e)
    expect(error.status).toBe(409)
    expect(error.message).not.toContain(TOKEN_CANARY)
  })
})

describe('createHttpClient.getRoles', () => {
  it('reads the token’s role names', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ roles: [{ name: 'editor' }, { name: 'developer' }] }),
    })
    const client = createHttpClient({
      projectId: 'p1',
      dataset: 'scratch-x',
      token: TOKEN_CANARY,
      fetchImpl,
    })
    await expect(client.getRoles()).resolves.toEqual(['editor', 'developer'])
  })
})
