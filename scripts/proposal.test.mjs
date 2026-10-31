import { describe, expect, it, vi } from 'vitest'

import manifest from '../design-manifest.generated.json'
import {
  assertScratchDataset,
  createHttpClient,
  errorsFromCliOutput,
  parseArgs,
  releaseIdFor,
  runProposal,
  sanityValidator,
} from './proposal-utils.mjs'
import densityAiry from '../src/lib/proposals/fixtures/density-airy.proposal.json'
import documentsFile from '../src/lib/proposals/fixtures/documents.json'
import glassImageLeft from '../src/lib/proposals/fixtures/glass-image-left.proposal.json'
import supportingVideo from '../src/lib/proposals/fixtures/supporting-video.proposal.json'
import * as plan from '../src/lib/proposals/plan'
import { validateProposal } from '../src/lib/proposals/validate'

const HERO = 'pageBuilder[_key=="hero1"]'
const TOKEN_CANARY = 'sk-canary-token-value'

/** A mock client holding the fixture documents (as published, or with a draft when given). */
function mockClient({ draft, mutate, action } = {}) {
  const documents = [documentsFile['page-home'], documentsFile.designSettings]
  if (draft) documents.push(draft)
  return {
    getDocuments: vi.fn(async (ids) => documents.filter((doc) => ids.includes(doc._id))),
    mutate: vi.fn(mutate ?? (async () => ({}))),
    action: vi.fn(action ?? (async () => ({}))),
  }
}

const run = (overrides = {}) =>
  runProposal({
    proposal: glassImageLeft,
    client: mockClient(),
    dataset: 'scratch-test',
    validate: validateProposal,
    plan,
    manifest,
    yes: true,
    release: false,
    releasesEnabled: false,
    sanityValidate: async () => [],
    ...overrides,
  })

