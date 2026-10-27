/**
 * Fails when the Sanity dataset is public. Datasets are private so members-only content and form
 * recipient addresses can't be read from the Content Lake with just the project ID (README, "Dataset
 * privacy"). Run with `npm run check:dataset`; reads the environment, then .env.local (the daily health
 * workflow sets the environment; README, "Health checks"). Dependency-free, like the setup wizard,
 * and it survives the wizard being deleted from a client site.
 *
 * ACCEPT_PUBLIC_DATASET (a written reason) acknowledges a public dataset on purpose, for a site on a
 * plan without private datasets. It is allowed only while an anonymous request finds none of the
 * sensitive things in scripts/dataset-exposure.json, and is reported as accepted, never as private.
 * Those probes are a tripwire, not a safety proof.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const API_VERSION = 'v2021-06-07'

/** Reads KEY=value lines (optionally quoted), ignoring comments and blanks. */
export function parseEnv(source) {
  const env = {}
  for (const line of source.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (!match) continue
    let value = match[2]
    const quote = value[0]
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length > 1) {
      value = value.slice(1, -1)
    } else {
      value = value.replace(/\s+#.*$/, '')
    }
    env[match[1]] = value
  }
  return env
}

/**
 * Decides from the datasets API response. Pure: `status` is the HTTP status and `body` the parsed JSON
 * (or null). Returns `{ ok, private, message }`; `ok` is true only when the dataset is known to be private.
 * `private` is true or false when the API said so, and null when the visibility couldn't be read.
 */
export function evaluateDataset({ dataset, status, body }) {
  if (status === 401 || status === 403) {
    return {
      ok: false,
      private: null,
      message: `The Sanity API refused the token (HTTP ${status}), so the dataset's visibility couldn't be read. Check SANITY_API_READ_TOKEN, or look at sanity.io/manage → API → Datasets.`,
    }
  }
  if (status < 200 || status >= 300 || !Array.isArray(body)) {
    return {
      ok: false,
      private: null,
      message: `Couldn't read the dataset list from Sanity (HTTP ${status}). Check NEXT_PUBLIC_SANITY_PROJECT_ID and try again.`,
    }
  }
  const found = body.find((item) => item?.name === dataset)
  if (!found) {
    const names = body.map((item) => item?.name).filter(Boolean)
    return {
      ok: false,
      private: null,
      message: `The project has no dataset named "${dataset}" (it has: ${names.join(', ') || 'none'}). Check NEXT_PUBLIC_SANITY_DATASET.`,
    }
  }
  if (found.aclMode === 'private') {
    return { ok: true, private: true, message: `Dataset "${dataset}" is private.` }
  }
  if (found.aclMode === 'public') {
    return {
      ok: false,
      private: false,
      message: `Dataset "${dataset}" is PUBLIC: anyone with the project ID can read members-only content and form recipient addresses. Make it private: npx sanity dataset visibility set ${dataset} private (or sanity.io/manage → API → Datasets). See README, "Dataset privacy".`,
    }
  }
  return {
    ok: false,
    private: null,
    message: `Dataset "${dataset}" reports an unknown visibility (${JSON.stringify(found.aclMode)}), so it isn't treated as private.`,
  }
}

/**
 * Decides exposure from an UNAUTHENTICATED count of published enquiries. Pure. A count above zero is
 * confirmed exposure; "none found" needs a valid count of zero. A refusal (401/403) is "refused" and
 * anything else (a network error, a 5xx, a body that isn't a count) is "unverified"; neither is ever
 * "none found", because a query that did not answer proves nothing.
 */
export function evaluateEnquiryProbe({ status, body }) {
  if (status === 401 || status === 403) return { state: 'refused', count: null }
  const count = body?.result
  if (status >= 200 && status < 300 && Number.isInteger(count) && count >= 0) {
    return { state: count > 0 ? 'exposed' : 'none-found', count }
  }
  return { state: 'unverified', count: null }
}

/**
 * What an anonymous visitor could read from a public dataset that matters, from
 * scripts/dataset-exposure.json (the same file a test checks against the Studio's schema).
 */
const EXPOSURE = JSON.parse(
  readFileSync(new URL('./dataset-exposure.json', import.meta.url), 'utf8'),
)
const SENSITIVE_PROBES = Object.entries(EXPOSURE.probes).map(([key, probe]) => ({ key, ...probe }))

/** One line of free text from a variable, short enough to sit in a log and an issue. */
function oneLineReason(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
}

/**
 * Whether a public dataset may be accepted. Pure. It needs a written reason AND an anonymous request
 * that found none of the sensitive things; anything exposed, refused or unanswered blocks it, because
 * a query that didn't answer proves nothing. Returns `{ accepted, reason, blockers }`.
 */
export function evaluateAcceptance({ reason, states }) {
  const why = oneLineReason(reason)
  const blockers = []
  if (!why) return { accepted: false, reason: '', blockers }
  for (const probe of SENSITIVE_PROBES) {
    const state = states[probe.key]
    if (state === 'exposed') blockers.push(`${probe.label} are readable by anyone`)
    else if (state !== 'none-found') blockers.push(`${probe.label} could not be checked`)
  }
  return { accepted: blockers.length === 0, reason: why, blockers }
}

