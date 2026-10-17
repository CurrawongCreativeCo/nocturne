/**
 * Deletes enquiries older than ENQUIRY_RETENTION_DAYS (default 365), so form submissions are not
 * kept for longer than the privacy policy says (README, "Enquiries"). Run weekly by
 * .github/workflows/enquiry-retention.yml; `--dry-run` only reports what would go. Dependency-free,
 * like check-dataset.mjs. It prints counts and dates, never what an enquiry says.
 *
 * Reads NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET (default "production"),
 * SANITY_WRITE_TOKEN (Editor role) and ENQUIRY_RETENTION_DAYS.
 */
import { fileURLToPath } from 'node:url'

const API_VERSION = 'v2026-10-01'
const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_DAYS = 365
/** A typo such as 1 or 0 must not wipe every enquiry. */
const MIN_DAYS = 30
const BATCH_SIZE = 200

/** The retention period in days: the default when unset, or an error message for a value that isn't safe. */
export function parseRetentionDays(value) {
  const text = (value ?? '').trim()
  if (text === '') return { ok: true, days: DEFAULT_DAYS }
  const days = Number(text)
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(days) || days < MIN_DAYS) {
    return {
      ok: false,
      message: `ENQUIRY_RETENTION_DAYS must be a whole number of at least ${MIN_DAYS} (got "${text}"). Leave it unset for ${DEFAULT_DAYS}.`,
    }
  }
  return { ok: true, days }
}

/** When an enquiry was received: its `createdAt`, else the document's own creation time. */
function receivedAt(doc) {
  for (const value of [doc.createdAt, doc._createdAt]) {
    const time = Date.parse(value ?? '')
    if (!Number.isNaN(time)) return time
  }
  return undefined
}

/**
 * The enquiries older than `days` days at `now`, oldest first. Pure. A document with no readable date
 * is kept: it is better to keep an enquiry than to delete one on a guess.
 */
export function selectExpired(docs, now, days) {
  const cutoff = now.getTime() - days * DAY_MS
  return docs
    .map((doc) => ({ doc, time: receivedAt(doc) }))
    .filter(({ time }) => time !== undefined && time < cutoff)
    .sort((a, b) => a.time - b.time)
    .map(({ doc }) => doc)
}

/** `ids` split into groups of at most `size`, so no request carries thousands of mutations. */
export function inBatches(ids, size = BATCH_SIZE) {
  const batches = []
  for (let i = 0; i < ids.length; i += size) batches.push(ids.slice(i, i + size))
  return batches
}

async function request(url, init, fetchImpl) {
  const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`Sanity answered HTTP ${response.status}`)
  return response.json()
}

/**
 * Finds and (unless `dryRun`) deletes the expired enquiries. `fetchImpl` is injectable for tests.
 * Returns `{ total, expired, deleted }`.
 */
export async function runRetention({
  projectId,
  dataset,
  token,
  days,
  dryRun,
  now = new Date(),
  fetchImpl = fetch,
}) {
  const base = `https://${projectId}.api.sanity.io/${API_VERSION}/data`
  const headers = { Authorization: `Bearer ${token}` }

  const query = encodeURIComponent('*[_type == "enquiry"]{ _id, createdAt, _createdAt }')
  const { result } = await request(
    `${base}/query/${dataset}?query=${query}&perspective=raw`,
    { headers },
    fetchImpl,
  )
  const expired = selectExpired(result ?? [], now, days)

  let deleted = 0
  if (!dryRun) {
    for (const batch of inBatches(expired.map((doc) => doc._id))) {
      await request(
        `${base}/mutate/${dataset}`,
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ mutations: batch.map((id) => ({ delete: { id } })) }),
        },
        fetchImpl,
      )
      deleted += batch.length
    }
  }
  return { total: (result ?? []).length, expired: expired.length, deleted }
}

async function main() {
  const { env } = process
  const retention = parseRetentionDays(env.ENQUIRY_RETENTION_DAYS)
  if (!retention.ok) {
    console.error(`::error title=Enquiry retention::${retention.message}`)
    process.exit(1)
  }
  const projectId = env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const token = env.SANITY_WRITE_TOKEN
  if (!projectId || !token) {
    console.error('✗ Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_WRITE_TOKEN.')
    process.exit(1)
  }
  const dryRun = process.argv.includes('--dry-run')
  const dataset = env.NEXT_PUBLIC_SANITY_DATASET || 'production'

  try {
    const { total, expired, deleted } = await runRetention({
      projectId,
      dataset,
      token,
      days: retention.days,
      dryRun,
    })
    const older = `older than ${retention.days} days`
    console.log(
      dryRun
        ? `Dry run: ${expired} of ${total} enquiries in "${dataset}" are ${older} and would be deleted.`
        : `Deleted ${deleted} of ${total} enquiries in "${dataset}" that were ${older}.`,
    )
  } catch (error) {
    // The message is ours ("Sanity answered HTTP 403"), or a network error: nothing from the data.
    console.error(`✗ ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
