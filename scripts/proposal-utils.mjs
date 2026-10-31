/**
 * The logic behind `npm run proposal` (scripts/proposal.mjs): argument parsing, the scratch-dataset
 * rule and the apply sequence. Dependency-free and given everything it touches (the Sanity client, the
 * validator, the planner, the schema check), so tests run it with mocks and never reach Sanity.
 */
import { createHash } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const API_VERSION = 'v2026-10-01'

/**
 * Release mode is built (src/lib/proposals/plan.ts) and its action shapes match the installed
 * @sanity/client types, but it has never run against a real dataset: release states, the
 * archive-before-delete rule and asynchronous clean-up are unverified. It stays off until a scratch
 * dataset run has shown each of them, and `--release` is refused until then.
 */
export const RELEASE_MODE_VERIFIED = false

/** Roles that count as the agency (src/lib/sanity/roles.ts). */
const AGENCY_ROLES = ['administrator', 'developer']
const VALIDATE_TIMEOUT_MS = 180_000

/**
 * Only a dataset named "scratch", or "scratch-…" / "scratch_…", is ever read or written ("scratchpad" is not). There is no override: a
 * proposal for a client or production dataset is applied by a person in Studio.
 */
export function assertScratchDataset(dataset) {
  if (typeof dataset !== 'string' || !/^scratch(?:[-_][a-z0-9_-]+)?$/.test(dataset)) {
    throw new Error(
      `Refusing dataset ${JSON.stringify(dataset ?? '')}: change proposals only run against a dataset named "scratch", "scratch-…" or "scratch_…".`,
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
  '          --release is disabled until release mode has been verified on a scratch dataset.',
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
      request(`${base}/mutate/${dataset}?visibility=sync&returnDocuments=true`, {
        method: 'POST',
        body: JSON.stringify({ mutations }),
      }),
    /** The role names of whoever the token belongs to. Throws when they cannot be read. */
    async getRoles() {
      const me = await request(`https://${projectId}.api.sanity.io/v2021-06-07/users/me`)
      return (Array.isArray(me?.roles) ? me.roles : []).map((role) => String(role?.name))
    },
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

/**
 * Reads the output of `sanity documents validate --format json` (CLI 8.18.0, actions/documents/
 * validation/reporters/jsonReporter.js): one JSON array with an entry per document that has markers,
 * `{ documentId, documentType, level, markers: [{ level, message, path }], revision }`. Anything else
 * throws: output that cannot be read is never a pass.
 */
export function parseValidationOutput(stdout) {
  let entries
  try {
    entries = JSON.parse(String(stdout ?? '').trim())
  } catch {
    throw new Error('The Studio validation output could not be read as JSON.')
  }
  if (
    !Array.isArray(entries) ||
    !entries.every(
      (entry) =>
        entry !== null &&
        typeof entry === 'object' &&
        typeof entry.documentId === 'string' &&
        Array.isArray(entry.markers),
    )
  ) {
    throw new Error('The Studio validation output was not in the expected shape.')
  }
  const errors = []
  const warnings = []
  for (const entry of entries) {
    for (const marker of entry.markers) {
      const line = `${entry.documentId}: ${String(marker?.message ?? 'no message')}`
      if (marker?.level === 'error') errors.push(line)
      else if (marker?.level === 'warning') warnings.push(line)
    }
  }
  return { errors, warnings }
}

/**
 * Runs the Studio's own validation rules over exactly the documents just written, with `sanity
 * documents validate --file` (the sanity package's `validateDocument` could not be run from Node
 * reliably: README, "Change proposals"). It validates an NDJSON file of those documents, not the
 * whole dataset. The CLI signs in as a person (`npx sanity login`), separately from the token.
 *
 * `run(args, { env, timeout })` returns `{ status, stdout, error, signal }`; injectable for tests.
 * Resolves `{ errors, warnings }`; throws when validation could not run or could not be read, so a
 * missing sign-in, a timeout or odd output can never count as a pass.
 */
export function sanityValidator({ projectId, dataset, run, timeoutMs = VALIDATE_TIMEOUT_MS }) {
  return async (documents) => {
    const dir = mkdtempSync(join(tmpdir(), 'proposal-validate-'))
    try {
      const file = join(dir, 'documents.ndjson')
      writeFileSync(file, `${documents.map((doc) => JSON.stringify(doc)).join('\n')}\n`, {
        mode: 0o600,
      })
      const result = run(
        [
          'sanity',
          'documents',
          'validate',
          '--file',
          file,
          '--project-id',
          projectId,
          '--dataset',
          dataset,
          '--level',
          'warning',
          '--format',
          'json',
          '--yes',
        ],
        {
          timeout: timeoutMs,
          env: { NEXT_PUBLIC_SANITY_PROJECT_ID: projectId, NEXT_PUBLIC_SANITY_DATASET: dataset },
        },
      )
      if (result?.error?.code === 'ETIMEDOUT') {
        throw new Error(
          `Studio validation timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
        )
      }
      if (result?.error || result?.signal || typeof result?.status !== 'number') {
        throw new Error(
          'Studio validation did not run (the Sanity CLI could not be started or was stopped).',
        )
      }
      // Exit 1 is both "found errors" and "could not run" (not signed in, no schema): only readable
      // output that really contains an error marker counts as the first.
      if (result.status !== 0 && result.status !== 1) {
        throw new Error(
          `Studio validation did not run (the Sanity CLI exited with ${result.status}).`,
        )
      }
      let parsed
      try {
        parsed = parseValidationOutput(result.stdout)
      } catch (error) {
        throw new Error(
          `${error.message} If the CLI is not signed in, run \`npx sanity login\` and try again.`,
        )
      }
      if (result.status === 1 && parsed.errors.length === 0) {
        throw new Error('The Sanity CLI reported a failure without any validation errors.')
      }
      return parsed
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }
}

/** Whether the token belongs to an agency role. Fails closed: anything unreadable is "no". */
async function isAgencyToken(client) {
  try {
    const roles = await client.getRoles()
    return roles.some((role) => AGENCY_ROLES.includes(role))
  } catch {
    return false
  }
}

/** The last revision and document each written id was left with, from the mutate response. */
function writtenFrom(response) {
  const revisions = {}
  const documents = {}
  for (const result of Array.isArray(response?.results) ? response.results : []) {
    const doc = result?.document
    if (doc && typeof doc._id === 'string' && typeof doc._rev === 'string') {
      revisions[doc._id] = doc._rev
      documents[doc._id] = doc
    }
  }
  return { revisions, documents }
}

/**
 * Checks a proposal and, with `yes`, writes it as drafts.
 *
 * @param o.proposal        the parsed proposal
 * @param o.client          { getDocuments, mutate, getRoles }
 * @param o.dataset         must start with "scratch"
 * @param o.validate        (proposal, { manifest, documents, agencyApproved }) => validation
 * @param o.plan            { planProposal, undoMutations }   (src/lib/proposals/plan.ts)
 * @param o.manifest        the design manifest
 * @param o.yes             write; otherwise a dry run
 * @param o.release         refused while RELEASE_MODE_VERIFIED is false
 * @param o.sanityValidate  (documents) => { errors, warnings }; throws when it could not run
 *
 * The write is ONE transaction: it all lands or none of it does. Validation and clean-up are
 * separate requests, so the whole run is NOT atomic: if validation fails, a second, guarded
 * transaction discards what this proposal wrote, and `cleanup` says whether that worked.
 *
 * Returns `{ status, validation, plan, written, studio, cleanup, manualActions, notes }`.
 * status: rejected | nothing-to-apply | dry-run | conflict | failed | invalid-in-sanity | applied.
 * cleanup.status: not-needed | done | failed; `remaining` lists ids still in the dataset.
 */
export async function runProposal(o) {
  assertScratchDataset(o.dataset)
  if (o.release && !RELEASE_MODE_VERIFIED) {
    throw new Error(
      '--release is disabled: release mode has not been verified against a real scratch dataset. Apply as drafts instead.',
    )
  }
  const notes = []
  const manualActions = []
  const cleanup = { status: 'not-needed', remaining: [] }
  const base = { notes, manualActions, cleanup, studio: { errors: [], warnings: [] }, written: [] }

  const ids = documentIdsOf(o.proposal)
  const documents = ids.length > 0 ? await readSnapshots(o.client, ids) : {}
  let validation = o.validate(o.proposal, { manifest: o.manifest, documents })
  // Agency-only changes are enforced, not just flagged: they need a token held by the agency.
  if (!validation.rejection && validation.applicable.some((patch) => patch.needsAgencyReview)) {
    const agencyApproved = await isAgencyToken(o.client)
    validation = o.validate(o.proposal, { manifest: o.manifest, documents, agencyApproved })
  }
  if (validation.rejection) return { ...base, status: 'rejected', validation }
  if (validation.applicable.length === 0) return { ...base, status: 'nothing-to-apply', validation }

  const plan = o.plan.planProposal(validation.applicable, documents)
  if (!o.yes) return { ...base, status: 'dry-run', validation, plan }

  let response
  try {
    response = await o.client.mutate(plan.mutations)
  } catch (error) {
    // One transaction: a refusal means nothing was written, so there is nothing to clean up.
    if (error?.status === 409) {
      notes.push(
        'A document changed (or a draft appeared) after the proposal was read. Nothing was written. Propose again from the new revision.',
      )
      return { ...base, status: 'conflict', validation, plan }
    }
    notes.push(`The write failed (${error?.message ?? 'unknown error'}). Nothing was written.`)
    return { ...base, status: 'failed', validation, plan }
  }

  const { revisions, documents: written } = writtenFrom(response)
  const targets = plan.writes.map((write) => write.targetId)
  const result = {
    ...base,
    validation,
    plan,
    written: targets.map((id) => ({ id, revision: revisions[id] })),
  }

  let failure
  try {
    const missing = targets.filter((id) => !written[id])
    if (missing.length > 0)
      throw new Error(
        'Sanity did not return the documents just written, so they cannot be validated.',
      )
    const studio = await o.sanityValidate(targets.map((id) => written[id]))
    result.studio = studio
    if (studio.errors.length > 0) failure = 'Studio validation found errors.'
  } catch (error) {
    failure = `${error.message} The drafts could not be checked.`
  }
  if (!failure) return { ...result, status: 'applied' }

  notes.push(failure)
  const undo = o.plan.undoMutations(plan.writes, revisions)
  let remaining = [...undo.unguarded]
  if (undo.mutations.length > 0) {
    try {
      await o.client.mutate(undo.mutations)
    } catch (error) {
      notes.push(
        error?.status === 409
          ? 'A draft was edited after the proposal wrote it, so it was NOT discarded.'
          : `Discarding the drafts failed (${error?.message ?? 'unknown error'}).`,
      )
      remaining = targets
    }
  }
  if (remaining.length > 0) {
    cleanup.status = 'failed'
    cleanup.remaining = remaining
    manualActions.push(`Review and discard these drafts in Studio: ${remaining.join(', ')}.`)
  } else {
    cleanup.status = 'done'
    notes.push('The drafts this proposal wrote were discarded; nothing else was touched.')
  }
  return { ...result, status: 'invalid-in-sanity' }
}
