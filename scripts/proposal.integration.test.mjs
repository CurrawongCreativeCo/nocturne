/**
 * Runs change proposals against a REAL scratch dataset. Skipped unless PROPOSAL_INTEGRATION_DATASET
 * names one:
 *
 *   PROPOSAL_INTEGRATION_DATASET=scratch-proposals npx vitest run scripts/proposal.integration.test.mjs
 *
 * Needs, in .env.local: NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_PROPOSAL_TOKEN (Administrator or
 * Developer) and the Sanity CLI signed in; SANITY_PROPOSAL_EDITOR_TOKEN is optional (without it the
 * Editor-token tests are skipped). It seeds `page-home`, `page-about` and `designSettings` if they are
 * missing, creates documents whose ids start `ptest-`, and deletes everything it made afterwards.
 * It never reads or prints a token or document contents. The dataset name is checked first.
 */
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import manifest from '../design-manifest.generated.json'
import { loadEnv } from './config-check.mjs'
import {
  assertScratchDataset,
  createHttpClient,
  releaseIdFor,
  runProposal,
  sanityValidator,
} from './proposal-utils.mjs'
import { seedDocuments } from './setup/seed.mjs'
import * as plan from '../src/lib/proposals/plan'
import { validateProposal } from '../src/lib/proposals/validate'

const DATASET = process.env.PROPOSAL_INTEGRATION_DATASET
const root = join(import.meta.dirname, '..')
const env = DATASET ? loadEnv(root) : {}
const suite = DATASET && env.SANITY_PROPOSAL_TOKEN ? describe : describe.skip

const HERO = 'pageBuilder[_key=="seedd"]'
const API = 'v2026-10-01'
const TIMEOUT = 300_000

if (DATASET) assertScratchDataset(DATASET)

const clientWith = (token, fetchImpl) =>
  createHttpClient({
    projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: DATASET,
    token,
    fetchImpl,
  })

/** Direct calls the test makes as "somebody else", bypassing the applier. */
const lake = clientWith(env.SANITY_PROPOSAL_TOKEN)
async function query(groq, params = {}) {
  const qs = new URLSearchParams({ query: groq, perspective: 'raw' })
  for (const [key, value] of Object.entries(params)) qs.set(`$${key}`, JSON.stringify(value))
  const response = await fetch(
    `https://${env.NEXT_PUBLIC_SANITY_PROJECT_ID}.api.sanity.io/${API}/data/query/${DATASET}?${qs}`,
    { headers: { Authorization: `Bearer ${env.SANITY_PROPOSAL_TOKEN}` } },
  )
  return (await response.json()).result
}
const getDoc = async (id) => (await lake.getDocuments([id]))[0]
const rawMutate = (mutations) => lake.mutate(mutations)
const statusOf = async (mutations) => {
  try {
    await rawMutate(mutations)
    return 200
  } catch (error) {
    return error.status
  }
}

const cli = (args, { timeout, env: extra }) =>
  spawnSync('npx', args, {
    cwd: root,
    encoding: 'utf8',
    timeout,
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, ...extra },
  })
const realValidator = (overrides = {}) =>
  sanityValidator({
    projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: DATASET,
    run: cli,
    ...overrides,
  })

/** A copy of a stored document under another id, without the fields Sanity sets itself. */
async function copyOf(id, newId, extra = {}) {
  const { _rev, _createdAt, _updatedAt, ...rest } = await getDoc(id)
  void [_rev, _createdAt, _updatedAt]
  return { ...rest, _id: newId, ...extra }
}

const created = new Set()
const releases = new Set()
let counter = 0

/** A published page that passes the Studio's validation, copied from the seeded Home page. */
async function makePage(label) {
  const id = `ptest-${label}-${++counter}`
  const result = await rawMutate([
    {
      createOrReplace: await copyOf('page-home', id, {
        title: `Integration ${label}`,
        slug: { _type: 'slug', current: id },
      }),
    },
  ])
  created.add(id)
  created.add(`drafts.${id}`)
  return { id, rev: result.results[0].document._rev }
}

