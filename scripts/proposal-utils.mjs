/**
 * The logic behind `npm run proposal` (scripts/proposal.mjs): argument parsing, the scratch-dataset
 * rule and the apply sequence. Dependency-free and given everything it touches (the Sanity client, the
 * validator, the planner, the schema check), so tests run it with mocks and never reach Sanity.
 */
import { createHash } from 'node:crypto'

const API_VERSION = 'v2026-10-01'

/**
 * Only a dataset whose name starts with "scratch" is ever read or written. There is no override: a
 * proposal for a client or production dataset is applied by a person in Studio.
 */
export function assertScratchDataset(dataset) {
  if (typeof dataset !== 'string' || !/^scratch/.test(dataset)) {
    throw new Error(
      `Refusing dataset ${JSON.stringify(dataset ?? '')}: change proposals only run against a dataset whose name starts with "scratch".`,
    )
  }
}

export const USAGE = [
  'Usage:',
  '  npm run proposal -- validate <file> (--documents <file> | --dataset <scratch>)',
  '  npm run proposal -- apply <file> --dataset <scratch> [--release] [--yes]',
  '',
  'validate  checks a proposal and writes nothing. It needs the documents the proposal was made from:',
  '          a JSON file of them (--documents), or a scratch dataset to read them from (--dataset).',
  'apply     checks the proposal, then writes drafts in the scratch dataset. It is a dry run unless --yes.',
  '          --release puts the changes into one release (only when site.profile.ts has releases on).',
  'Nothing is ever published.',
].join('\n')

/** `{ command, file, dataset, documents, yes, release }`, or `{ error }` for a bad command line. */
export function parseArgs(argv) {
  const [command, ...rest] = argv
  if (command !== 'validate' && command !== 'apply') {
    return { error: command ? `Unknown command "${command}".` : 'Say what to do.' }
  }
  const options = {
    command,
    file: undefined,
    dataset: undefined,
    documents: undefined,
    yes: false,
    release: false,
  }
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]
    const valueOf = (name) => {
      if (arg === name) return rest[++i]
      return arg.startsWith(`${name}=`) ? arg.slice(name.length + 1) : undefined
    }
    if (arg === '--yes') options.yes = true
    else if (arg === '--release') options.release = true
    else if (arg === '--dataset' || arg.startsWith('--dataset='))
      options.dataset = valueOf('--dataset')
    else if (arg === '--documents' || arg.startsWith('--documents='))
      options.documents = valueOf('--documents')
    else if (arg.startsWith('--')) return { error: `Unknown option "${arg}".` }
    else if (options.file === undefined) options.file = arg
    else return { error: `Unexpected argument "${arg}".` }
  }
  if (!options.file) return { error: 'Give the proposal file.' }
  if (command === 'apply' && !options.dataset) return { error: 'apply needs --dataset <scratch>.' }
  if (command === 'validate' && !options.documents && !options.dataset) {
    return { error: 'validate needs the documents: --documents <file> or --dataset <scratch>.' }
  }
  if (command === 'validate' && (options.yes || options.release)) {
    return { error: 'validate writes nothing, so --yes and --release do not apply.' }
  }
  return options
}

/** A stable release id for a proposal, so a second --release run of the same proposal fails instead of duplicating. */
export function releaseIdFor(proposalId) {
  return `r${createHash('sha1').update(String(proposalId)).digest('hex').slice(0, 10)}`
}

/** A Sanity client over fetch with just what a proposal needs. Errors carry `status`. */
export function createHttpClient({ projectId, dataset, token, fetchImpl = fetch }) {
  const base = `https://${projectId}.api.sanity.io/${API_VERSION}/data`
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  async function request(url, init) {
    const response = await fetchImpl(url, { ...init, headers, signal: AbortSignal.timeout(30_000) })
    if (!response.ok) {
      const error = new Error(`Sanity answered HTTP ${response.status}`)
      error.status = response.status
      throw error
    }
    return response.json()
  }
  return {
    /** The documents with these ids that exist, as a list. */
    async getDocuments(ids) {
      const { documents } = await request(
        `${base}/doc/${dataset}/${ids.map(encodeURIComponent).join(',')}`,
      )
      return documents ?? []
    },
    /** One transaction. Throws with status 409 when an `ifRevisionID` no longer matches. */
    mutate: (mutations) =>
      request(`${base}/mutate/${dataset}?visibility=sync`, {
        method: 'POST',
        body: JSON.stringify({ mutations }),
      }),
    /** The Actions API (releases and versions), in one transaction. */
    action: (actions) =>
      request(`${base}/actions/${dataset}`, { method: 'POST', body: JSON.stringify({ actions }) }),
  }
}

/** The document each id stands for: its draft when there is one, else the published document. */
export async function readSnapshots(client, ids) {
  const found = await client.getDocuments(ids.flatMap((id) => [id, `drafts.${id}`]))
  const byId = new Map(found.map((doc) => [doc._id, doc]))
  const snapshots = {}
  for (const id of ids) {
    const doc = byId.get(`drafts.${id}`) ?? byId.get(id)
    if (doc) snapshots[id] = doc
  }
  return snapshots
}

