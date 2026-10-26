/**
 * Fails when the Sanity dataset is public. Datasets are private so members-only content and form
 * recipient addresses can't be read from the Content Lake with just the project ID (README, "Dataset
 * privacy"). Run with `npm run check:dataset`; reads the environment, then .env.local (the daily health
 * workflow sets the environment; README, "Health checks"). Dependency-free, like the setup wizard,
 * and it survives the wizard being deleted from a client site.
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
export async function checkDataset({ projectId, dataset, token, fetchImpl = fetch }) {
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
  return evaluateDataset({ dataset, status: response.status, body })
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
  const result = await checkDataset({ projectId, dataset, token })
  // `--json` is for the health workflow: one object, with the anonymous enquiry-exposure probe when the dataset isn't known to be private.
  if (process.argv.includes('--json')) {
    // Anything that isn't known to be private is probed without the token. A project ID is needed.
    const probe =
      result.private !== true && projectId
        ? await probeEnquiryExposure({ projectId, dataset })
        : { state: 'not-checked', count: null }
    console.log(JSON.stringify({ ...result, enquiries: probe.state, enquiryCount: probe.count }))
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