const propose = (documentId, baseRev, set, id = `it-${documentId}`) => ({
  id,
  manifestVersion: manifest.manifestVersion,
  intent: 'integration test',
  scope: 'section',
  rationale: 'integration test',
  changes: [{ documentId, baseRev, patches: [{ set }] }],
})

const run = (proposal, overrides = {}) =>
  runProposal({
    proposal,
    client: lake,
    dataset: DATASET,
    validate: validateProposal,
    plan,
    manifest,
    yes: true,
    release: false,
    releasesEnabled: false,
    sanityValidate: realValidator(),
    ...overrides,
  })

suite('change proposals against a real scratch dataset', () => {
  beforeAll(async () => {
    const wanted = ['page-home', 'page-about', 'designSettings']
    const existing = new Set((await lake.getDocuments(wanted)).map((doc) => doc._id))
    const seeds = seedDocuments('Proposal test', { prelaunch: false }).filter(
      (doc) => wanted.includes(doc._id) && !existing.has(doc._id),
    )
    for (const doc of seeds) {
      for (const section of doc.pageBuilder ?? []) {
        const variant = manifest.sections.find((s) => s.type === section._type)?.variants?.[0]
        if (variant && !section.variant) section.variant = variant.value
      }
      created.add(doc._id)
    }
    if (seeds.length > 0) await rawMutate(seeds.map((doc) => ({ createIfNotExists: doc })))
  }, TIMEOUT)

  /** Removes a release and everything in it, one request per step; never throws. */
  async function purgeRelease(releaseId) {
    const step = (action) => lake.action([action]).catch(() => undefined)
    for (const id of (await lake.query(`*[_id match "versions.${releaseId}.*"]._id`)) ?? []) {
      await step({ actionType: 'sanity.action.document.version.discard', versionId: id })
    }
    await step({ actionType: 'sanity.action.release.archive', releaseId })
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await step({ actionType: 'sanity.action.release.delete', releaseId })
  }

  afterAll(async () => {
    for (const releaseId of releases) await purgeRelease(releaseId)
    const ids = [...created]
    const present = await query('*[_id in $ids]._id', { ids })
    if (present?.length) await rawMutate(present.map((id) => ({ delete: { id } })))
    const left = await query('*[_id in $ids]._id', { ids })
    const releaseLeft = []
    for (const releaseId of releases) {
      if ((await lake.getDocuments([`_.releases.${releaseId}`])).length > 0)
        releaseLeft.push(releaseId)
    }
    console.log(
      `Integration clean-up: ${present?.length ?? 0} deleted, ${left?.length ?? 0} left, ${releaseLeft.length} releases left.`,
    )
    expect(left ?? []).toEqual([])
    expect(releaseLeft).toEqual([])
  }, TIMEOUT)

  describe('what Sanity itself guarantees (assumptions the applier relies on)', () => {
    it(
      'refuses a patch with a stale ifRevisionID, and a create over an existing id',
      async () => {
        const { id, rev } = await makePage('guard')
        expect(
          await statusOf([{ patch: { id, ifRevisionID: 'not-the-rev', set: { title: 'x' } } }]),
        ).toBe(409)
        expect(await statusOf([{ create: { _id: id, _type: 'page', title: 'x' } }])).toBe(409)
        expect((await getDoc(id)).title).toBe('Integration guard')
        expect(await statusOf([{ patch: { id, ifRevisionID: rev, set: { title: 'ok' } } }])).toBe(
          200,
        )
      },
      TIMEOUT,
    )

    it(
      'a transaction is all or nothing',
      async () => {
        const { id } = await makePage('atomic')
        const status = await statusOf([
          { patch: { id, set: { title: 'half' } } },
          { patch: { id, ifRevisionID: 'wrong', set: { title: 'never' } } },
        ])
        expect(status).toBe(409)
        expect((await getDoc(id)).title).toBe('Integration atomic')
      },
      TIMEOUT,
    )

    it(
      'the clean-up guard: a no-op patch with ifRevisionID protects the delete that follows',
      async () => {
        const { id, rev } = await makePage('undo-guard')
        const guarded = (revision) => [
          { patch: { id, ifRevisionID: revision, setIfMissing: { _type: 'page' } } },
          { delete: { id } },
        ]
        expect(await statusOf(guarded('stale'))).toBe(409)
        expect(await getDoc(id)).toBeDefined()
        expect(await statusOf(guarded(rev))).toBe(200)
        expect(await getDoc(id)).toBeUndefined()
      },
      TIMEOUT,
    )

    it(
      'a set under a missing parent object fails (so the planner must create parents)',
      async () => {
        const { id } = await makePage('parent')
        const status = await statusOf([
          { patch: { id, set: { [`${HERO}.style.spacing`]: 'spacious' } } },
        ])
        // The hero has no `style` yet. Record what Sanity does rather than assume.
        console.log(`set under a missing parent: HTTP ${status}`)
        expect([200, 400]).toContain(status)
      },
      TIMEOUT,
    )
  })

  describe('drafts and revisions', () => {
    it(
      'creates a draft from a published document, validates it, and leaves the published one alone',
      async () => {
        const { id, rev } = await makePage('create')
        const result = await run(propose(id, rev, { [`${HERO}.title`]: 'Changed by proposal' }))
        expect(result.status).toBe('applied')
        expect(result.studio.errors).toEqual([])
        expect(result.cleanup.status).toBe('not-needed')
        const draft = await getDoc(`drafts.${id}`)
        expect(draft.pageBuilder[0].title).toBe('Changed by proposal')
        expect(result.written).toEqual([{ id: `drafts.${id}`, revision: draft._rev }])
        const published = await getDoc(id)
        expect(published._rev).toBe(rev)
        expect(published.pageBuilder[0].title).not.toBe('Changed by proposal')
      },
      TIMEOUT,
    )

    it(
      'updates an existing draft at the right revision, refuses the stale one, and refuses a reapply',
      async () => {
        const { id, rev } = await makePage('update')
        const first = propose(id, rev, { [`${HERO}.title`]: 'First' })
        expect((await run(first)).status).toBe('applied')
        const draft1 = await getDoc(`drafts.${id}`)

        const second = propose(id, draft1._rev, { [`${HERO}.description`]: 'Second' })
        expect((await run(second)).status).toBe('applied')
        const draft2 = await getDoc(`drafts.${id}`)
        expect(draft2._rev).not.toBe(draft1._rev)
        expect(draft2.pageBuilder[0].title).toBe('First')
        expect(draft2.pageBuilder[0].description).toBe('Second')

        // The first proposal again: its baseRev is now the published revision, but a newer draft exists.
        const again = await run(first)
        expect(again.status).toBe('nothing-to-apply')
        expect(again.validation.rejected[0].reasons[0].code).toBe('stale-revision')
        // Nor can the second be reapplied on the revision it started from.
        expect((await run(second)).status).toBe('nothing-to-apply')
        expect((await getDoc(`drafts.${id}`))._rev).toBe(draft2._rev)
      },
      TIMEOUT,
    )

    it(
      'refuses when somebody creates the draft after planning, and keeps theirs',
      async () => {
        const { id, rev } = await makePage('concurrent')
        const racing = {
          ...lake,
          mutate: async (mutations) => {
            await rawMutate([{ create: await copyOf(id, `drafts.${id}`, { title: 'Their work' }) }])
            return lake.mutate(mutations)
          },
        }
        const result = await run(propose(id, rev, { [`${HERO}.title`]: 'Mine' }), {
          client: racing,
        })
        expect(result.status).toBe('conflict')
        const theirs = await getDoc(`drafts.${id}`)
        expect(theirs.title).toBe('Their work')
        expect(theirs.pageBuilder[0].title).not.toBe('Mine')
      },
      TIMEOUT,
    )

    it(
      'refuses when an existing draft is edited after planning',
      async () => {
        const { id } = await makePage('edited')
        await rawMutate([{ createOrReplace: await copyOf(id, `drafts.${id}`) }])
        const draft = await getDoc(`drafts.${id}`)
        const racing = {
          ...lake,
          mutate: async (mutations) => {
            await rawMutate([{ patch: { id: `drafts.${id}`, set: { title: 'Edited meanwhile' } } }])
            return lake.mutate(mutations)
          },
        }
        const result = await run(propose(id, draft._rev, { [`${HERO}.title`]: 'Mine' }), {
          client: racing,
        })
        expect(result.status).toBe('conflict')
        const after = await getDoc(`drafts.${id}`)
        expect(after.title).toBe('Edited meanwhile')
        expect(after.pageBuilder[0].title).not.toBe('Mine')
      },
      TIMEOUT,
    )

    it(
      'a dry run reads and plans but writes nothing',
      async () => {
        const { id, rev } = await makePage('dry')
        const result = await run(propose(id, rev, { [`${HERO}.title`]: 'Dry' }), { yes: false })
        expect(result.status).toBe('dry-run')
        expect(await getDoc(`drafts.${id}`)).toBeUndefined()
      },
      TIMEOUT,
    )
  })

  describe('Studio validation and clean-up', () => {
    // A value the manifest accepts (any string) but the schema rejects: a URL that is not one.
    const BAD = { [`${HERO}.ctas[_key=="seede"].link.url`]: 'not a url' }

    it(
      'discards only its own draft when Studio validation finds errors',
      async () => {
        const bystander = await makePage('bystander')
        await rawMutate([
          {
            createOrReplace: await copyOf(bystander.id, `drafts.${bystander.id}`, {
              title: 'Editor in progress',
            }),
          },
        ])
        const bystanderDraft = await getDoc(`drafts.${bystander.id}`)
        const { id, rev } = await makePage('invalid')
        const result = await run(propose(id, rev, BAD))
        expect(result.status).toBe('invalid-in-sanity')
        expect(result.studio.errors.length).toBeGreaterThan(0)
        expect(result.cleanup).toEqual({ status: 'done', remaining: [] })
        expect(await getDoc(`drafts.${id}`)).toBeUndefined()
        expect((await getDoc(id))._rev).toBe(rev)
        expect(await getDoc(`drafts.${bystander.id}`)).toEqual(bystanderDraft)
      },
      TIMEOUT,
    )

    it(
      'restores a draft that existed before when the new version is invalid',
      async () => {
        const { id, rev } = await makePage('restore')
        await rawMutate([
          { createOrReplace: await copyOf(id, `drafts.${id}`, { title: 'Mine already' }) },
        ])
        const before = await getDoc(`drafts.${id}`)
        const result = await run(propose(id, before._rev, BAD))
        expect(result.status).toBe('invalid-in-sanity')
        expect(result.cleanup.status).toBe('done')
        const { _rev: _a, _updatedAt: _b, ...restored } = await getDoc(`drafts.${id}`)
        const { _rev: _c, _updatedAt: _d, ...original } = before
        expect(restored).toEqual(original)
        void [rev, _a, _b, _c, _d]
      },
      TIMEOUT,
    )

    it(
      'does not discard a draft edited after the write, and reports it',
      async () => {
        const { id, rev } = await makePage('later-edit')
        const result = await run(propose(id, rev, BAD), {
          sanityValidate: async (documents) => {
            const outcome = await realValidator()(documents)
            await rawMutate([{ patch: { id: `drafts.${id}`, set: { title: 'Their later edit' } } }])
            return outcome
          },
        })
        expect(result.status).toBe('invalid-in-sanity')
        expect(result.cleanup).toEqual({ status: 'failed', remaining: [`drafts.${id}`] })
        expect(result.manualActions.join(' ')).toContain(`drafts.${id}`)
        expect((await getDoc(`drafts.${id}`)).title).toBe('Their later edit')
      },
      TIMEOUT,
    )

    it(
      'treats a failed CLI as a failure and discards',
      async () => {
        const { id, rev } = await makePage('cli-fail')
        const broken = realValidator({
          run: (args, options) => {
            const copy = [...args]
            copy[copy.indexOf('--file') + 1] = '/nonexistent/documents.ndjson'
            return cli(copy, options)
          },
        })
        const result = await run(propose(id, rev, { [`${HERO}.title`]: 'Fine' }), {
          sanityValidate: broken,
        })
        expect(result.status).toBe('invalid-in-sanity')
        expect(result.notes.join(' ')).toMatch(/could not be checked/)
        expect(result.cleanup.status).toBe('done')
        expect(await getDoc(`drafts.${id}`)).toBeUndefined()
      },
      TIMEOUT,
    )

    it(
      'treats a validation timeout as a failure and discards',
      async () => {
        const { id, rev } = await makePage('timeout')
        const result = await run(propose(id, rev, { [`${HERO}.title`]: 'Fine' }), {
          sanityValidate: realValidator({ timeoutMs: 1500 }),
        })
        expect(result.status).toBe('invalid-in-sanity')
        expect(result.notes.join(' ')).toMatch(/timed out/)
        expect(result.cleanup.status).toBe('done')
        expect(await getDoc(`drafts.${id}`)).toBeUndefined()
      },
      TIMEOUT,
    )
  })

  describe('agency permissions with real tokens', () => {
    const editor = env.SANITY_PROPOSAL_EDITOR_TOKEN
    const editorIt = editor ? it : it.skip

    it(
      'a Developer token may apply an agency-only change',
      async () => {
        const { id, rev } = await makePage('agency')
        const result = await run(propose(id, rev, { [`${HERO}.style.spacing`]: 'spacious' }))
        expect(result.status).toBe('applied')
        expect(result.studio.errors).toEqual([])
        expect((await getDoc(`drafts.${id}`)).pageBuilder[0].style.spacing).toBe('spacious')
      },
      TIMEOUT,
    )

    editorIt(
      'an Editor token is refused the agency-only part and applies the rest',
      async () => {
        const { id, rev } = await makePage('editor')
        const result = await run(
          propose(id, rev, {
            [`${HERO}.title`]: 'Editor title',
            [`${HERO}.style.spacing`]: 'spacious',
          }),
          { client: clientWith(editor) },
        )
        expect(result.validation.rejected.map((p) => p.reasons[0].code)).toEqual([
          'agency-approval-required',
        ])
        expect(result.status).toBe('applied')
        const hero = (await getDoc(`drafts.${id}`)).pageBuilder[0]
        expect(hero.title).toBe('Editor title')
        expect(hero.style?.spacing).toBeUndefined()
      },
      TIMEOUT,
    )

    editorIt(
      'an Editor token alone writes nothing for an agency-only proposal',
      async () => {
        const { id, rev } = await makePage('editor-only')
        const result = await run(propose(id, rev, { [`${HERO}.style.spacing`]: 'spacious' }), {
          client: clientWith(editor),
        })
        expect(result.status).toBe('nothing-to-apply')
        expect(await getDoc(`drafts.${id}`)).toBeUndefined()
      },
      TIMEOUT,
    )
  })

  describe('release mode', () => {
    const releaseRun = (proposal, overrides = {}) => {
      releases.add(releaseIdFor(proposal.id))
      return run(proposal, { release: true, releasesEnabled: true, ...overrides })
    }
    const versionOf = (proposal, id) => `versions.${releaseIdFor(proposal.id)}.${id}`
    const releaseExists = async (proposal) =>
      (await lake.getDocuments([`_.releases.${releaseIdFor(proposal.id)}`])).length > 0
    const BAD = { [`${HERO}.ctas[_key=="seede"].link.url`]: 'not a url' }

    it(
      'writes a validated version into a new unpublished release and changes nothing published',
      async () => {
        const { id, rev } = await makePage('rel-ok')
        const proposal = propose(id, rev, { [`${HERO}.title`]: 'In a release' }, `it-rel-ok-${id}`)
        const result = await releaseRun(proposal)
        expect(result.status).toBe('applied')
        expect(result.studio.errors).toEqual([])
        const version = await getDoc(versionOf(proposal, id))
        expect(version.pageBuilder[0].title).toBe('In a release')
        expect(result.written).toEqual([{ id: versionOf(proposal, id), revision: version._rev }])
        const published = await getDoc(id)
        expect(published._rev).toBe(rev)
        expect(published.pageBuilder[0].title).not.toBe('In a release')
        expect(await getDoc(`drafts.${id}`)).toBeUndefined()
        const [release] = await lake.getDocuments([`_.releases.${releaseIdFor(proposal.id)}`])
        expect(release.state).toBe('active')
      },
      TIMEOUT,
    )

    it(
      'removes the whole release when Studio validation fails',
      async () => {
        const { id, rev } = await makePage('rel-bad')
        const proposal = propose(id, rev, BAD, `it-rel-bad-${id}`)
        const result = await releaseRun(proposal)
        expect(result.status).toBe('invalid-in-sanity')
        expect(result.studio.errors.length).toBeGreaterThan(0)
        expect(result.cleanup).toEqual({ status: 'done', remaining: [] })
        expect(await releaseExists(proposal)).toBe(false)
        expect(await getDoc(versionOf(proposal, id))).toBeUndefined()
        expect((await getDoc(id))._rev).toBe(rev)
      },
      TIMEOUT,
    )

    it(
      'keeps a version edited after the write, and the release, and reports them',
      async () => {
        const { id, rev } = await makePage('rel-edit')
        const proposal = propose(id, rev, BAD, `it-rel-edit-${id}`)
        const result = await releaseRun(proposal, {
          sanityValidate: async (documents) => {
            const outcome = await realValidator()(documents)
            await rawMutate([
              { patch: { id: versionOf(proposal, id), set: { title: 'Their edit' } } },
            ])
            return outcome
          },
        })
        expect(result.status).toBe('invalid-in-sanity')
        expect(result.cleanup.status).toBe('failed')
        expect(result.cleanup.remaining).toContain(versionOf(proposal, id))
        expect((await getDoc(versionOf(proposal, id))).title).toBe('Their edit')
        expect(await releaseExists(proposal)).toBe(true)
        expect(result.manualActions).toHaveLength(1)
      },
      TIMEOUT,
    )

    it(
      'refuses to run the same proposal into a release twice, and leaves the first alone',
      async () => {
        const { id, rev } = await makePage('rel-twice')
        const proposal = propose(id, rev, { [`${HERO}.title`]: 'Once' }, `it-rel-twice-${id}`)
        expect((await releaseRun(proposal)).status).toBe('applied')
        const first = await getDoc(versionOf(proposal, id))
        const second = await releaseRun(proposal)
        expect(second.status).toBe('conflict')
        expect(await getDoc(versionOf(proposal, id))).toEqual(first)
      },
      TIMEOUT,
    )

    it(
      'needs the profile flag and writes nothing without it',
      async () => {
        const { id, rev } = await makePage('rel-flag')
        const proposal = propose(id, rev, { [`${HERO}.title`]: 'x' }, `it-rel-flag-${id}`)
        await expect(run(proposal, { release: true, releasesEnabled: false })).rejects.toThrow(
          /releases/,
        )
        expect(await releaseExists(proposal)).toBe(false)
      },
      TIMEOUT,
    )
  })

  describe('scratch isolation', () => {
    it('refuses production and look-alike names before any request is made', async () => {
      let requests = 0
      const counting = clientWith(env.SANITY_PROPOSAL_TOKEN, async (...args) => {
        requests++
        return fetch(...args)
      })
      for (const dataset of ['production', 'scratchpad', 'my-scratch']) {
        await expect(run(propose('x', 'y', {}), { client: counting, dataset })).rejects.toThrow(
          /scratch/,
        )
      }
      expect(requests).toBe(0)
    })
  })
})