export function documentIdsOf(proposal) {
  const changes = Array.isArray(proposal?.changes) ? proposal.changes : []
  return [
    ...new Set(changes.map((change) => change?.documentId).filter((id) => typeof id === 'string')),
  ]
}

/** What `sanity documents validate --format json` reported for `ids`: the error messages, or undefined for none. */
export function errorsFromCliOutput(output, ids) {
  const wanted = new Set(ids)
  let entries
  try {
    const parsed = JSON.parse(output)
    entries = Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    entries = output
      .split('\n')
      .filter((line) => line.trim().startsWith('{'))
      .map((line) => JSON.parse(line))
  }
  const messages = []
  for (const entry of entries) {
    const id = entry?.documentId ?? entry?.id
    if (!wanted.has(id)) continue
    for (const marker of entry.validation ?? entry.markers ?? []) {
      if (marker.level === 'error') messages.push(`${id}: ${marker.message}`)
    }
  }
  return messages
}

/**
 * Runs the Studio's own validation rules over the drafts just written, with `sanity documents
 * validate` (the sanity package's `validateDocument` could not be run from Node reliably: README,
 * "Change proposals"). `run(args)` returns `{ status, stdout }`; it is injectable for tests.
 */
export function sanityValidator({ dataset, run }) {
  return async (ids) => {
    const result = run([
      'sanity',
      'documents',
      'validate',
      '--dataset',
      dataset,
      '--level',
      'error',
      '--format',
      'json',
      '--yes',
    ])
    // The CLI exits 1 when it finds errors, so a non-zero status alone is not "could not run".
    let errors
    try {
      errors = errorsFromCliOutput(result.stdout ?? '', ids)
    } catch {
      throw new Error('Could not read the output of `sanity documents validate`.')
    }
    if (result.status !== 0 && result.status !== 1) {
      throw new Error(
        '`sanity documents validate` did not run. Is the Sanity CLI signed in (`npx sanity login`)?',
      )
    }
    return errors
  }
}

/**
 * Checks a proposal and, with `yes`, writes it as drafts.
 *
 * @param o.proposal       the parsed proposal
 * @param o.client         { getDocuments, mutate, action }
 * @param o.dataset        must start with "scratch"
 * @param o.validate       (proposal, { manifest, documents }) => validation   (src/lib/proposals/validate.ts)
 * @param o.plan           { planProposal, undoMutations, undoReleaseActions }   (src/lib/proposals/plan.ts)
 * @param o.manifest       the design manifest
 * @param o.yes            write; otherwise a dry run
 * @param o.release        write into one release
 * @param o.releasesEnabled the profile's `releases` flag
 * @param o.sanityValidate (ids) => error messages; runs after the write
 *
 * Returns `{ status, validation, plan?, written?, errors?, notes }` where status is one of
 * rejected, nothing-to-apply, dry-run, conflict, invalid-in-sanity, failed, applied.
 */
export async function runProposal(o) {
  assertScratchDataset(o.dataset)
  if (o.release && !o.releasesEnabled) {
    throw new Error(
      '--release needs features.releases switched on in site.profile.ts (and a Sanity plan with Releases).',
    )
  }
  const notes = []
  const ids = documentIdsOf(o.proposal)
  const documents = ids.length > 0 ? await readSnapshots(o.client, ids) : {}
  const validation = o.validate(o.proposal, { manifest: o.manifest, documents })
  if (validation.rejection) return { status: 'rejected', validation, notes }
  if (validation.applicable.length === 0) return { status: 'nothing-to-apply', validation, notes }

  const release = o.release
    ? {
        id: releaseIdFor(o.proposal.id),
        title: `Proposal ${o.proposal.id}`,
        description: o.proposal.intent,
      }
    : undefined
  const plan = o.plan.planProposal(validation.applicable, documents, { release })
  if (!o.yes) return { status: 'dry-run', validation, plan, notes }

  const undo = async () => {
    try {
      if (release) await o.client.action(o.plan.undoReleaseActions(plan.writes, release.id))
      else await o.client.mutate(o.plan.undoMutations(plan.writes))
      notes.push('The drafts were discarded.')
    } catch {
      notes.push(
        `Could not discard the drafts automatically: discard ${plan.writes.map((w) => w.targetId).join(', ')} in Studio.`,
      )
    }
  }

  try {
    if (release) await o.client.action(plan.releaseActions)
    await o.client.mutate(plan.mutations)
  } catch (error) {
    if (error?.status === 409) {
      if (release) await undo()
      notes.push(
        'A document changed after the proposal was read. Nothing was written. Propose again from the new revision.',
      )
      return { status: 'conflict', validation, plan, notes }
    }
    if (release) await undo()
    notes.push(
      `The write failed (${error?.message ?? 'unknown error'}). One transaction: nothing was left half-written.`,
    )
    return { status: 'failed', validation, plan, notes }
  }

  let errors
  try {
    errors = await o.sanityValidate(plan.writes.map((write) => write.targetId))
  } catch (error) {
    await undo()
    notes.push(`${error.message} The drafts were discarded because they could not be checked.`)
    return { status: 'invalid-in-sanity', validation, plan, errors: [], notes }
  }
  if (errors.length > 0) {
    await undo()
    return { status: 'invalid-in-sanity', validation, plan, errors, notes }
  }
  return { status: 'applied', validation, plan, written: plan.writes, notes }
}
