/**
 * Turns the daily health run's output into the text of one GitHub issue (README, "Health checks").
 * .github/workflows/health.yml saves `launch:check --json` and `check:dataset` output to files, runs
 * this, and opens, updates or closes the issue from what it writes. Pure logic in `buildReport`
 * (unit-tested); `main` only reads files and the environment. Dependency-free. Always exits 0: whether
 * the run was healthy is the `failed` output, not the exit code.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const MAX_LINES = 40
const MAX_LINE_LENGTH = 600

const oneLine = (text) => String(text).replace(/\s+/g, ' ').trim()
const clip = (text) =>
  text.length > MAX_LINE_LENGTH ? `${text.slice(0, MAX_LINE_LENGTH - 1)}…` : text

/** The last few lines of a tool's output, for when it crashed instead of reporting. */
const tail = (text, count = 5) => oneLine(text.trim().split(/\r?\n/).slice(-count).join(' '))

/** Failing lines from `launch:check --json`. `launch` is the parsed JSON, or null when it didn't parse. */
export function launchFailures(launch, stderr = '') {
  if (!launch || !Array.isArray(launch.results)) {
    const why = tail(stderr)
    return [`launch:check printed no results${why ? `: ${why}` : '.'}`]
  }
  return launch.results
    .filter((result) => result.status === 'fail')
    .map((result) => {
      const parts = [`**${result.area}: ${result.title}.**`]
      if (result.detail) parts.push(oneLine(result.detail))
      if (result.fix) parts.push(`Fix: ${oneLine(result.fix)}`)
      return parts.join(' ')
    })
}

/**
 * Failing lines from `npm run check:dataset`. `exposed` is true when the dataset is public and
 * `enquiriesStore` is on: visitors' names and email addresses are then readable by anyone.
 */
export function datasetFailures({ exitCode, output, enquiriesStore }) {
  if (exitCode === 0) return { lines: [], exposed: false }
  const message =
    oneLine(output.replace(/^\s*✗\s*/gm, '')) || 'check:dataset failed with no output.'
  const exposed = enquiriesStore && /\bis PUBLIC\b/.test(message)
  const lines = [`**Sanity: dataset check.** ${message}`]
  if (exposed) {
    lines.unshift(
      '**Sanity: enquiries are exposed.** ENQUIRIES_STORE is 1 and the dataset is public, so stored enquiries (names and email addresses) can be read by anyone with the project ID. Make the dataset private now, then check the plan at sanity.io/manage → Billing: a lapsed or downgraded plan makes private datasets public.',
    )
  }
  return { lines, exposed }
}

/** `{ failed, lines, body }`; `body` is the issue text and is empty when nothing failed. */
export function buildReport({ launch, launchStderr, dataset, enquiriesStore, url, runUrl, date }) {
  const found = [
    ...datasetFailures({ ...dataset, enquiriesStore }).lines,
    ...launchFailures(launch, launchStderr),
  ]
  if (found.length === 0) return { failed: false, lines: [], body: '' }
  const shown = found.slice(0, MAX_LINES).map((line) => `- ${clip(line)}`)
  if (found.length > MAX_LINES) shown.push(`- …and ${found.length - MAX_LINES} more.`)
  const body = [
    `The daily health check of ${url || 'the production site'} failed on ${date}.`,
    '',
    ...shown,
    '',
    runUrl ? `Run: ${runUrl}` : '',
    'This issue is kept up to date by the Health workflow and closes itself on the next passing run.',
    '',
  ]
    .filter((line, index, all) => line !== '' || all[index - 1] !== '')
    .join('\n')
  return { failed: true, lines: found, body }
}

const readIfThere = (path) => (path && existsSync(path) ? readFileSync(path, 'utf8') : '')

function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, '').split('=')
      return [key, rest.join('=')]
    }),
  )
  const report = buildReport({
    launch: parseJson(readIfThere(args.launch)),
    launchStderr: readIfThere(args['launch-stderr']),
    dataset: {
      exitCode: Number(args['dataset-exit'] ?? 1),
      output: readIfThere(args.dataset),
    },
    enquiriesStore: process.env.ENQUIRIES_STORE === '1',
    url: process.env.PRODUCTION_URL,
    runUrl: process.env.RUN_URL,
    date: new Date().toISOString().slice(0, 10),
  })
  if (report.failed) writeFileSync(args.out, report.body)
  console.log(report.failed ? report.body : '✓ Healthy.')
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `failed=${report.failed}\n`)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