/** The anonymous count for each sensitive thing: no token, counts only, nothing read or printed. */
export async function probeSensitive({ projectId, dataset, fetchImpl = fetch }) {
  const states = {}
  for (const probe of SENSITIVE_PROBES) {
    const query = encodeURIComponent(probe.groq)
    try {
      const response = await fetchImpl(
        `https://${projectId}.api.sanity.io/${API_VERSION}/data/query/${encodeURIComponent(dataset)}?query=${query}`,
        { signal: AbortSignal.timeout(10_000) },
      )
      let body = null
      try {
        body = await response.json()
      } catch {
        // Left null: not a count, so unverified.
      }
      states[probe.key] = evaluateEnquiryProbe({ status: response.status, body }).state
    } catch {
      states[probe.key] = 'unverified'
    }
  }
  return states
}

/**
 * Asks Sanity, with no token at all, how many published `enquiry` documents a visitor could count.
 * This is what an anonymous visitor can do, so it tests real exposure; a token would see private
 * data too. A count only: no document, field or name is read, printed or saved.
 */
export async function probeEnquiryExposure({ projectId, dataset, fetchImpl = fetch }) {
  const query = encodeURIComponent('count(*[_type == "enquiry" && !(_id in path("drafts.**"))])')
  try {
    const response = await fetchImpl(
      `https://${projectId}.api.sanity.io/${API_VERSION}/data/query/${encodeURIComponent(dataset)}?query=${query}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    let body = null
    try {
      body = await response.json()
    } catch {
      // Left null: not a count, so unverified.
    }
    return evaluateEnquiryProbe({ status: response.status, body })
  } catch {
    return { state: 'unverified', count: null }
  }
}

/** Asks the Sanity API for the dataset's visibility. `fetchImpl` is injectable for tests. */
export async function checkDataset({
  projectId,
  dataset,
  token,
  acceptPublic = '',
  fetchImpl = fetch,
}) {
  const missing = [
    !projectId && 'NEXT_PUBLIC_SANITY_PROJECT_ID',
    !dataset && 'NEXT_PUBLIC_SANITY_DATASET',
    !token && 'SANITY_API_READ_TOKEN',
  ].filter(Boolean)
  if (missing.length > 0) {
    return { ok: false, private: null, message: `Missing in .env.local: ${missing.join(', ')}.` }
  }

  let response
  try {
    response = await fetchImpl(`https://${projectId}.api.sanity.io/${API_VERSION}/datasets`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })
  } catch (error) {
    return {
      ok: false,
      private: null,
      message: `Couldn't reach the Sanity API: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
  let body = null
  try {
    body = await response.json()
  } catch {
    // Leave null: evaluateDataset reports an unreadable response.
  }
  const result = evaluateDataset({ dataset, status: response.status, body })

  // A public dataset can be accepted on purpose (README, "Dataset privacy"): only with a written
  // reason, and only while an anonymous request finds none of the sensitive things. It is a warning,
  // never a pass, and anything found puts the failure back.
  if (result.private !== false || !oneLineReason(acceptPublic)) return result
  const states = await probeSensitive({ projectId, dataset, fetchImpl })
  const decision = evaluateAcceptance({ reason: acceptPublic, states })
  if (decision.accepted) {
    return {
      ok: true,
      private: false,
      accepted: true,
      states,
      message: `Dataset "${dataset}" is PUBLIC, and that is accepted on purpose (${decision.reason}). This acknowledges a public dataset; it does not mean its content is safe. An anonymous request found none of the sensitive things this template knows about (${SENSITIVE_PROBES.map((probe) => probe.label).join(', ')}). Keep anything private out of the dataset, and make it private before the site uses any of them.`,
    }
  }
  return {
    ...result,
    states,
    message: `${result.message} ACCEPT_PUBLIC_DATASET is set but cannot apply: ${decision.blockers.join('; ')}.`,
  }
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const envPath = join(root, '.env.local')
  const file = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {}
  const read = (key) => process.env[key] || file[key]
  if (!existsSync(envPath) && !read('SANITY_API_READ_TOKEN')) {
    console.error('✗ No .env.local found. Copy .env.example and fill it in first.')
    process.exit(1)
  }
  const projectId = read('NEXT_PUBLIC_SANITY_PROJECT_ID')
  const dataset = read('NEXT_PUBLIC_SANITY_DATASET') || 'production'
  const token = read('SANITY_API_READ_TOKEN')
  const result = await checkDataset({
    projectId,
    dataset,
    token,
    acceptPublic: read('ACCEPT_PUBLIC_DATASET'),
  })
  // `--json` is for the health workflow: one object, with the anonymous enquiry-exposure probe when the dataset isn't known to be private.
  if (process.argv.includes('--json')) {
    // Anything that isn't known to be private is probed without the token. A project ID is needed.
    const probe = result.accepted
      ? { state: 'none-found', count: 0 }
      : result.private !== true && projectId
        ? await probeEnquiryExposure({ projectId, dataset })
        : { state: 'not-checked', count: null }
    const { states: _states, ...shown } = result
    console.log(JSON.stringify({ ...shown, enquiries: probe.state, enquiryCount: probe.count }))
    process.exit(result.ok ? 0 : 1)
  }
  if (result.ok) {
    console.log(`✓ ${result.message}`)
  } else {
    console.error(`✗ ${result.message}`)
    process.exit(1)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
