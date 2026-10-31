/**
 * Probes Sanity's release and document-version actions on a scratch dataset, to find out what
 * release mode can rely on before it is enabled. Creates ONE release and ONE throwaway document,
 * never publishes or schedules, and removes both. Prints statuses and shapes, never document contents.
 *
 *   PROPOSAL_INTEGRATION_DATASET=scratch-proposals node scripts/spikes/release-mode-probe.mjs
 */
import { join } from 'node:path'

import { loadEnv } from '../config-check.mjs'
import { assertScratchDataset, createHttpClient } from '../proposal-utils.mjs'

const dataset = process.env.PROPOSAL_INTEGRATION_DATASET
assertScratchDataset(dataset)
const root = join(import.meta.dirname, '..', '..')
const env = loadEnv(root)
const client = createHttpClient({
  projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset,
  token: env.SANITY_PROPOSAL_TOKEN,
})
const base = `https://${env.NEXT_PUBLIC_SANITY_PROJECT_ID}.api.sanity.io/v2026-10-01/data`
const headers = { Authorization: `Bearer ${env.SANITY_PROPOSAL_TOKEN}` }
const query = async (groq) =>
  (
    await (
      await fetch(`${base}/query/${dataset}?perspective=raw&query=${encodeURIComponent(groq)}`, {
        headers,
      })
    ).json()
  ).result

const releaseId = `rprobe${Date.now().toString(36)}`
const docId = `ptest-release-probe`
const versionId = `versions.${releaseId}.${docId}`
const log = (step, value) =>
  console.log(`${step}:`, typeof value === 'string' ? value : JSON.stringify(value))
const attempt = async (step, fn) => {
  try {
    const r = await fn()
    log(step, 'ok')
    return r
  } catch (e) {
    log(step, `FAILED http=${e.status ?? '?'} ${e.message}`)
    return undefined
  }
}
const releaseDoc = async () =>
  await query(
    `*[_id == "_.releases.${releaseId}"][0]{state,"type":_type,"rt":metadata.releaseType}`,
  )

const [{ _rev: _a, _createdAt: _b, _updatedAt: _c, ...home }] = await client.getDocuments([
  'page-home',
])
await client.mutate([
  {
    createOrReplace: {
      ...home,
      _id: docId,
      title: 'Release probe',
      slug: { _type: 'slug', current: docId },
    },
  },
])
const published = (await client.getDocuments([docId]))[0]
log('published rev before', published._rev.slice(0, 6))

try {
  await attempt('1 release.create', () =>
    client.action([
      {
        actionType: 'sanity.action.release.create',
        releaseId,
        metadata: { title: 'Probe', description: 'probe', releaseType: 'undecided' },
      },
    ]),
  )
  log('  release doc', await releaseDoc())

  await attempt('2 version.create (document)', () =>
    client.action([
      {
        actionType: 'sanity.action.document.version.create',
        publishedId: docId,
        document: {
          ...home,
          _id: versionId,
          title: 'Release probe',
          slug: { _type: 'slug', current: docId },
        },
      },
    ]),
  )
  const version = (await client.getDocuments([versionId]))[0]
  log('3 version exists', Boolean(version))
  log('  version rev / type / same title', {
    rev: typeof version?._rev,
    type: version?._type,
    title: version?.title,
  })

  await attempt('4 patch version with right ifRevisionID', () =>
    client.mutate([
      { patch: { id: versionId, ifRevisionID: version._rev, set: { title: 'Release probe 2' } } },
    ]),
  )
  await attempt('  patch version with WRONG ifRevisionID (expect 409)', () =>
    client.mutate([{ patch: { id: versionId, ifRevisionID: 'wrong', set: { title: 'x' } } }]),
  )
  const after = (await client.getDocuments([versionId]))[0]
  log('  version title after', after?.title)
  const pubNow = (await client.getDocuments([docId]))[0]
  log('5 published untouched', pubNow._rev === published._rev && pubNow.title === 'Release probe')

  // Does version.create with the same id again fail (so a second --release of a proposal cannot duplicate)?
  await attempt('  version.create again (expect failure)', () =>
    client.action([
      {
        actionType: 'sanity.action.document.version.create',
        publishedId: docId,
        document: {
          ...home,
          _id: versionId,
          title: 'dup',
          slug: { _type: 'slug', current: docId },
        },
      },
    ]),
  )

  await attempt('6a version.discard', () =>
    client.action([{ actionType: 'sanity.action.document.version.discard', versionId }]),
  )
  log('  version after discard', Boolean((await client.getDocuments([versionId]))[0]))
  await attempt('6b release.delete WITHOUT archive (shows the rule)', () =>
    client.action([{ actionType: 'sanity.action.release.delete', releaseId }]),
  )
  log('  release doc', await releaseDoc())
  await attempt('6c release.archive', () =>
    client.action([{ actionType: 'sanity.action.release.archive', releaseId }]),
  )
  for (let i = 0; i < 8; i++) {
    const r = await releaseDoc()
    log(`  state poll ${i}`, r)
    if (!r || r.state !== 'archiving') break
    await new Promise((r) => setTimeout(r, 1500))
  }
  await attempt('6d release.delete', () =>
    client.action([{ actionType: 'sanity.action.release.delete', releaseId }]),
  )
  for (let i = 0; i < 8; i++) {
    const r = await releaseDoc()
    log(`  after delete poll ${i}`, r ?? 'gone')
    if (!r) break
    await new Promise((r) => setTimeout(r, 1500))
  }
} finally {
  await client.mutate([{ delete: { id: docId } }]).catch(() => undefined)
  const leftover = await query(
    `*[_id in ["${docId}","${versionId}","_.releases.${releaseId}"]]{_id}`,
  )
  log('LEFTOVER', leftover)
}