describe('assertScratchDataset', () => {
  it.each(['scratch', 'scratch-abc', 'scratch_2026'])('allows %s', (name) => {
    expect(() => assertScratchDataset(name)).not.toThrow()
  })

  it.each(['production', 'staging', 'my-scratch', 'Scratch', ' scratch', '', undefined, null])(
    'refuses %j',
    (name) => {
      expect(() => assertScratchDataset(name)).toThrow(/scratch/)
    },
  )
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

describe('runProposal', () => {
  it('refuses a dataset that is not scratch before reading anything', async () => {
    const client = mockClient()
    await expect(run({ client, dataset: 'production' })).rejects.toThrow(/scratch/)
    expect(client.getDocuments).not.toHaveBeenCalled()
    expect(client.mutate).not.toHaveBeenCalled()
  })

  it('is a dry run without yes: reads, plans, writes nothing', async () => {
    const client = mockClient()
    const result = await run({ client, yes: false })
    expect(result.status).toBe('dry-run')
    expect(result.plan.mutations.length).toBeGreaterThan(0)
    expect(client.mutate).not.toHaveBeenCalled()
    expect(client.action).not.toHaveBeenCalled()
  })

  it.each([
    ['glass with the image on the left', glassImageLeft],
    ['density airy', densityAiry],
    ['a supporting video', supportingVideo],
  ])('applies the fixture proposal "%s" as one draft-only transaction', async (_name, proposal) => {
    const client = mockClient()
    const result = await run({ client, proposal })
    expect(result.status).toBe('applied')
    expect(client.mutate).toHaveBeenCalledTimes(1)
    const sent = client.mutate.mock.calls[0][0]
    const ids = sent.map((m) => m.create?._id ?? m.patch.id)
    expect(new Set(ids)).toEqual(new Set(['drafts.page-home']))
    expect(JSON.stringify(sent)).not.toMatch(/publish/i)
    expect(client.action).not.toHaveBeenCalled()
  })

  it('sets ifRevisionID to baseRev when the draft already exists', async () => {
    const draft = { ...documentsFile['page-home'], _id: 'drafts.page-home', _rev: 'rev-draft-3' }
    const proposal = {
      ...densityAiry,
      changes: [{ ...densityAiry.changes[0], baseRev: 'rev-draft-3' }],
    }
    const client = mockClient({ draft })
    const result = await run({ client, proposal })
    expect(result.status).toBe('applied')
    const sent = client.mutate.mock.calls[0][0]
    expect(sent[0].patch.ifRevisionID).toBe('rev-draft-3')
    expect(sent.some((m) => m.create)).toBe(false)
  })

  it('refuses a stale proposal without writing: the draft has moved on', async () => {
    const draft = { ...documentsFile['page-home'], _id: 'drafts.page-home', _rev: 'rev-draft-9' }
    const client = mockClient({ draft })
    const result = await run({ client, proposal: densityAiry })
    expect(result.status).toBe('nothing-to-apply')
    expect(result.validation.rejected[0].reasons[0].code).toBe('stale-revision')
    expect(client.mutate).not.toHaveBeenCalled()
  })

  it('reports a revision conflict from the server and leaves nothing behind', async () => {
    const error = Object.assign(new Error('conflict'), { status: 409 })
    const client = mockClient({ mutate: async () => Promise.reject(error) })
    const sanityValidate = vi.fn()
    const result = await run({ client, sanityValidate })
    expect(result.status).toBe('conflict')
    expect(result.notes.join(' ')).toMatch(/Propose again/)
    expect(sanityValidate).not.toHaveBeenCalled()
    // One transaction that failed whole: no clean-up write is needed.
    expect(client.mutate).toHaveBeenCalledTimes(1)
  })

  it('discards the drafts when Studio validation fails', async () => {
    const client = mockClient()
    const result = await run({
      client,
      sanityValidate: async () => ['drafts.page-home: Title is required'],
    })
    expect(result.status).toBe('invalid-in-sanity')
    expect(result.errors).toEqual(['drafts.page-home: Title is required'])
    expect(client.mutate).toHaveBeenCalledTimes(2)
    expect(client.mutate.mock.calls[1][0]).toEqual([{ delete: { id: 'drafts.page-home' } }])
  })

  it('discards the drafts when Studio validation cannot run', async () => {
    const client = mockClient()
    const result = await run({
      client,
      sanityValidate: async () => {
        throw new Error('The CLI did not run.')
      },
    })
    expect(result.status).toBe('invalid-in-sanity')
    expect(client.mutate.mock.calls[1][0]).toEqual([{ delete: { id: 'drafts.page-home' } }])
  })

  it('restores a draft that existed before when the new version fails Studio validation', async () => {
    const draft = { ...documentsFile['page-home'], _id: 'drafts.page-home', _rev: 'rev-draft-3' }
    const proposal = {
      ...densityAiry,
      changes: [{ ...densityAiry.changes[0], baseRev: 'rev-draft-3' }],
    }
    const client = mockClient({ draft })
    await run({ client, proposal, sanityValidate: async () => ['bad'] })
    const undo = client.mutate.mock.calls[1][0]
    expect(undo[0].createOrReplace._id).toBe('drafts.page-home')
    expect(undo[0].createOrReplace).not.toHaveProperty('_rev')
  })

  it('writes the content part when the design part is rejected', async () => {
    const proposal = {
      ...glassImageLeft,
      changes: [
        {
          ...glassImageLeft.changes[0],
          patches: [{ set: { [`${HERO}.title`]: 'Better', [`${HERO}.style.panel`]: 'neon' } }],
        },
      ],
    }
    const client = mockClient()
    const result = await run({ client, proposal })
    expect(result.status).toBe('applied')
    const sent = JSON.stringify(client.mutate.mock.calls[0][0])
    expect(sent).toContain('Better')
    expect(sent).not.toContain('neon')
    expect(result.validation.rejected).toHaveLength(1)
  })

  it('writes nothing for a proposal the manifest rejects as a whole', async () => {
    const client = mockClient()
    const result = await run({ client, proposal: { ...glassImageLeft, manifestVersion: '9.0.0' } })
    expect(result.status).toBe('rejected')
    expect(client.mutate).not.toHaveBeenCalled()
  })

  describe('with --release', () => {
    it('needs the releases flag in the profile', async () => {
      await expect(run({ release: true, releasesEnabled: false })).rejects.toThrow(/releases/)
    })

    it('puts every change into one release, created first', async () => {
      const client = mockClient()
      const result = await run({ client, release: true, releasesEnabled: true })
      expect(result.status).toBe('applied')
      expect(client.action).toHaveBeenCalledTimes(1)
      const actions = client.action.mock.calls[0][0].map((a) => a.actionType)
      expect(actions[0]).toBe('sanity.action.release.create')
      expect(actions.some((type) => /publish|schedule/.test(type))).toBe(false)
      const releaseId = releaseIdFor(glassImageLeft.id)
      const ids = client.mutate.mock.calls[0][0].map((m) => m.patch.id)
      expect(new Set(ids)).toEqual(new Set([`versions.${releaseId}.page-home`]))
    })

    it('discards the release when Studio validation fails', async () => {
      const client = mockClient()
      await run({
        client,
        release: true,
        releasesEnabled: true,
        sanityValidate: async () => ['bad'],
      })
      const undo = client.action.mock.calls[1][0].map((a) => a.actionType)
      expect(undo).toEqual([
        'sanity.action.document.version.discard',
        'sanity.action.release.archive',
        'sanity.action.release.delete',
      ])
    })
  })
})

describe('errorsFromCliOutput', () => {
  const ids = ['drafts.page-home']

  it('keeps the errors for the documents written, from JSON or NDJSON', () => {
    const entries = [
      {
        documentId: 'drafts.page-home',
        validation: [
          { level: 'error', message: 'Title is required' },
          { level: 'warning', message: 'Long title' },
        ],
      },
      { documentId: 'other', validation: [{ level: 'error', message: 'Not ours' }] },
    ]
    const expected = ['drafts.page-home: Title is required']
    expect(errorsFromCliOutput(JSON.stringify(entries), ids)).toEqual(expected)
    expect(errorsFromCliOutput(entries.map((e) => JSON.stringify(e)).join('\n'), ids)).toEqual(
      expected,
    )
    expect(errorsFromCliOutput('', ids)).toEqual([])
  })
})

describe('sanityValidator', () => {
  it('reads CLI errors (exit status 1) and treats other failures as not run', async () => {
    const out = JSON.stringify([
      { documentId: 'drafts.a', validation: [{ level: 'error', message: 'bad' }] },
    ])
    const validate = (result) => sanityValidator({ dataset: 'scratch-x', run: () => result })
    await expect(validate({ status: 1, stdout: out })(['drafts.a'])).resolves.toEqual([
      'drafts.a: bad',
    ])
    await expect(validate({ status: 0, stdout: '[]' })(['drafts.a'])).resolves.toEqual([])
    await expect(validate({ status: 127, stdout: '' })(['drafts.a'])).rejects.toThrow(/did not run/)
  })

  it('validates the scratch dataset it was given, and asks for errors only', async () => {
    const calls = []
    await sanityValidator({
      dataset: 'scratch-x',
      run: (args) => (calls.push(args), { status: 0, stdout: '[]' }),
    })(['drafts.a'])
    expect(calls[0]).toEqual(expect.arrayContaining(['--dataset', 'scratch-x', '--level', 'error']))
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
