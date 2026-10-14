/**
 * Fails when the Sanity dataset is public. Datasets are private so members-only content and form
 * recipient addresses can't be read from the Content Lake with just the project ID (README, "Dataset
 * privacy"). Run with `npm run check:dataset`; reads .env.local. Dependency-free, like the setup wizard,
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
 * (or null). Returns `{ ok, message }`; `ok` is true only when the dataset is known to be private.
 */
export function evaluateDataset({ dataset, status, body }) {
  if (status === 401 || status === 403) {
    return {
      ok: false,
      message: `The Sanity API refused the token (HTTP ${status}), so the dataset's visibility couldn't be read. Check SANITY_API_READ_TOKEN, or look at sanity.io/manage → API → Datasets.`,
    }
  }
  if (status < 200 || status >= 300 || !Array.isArray(body)) {
    return {
      ok: false,
      message: `Couldn't read the dataset list from Sanity (HTTP ${status}). Check NEXT_PUBLIC_SANITY_PROJECT_ID and try again.`,
    }
  }
  const found = body.find((item) => item?.name === dataset)
  if (!found) {
    const names = body.map((item) => item?.name).filter(Boolean)
    return {
      ok: false,
      message: `The project has no dataset named "${dataset}" (it has: ${names.join(', ') || 'none'}). Check NEXT_PUBLIC_SANITY_DATASET.`,
    }
  }
  if (found.aclMode === 'private') {
    return { ok: true, message: `Dataset "${dataset}" is private.` }
  }
  if (found.aclMode === 'public') {
    return {
      ok: false,
      message: `Dataset "${dataset}" is PUBLIC: anyone with the project ID can read members-only content and form recipient addresses. Make it private: npx sanity dataset visibility set ${dataset} private (or sanity.io/manage → API → Datasets). See README, "Dataset privacy".`,
    }
  }
  return {
    ok: false,
    message: `Dataset "${dataset}" reports an unknown visibility (${JSON.stringify(found.aclMode)}), so it isn't treated as private.`,
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
    return { ok: false, message: `Missing in .env.local: ${missing.join(', ')}.` }
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
  if (!existsSync(envPath)) {
    console.error('✗ No .env.local found. Copy .env.example and fill it in first.')
    process.exit(1)
  }
  const env = parseEnv(readFileSync(envPath, 'utf8'))
  const result = await checkDataset({
    projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: env.NEXT_PUBLIC_SANITY_DATASET || 'production',
    token: env.SANITY_API_READ_TOKEN,
  })
  if (result.ok) {
    console.log(`✓ ${result.message}`)
  } else {
    console.error(`✗ ${result.message}`)
    process.exit(1)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
