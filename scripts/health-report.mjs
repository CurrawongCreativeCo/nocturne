/**
 * Turns the daily health run's output into `health-result.json` and the text of one GitHub issue
 * (README, "Health checks"; docs/nocturne/NOCTURNE_SETTINGS_CONFIGURATION.md §R.2).
 * .github/workflows/health.yml saves `launch:check --json` and `check:dataset --json` output to files,
 * runs `result` (and `mode` before the checks), and opens, updates or closes the issue from what it
 * writes. Pure logic in `buildHealthResult` and `buildReport` (unit-tested); `main` only reads files
 * and the environment. Dependency-free. Always exits 0: whether the run was healthy is the `failed`
 * output and the result file, not the exit code.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'

import { parseSiteInfoLaunch } from './launch-check/prelaunch.mjs'

export const RESULT_SCHEMA = 1

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
 * Failing lines from `npm run check:dataset`. `enquiries` is the anonymous probe's state: `exposed`
 * means visitors can count (so read) stored enquiries; `unverified` on a public dataset means the
 * probe couldn't say, and the deprecated `enquiriesStore` flag is then only mentioned, never assumed.
 */
export function datasetFailures({
  exitCode,
  output,
  enquiries = 'not-checked',
  enquiriesStore = false,
}) {
  if (exitCode === 0) return { lines: [], exposed: false }
  const message =
    oneLine(output.replace(/^\s*✗\s*/gm, '')) || 'check:dataset failed with no output.'
  const exposed = enquiries === 'exposed'
  const lines = [`**Sanity: dataset check.** ${message}`]
  if (exposed) {
    lines.unshift(
      '**Sanity: enquiries are exposed.** The dataset is public and an anonymous request can count stored enquiries (names and email addresses), so anyone with the project ID can read them. Make the dataset private now, then check the plan at sanity.io/manage → Billing: a lapsed or downgraded plan makes private datasets public.',
    )
  } else if (enquiriesUnanswered(enquiries) && /\bis PUBLIC\b/.test(message)) {
    lines.splice(
      1,
      0,
      `**Sanity: enquiry exposure could not be verified.** The anonymous count ${enquiries === 'refused' ? 'was refused' : 'failed'}.${enquiriesStore ? ' The deprecated ENQUIRIES_STORE variable says enquiries are stored, so treat them as exposed until the dataset is private.' : ''} Making the dataset private settles it.`,
    )
  }
  return { lines, exposed }
}

/** `{ failed, lines, body }`; `body` is the issue text and is empty when nothing failed. */
export function buildReport({
  launch,
  launchStderr,
  dataset,
  enquiries,
  enquiriesStore,
  skipLaunch = false,
  url,
  runUrl,
  date,
}) {
  const found = [
    ...datasetFailures({ ...dataset, enquiries, enquiriesStore }).lines,
    ...(skipLaunch ? [] : launchFailures(launch, launchStderr)),
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

const NO_RESULTS = 'launch:check printed no results'

/** Structured failures (`{ id, area, title, fix }`), exposed enquiries first. Mirrors the issue lines. */
export function collectFailures({
  launch,
  dataset,
  enquiries = 'not-checked',
  skipLaunch = false,
}) {
  const failures = []
  const datasetFailed = Boolean(dataset) && dataset.exitCode !== 0
  if (enquiries === 'exposed') {
    failures.push({
      id: 'dataset-enquiries-exposed',
      area: 'Sanity',
      title: 'Enquiries are exposed',
      fix: 'Make the dataset private now, then check the plan at sanity.io/manage → Billing: a lapsed or downgraded plan makes private datasets public.',
    })
  }
  if (datasetFailed) {
    failures.push({
      id: 'dataset-check',
      area: 'Sanity',
      title: 'Dataset check',
      fix:
        dataset.private === false
          ? 'Make the dataset private (README, "Dataset privacy").'
          : 'Check SANITY_API_READ_TOKEN and NEXT_PUBLIC_SANITY_PROJECT_ID (README, "Health checks").',
    })
    if (enquiriesUnanswered(enquiries) && dataset.private === false) {
      failures.push({
        id: 'dataset-enquiries-unverified',
        area: 'Sanity',
        title: 'Enquiry exposure could not be verified',
        fix: 'Make the dataset private; that settles it. Then run the check again.',
      })
    }
  }
  if (skipLaunch) return failures
  if (!launch || !Array.isArray(launch.results)) {
    failures.push({
      id: 'launch-no-results',
      area: 'Run',
      title: NO_RESULTS,
      fix: 'Open the run log, fix what stopped launch:check, and run the workflow again.',
    })
  } else {
    for (const result of launch.results) {
      if (result.status !== 'fail') continue
      failures.push({
        id: String(result.id ?? ''),
        area: String(result.area ?? ''),
        title: String(result.title ?? ''),
        fix: String(result.fix ?? ''),
      })
    }
  }
  return failures
}

/** The origin only: a result file must never carry credentials, paths or query strings from a variable. */
function originOf(url) {
  try {
    return new URL(url).origin
  } catch {
    return ''
  }
}

const ENQUIRY_STATES = ['exposed', 'none-found', 'refused', 'unverified']
/** The probe answered nothing usable: not "none found", and not a reason to assume exposure. */
const enquiriesUnanswered = (state) => state === 'unverified' || state === 'refused'
const UNKNOWN_MODE_REASON =
  'Could not tell whether the site is live or pre-launch: /api/site-info was unreadable and site.profile.ts has no explicit launch status. The launch checks were skipped rather than guess; only the dataset was checked.'

/**
 * `health-result.json`, schema 1. Pure. Precedence: disabled, then unconfigured, then skipped (setup
 * is present but no checks ran), then what the checks found. Only whitelisted fields are copied, so
 * no environment value can reach the file except the site's own origin.
 *
 * `mode` is `live`, `prelaunch` or `unknown` (the launch state couldn't be established, so the launch
 * checks didn't run and the result is at best a warning). `modeSource` says where it came from.
 * `enquiries` is `exposed`, `none-found` (a valid count of zero), `refused`, `unverified` or `not-checked`, from an anonymous count.
 */
export function buildHealthResult({
  disabled = false,
  disabledReason = '',
  missing = [],
  ranChecks = false,
  skipReason = '',
  mode = null,
  modeSource = null,
  synthetic = false,
  expectedOutcome = null,
  launch = null,
  dataset = null,
  url = '',
  checkedAt,
  repoTemplateVersion = null,
}) {
  const result = {
    schema: RESULT_SCHEMA,
    outcome: 'healthy',
    mode: null,
    modeSource: null,
    synthetic: Boolean(synthetic),
    checkedAt,
    url: originOf(url),
    repoTemplateVersion,
    setup: { missing: [] },
    summary: { pass: 0, warn: 0, fail: 0 },
    failures: [],
    dataset: { private: null },
    enquiries: 'not-checked',
    enquiriesExposed: false,
  }
  // A synthetic run states what it expects; `verify` fills in testStatus afterwards.
  if (synthetic) {
    result.test = { expectedOutcome, healthStatus: null, testStatus: null, problems: [] }
  }
  const finish = (fields) => {
    const done = { ...result, ...fields }
    if (done.test) done.test = { ...done.test, healthStatus: done.outcome }
    return done
  }
  if (disabled) {
    return finish({
      outcome: 'disabled',
      reason: oneLine(disabledReason) || 'HEALTH_CHECKS is off.',
    })
  }
  if (missing.length > 0) {
    return finish({
      outcome: 'unconfigured',
      reason: `Setup is missing: ${missing.join(', ')}.`,
      setup: { missing: [...missing] },
    })
  }
  if (!ranChecks) {
    const why = oneLine(skipReason) || 'The checks did not run.'
    return finish({ outcome: 'skipped', reason: why, skipReason: why })
  }

  const unknownMode = mode === 'unknown'
  const results = Array.isArray(launch?.results) ? launch.results : []
  const count = (status) => results.filter((item) => item.status === status).length
  const datasetPrivate =
    dataset?.private === true || dataset?.private === false ? dataset.private : null
  const enquiries = ENQUIRY_STATES.includes(dataset?.enquiries) ? dataset.enquiries : 'not-checked'
  const failures = collectFailures({ launch, dataset, enquiries, skipLaunch: unknownMode })
  const summary = {
    pass: count('pass') + (dataset && dataset.exitCode === 0 ? 1 : 0),
    warn: count('warn') + (unknownMode ? 1 : 0),
    fail: failures.length,
  }
  const outcome = failures.length > 0 ? 'failed' : summary.warn > 0 ? 'warning' : 'healthy'
  const out = {
    outcome,
    mode: unknownMode ? 'unknown' : mode === 'prelaunch' ? 'prelaunch' : 'live',
    modeSource: ['site-info', 'profile'].includes(modeSource) ? modeSource : null,
    summary,
    failures,
    dataset: { private: datasetPrivate },
    enquiries,
    enquiriesExposed: enquiries === 'exposed',
  }
  if (unknownMode) out.reason = UNKNOWN_MODE_REASON
  else if (!Array.isArray(launch?.results)) out.reason = NO_RESULTS
  return finish(out)
}

/**
 * The launch state from /api/site-info: `{ state, source }`. Authority, in order:
 * 1. A readable answer. A launch block names the state; an answer with no launch block comes from a
 *    template older than the launch state, which is live by definition.
 * 2. An unreadable answer (down, error, not JSON): the state `site.profile.ts` names explicitly, since
 *    that is the reviewed record of what was deployed. A profile with no launch block says nothing.
 * 3. Otherwise `unknown`. An unreadable endpoint is not proof that the site has launched.
 */
export function resolveLaunchState({ siteInfo, declared }) {
  if (siteInfo?.ok) {
    let body = null
    try {
      body = JSON.parse(siteInfo.text)
    } catch {
      // Unreadable: falls through to the profile.
    }
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      if (body.launch === undefined) return { state: 'live', source: 'site-info' }
      const launch = parseSiteInfoLaunch(siteInfo.text)
      if (launch) return { state: launch.status, source: 'site-info' }
    }
  }
  if (declared === 'live' || declared === 'prelaunch') return { state: declared, source: 'profile' }
  return { state: 'unknown', source: null }
}

/**
 * The launch status `site.profile.ts` declares in an uncommented `launch: { status: ... }`, or null
 * when it declares none (the default, which the template treats as live but which is no evidence a
 * deployment exists) or the file is missing or too dynamic to read.
 */
export function declaredLaunchStatus(source) {
  if (typeof source !== 'string') return null
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const match = /\blaunch\s*:\s*\{[^}]*?\bstatus\s*:\s*['"](prelaunch|live)['"]/.exec(code)
  return match ? match[1] : null
}

/** Reads /api/site-info and the profile, and decides. A failed request is "unreadable", not "live". */
export async function detectMode(url, { fetchImpl = fetch, profileSource = null } = {}) {
  let siteInfo = null
  try {
    const origin = new URL(url).origin
    const response = await fetchImpl(`${origin}/api/site-info`, {
      signal: AbortSignal.timeout(10_000),
    })
    siteInfo = { ok: response.ok, text: response.ok ? await response.text() : '' }
  } catch {
    // Unreadable.
  }
  return resolveLaunchState({ siteInfo, declared: declaredLaunchStatus(profileSource) })
}

/** What the observed run was supposed to be, for a synthetic test. Pure. */
export function evaluateSyntheticTest({ result, expectedOutcome, issuesBefore, issuesAfter }) {
  const problems = []
  if (
    !result ||
    typeof result !== 'object' ||
    result.schema !== RESULT_SCHEMA ||
    typeof result.outcome !== 'string'
  ) {
    problems.push('health-result.json is missing or invalid.')
  } else {
    if (result.synthetic !== true) problems.push('The result is not marked synthetic.')
    if (expectedOutcome && result.outcome !== expectedOutcome) {
      problems.push(`Expected the outcome "${expectedOutcome}" but observed "${result.outcome}".`)
    }
  }
  if (!Array.isArray(issuesBefore) || !Array.isArray(issuesAfter)) {
    problems.push('The issue snapshots are missing, so "no issue was touched" is unproven.')
  } else if (JSON.stringify(issuesBefore) !== JSON.stringify(issuesAfter)) {
    problems.push('An issue was created, edited or closed during a synthetic run.')
  }
  return { testStatus: problems.length === 0 ? 'passed' : 'failed', problems }
}

/** The job summary (Markdown). Says plainly when nothing was checked and when a run is only a test. */
export function buildSummary(result, { issueBody = '', deprecated = [] } = {}) {
  const checked = ['healthy', 'warning', 'failed'].includes(result.outcome)
  const lines = []
  if (result.synthetic) {
    lines.push(
      '# SYNTHETIC TEST: not a real health result',
      '',
      'No issue is opened, edited or closed, and readers ignore this result.',
      '',
    )
  }
  lines.push(`## Health check: ${result.outcome}`, '')
  if (!checked) {
    lines.push(`**Nothing was checked.** ${result.reason ?? ''}`.trim(), '')
  } else {
    const { pass, warn, fail } = result.summary
    lines.push(
      `Mode: ${result.mode}${result.modeSource ? ` (from ${result.modeSource})` : ''}. ${pass} passed, ${warn} warning${warn === 1 ? '' : 's'}, ${fail} failed.`,
      '',
    )
    if (result.reason) lines.push(result.reason, '')
    for (const failure of result.failures)
      lines.push(`- **${failure.area}: ${failure.title}.** ${failure.fix}`)
    if (result.failures.length > 0) lines.push('')
  }
  if (result.synthetic) {
    const test = result.test ?? {}
    lines.push(
      `Simulated health outcome (healthStatus): **${result.outcome}**. Expected: ${test.expectedOutcome ?? 'not stated'}. Test status (testStatus): **${test.testStatus ?? 'not yet verified'}**.`,
      '',
    )
    for (const problem of test.problems ?? []) lines.push(`- ${problem}`)
    if ((test.problems ?? []).length > 0) lines.push('')
    if (issueBody)
      lines.push(
        'The issue it would have written:',
        '',
        '```markdown',
        issueBody.trimEnd(),
        '```',
        '',
      )
  }
  for (const line of deprecated) lines.push(`> **Deprecated:** ${line}`, '')
  return lines.join('\n')
}

const readIfThere = (path) => (path && existsSync(path) ? readFileSync(path, 'utf8') : '')

function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const flag = (value) => value === 'true' || value === '1'

function parseArgs(argv) {
  return Object.fromEntries(
    argv
      .filter((arg) => arg.startsWith('--'))
      .map((arg) => {
        const [key, ...rest] = arg.replace(/^--/, '').split('=')
        return [key, rest.join('=')]
      }),
  )
}

function readTemplateVersion() {
  try {
    const { version } = JSON.parse(readFileSync('template-version.json', 'utf8'))
    return typeof version === 'string' ? version : null
  } catch {
    return null
  }
}

const output = (name, value) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`)
}

function readProfile() {
  try {
    return readFileSync('site.profile.ts', 'utf8')
  } catch {
    return null
  }
}

/** A multi-line step output. The delimiter is random, so the text can't end the value early. */
const outputBlock = (name, text) => {
  if (!process.env.GITHUB_OUTPUT) return
  const delimiter = `EOF_${randomBytes(12).toString('hex')}`
  appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<${delimiter}\n${text}\n${delimiter}\n`)
}

async function main() {
  const command = ['mode', 'verify'].includes(process.argv[2]) ? process.argv[2] : 'result'
  const args = parseArgs(process.argv.slice(3))
  const env = process.env

  if (command === 'mode') {
    const { state, source } = await detectMode(env.PRODUCTION_URL ?? '', {
      profileSource: readProfile(),
    })
    const how = source === 'profile' ? ' (site-info unreadable; from site.profile.ts)' : ''
    console.log(`Launch state: ${state}${how}.`)
    if (state === 'unknown') {
      console.log(
        '::warning title=Launch state unknown::/api/site-info was unreadable and site.profile.ts declares no launch status, so only the dataset will be checked.',
      )
    }
    output('mode', state)
    output('source', source ?? '')
    return
  }

  if (command === 'verify') {
    const file = args.result || 'health-result.json'
    const result = parseJson(readIfThere(file))
    const verdict = evaluateSyntheticTest({
      result,
      expectedOutcome: args.expect || null,
      issuesBefore: parseJson(readIfThere(args['issues-before'])),
      issuesAfter: parseJson(readIfThere(args['issues-after'])),
    })
    if (result && typeof result === 'object') {
      result.test = {
        ...result.test,
        expectedOutcome: args.expect || null,
        healthStatus: result.outcome,
        testStatus: verdict.testStatus,
        problems: verdict.problems,
      }
      writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`)
    }
    const text = [
      '# SYNTHETIC TEST: not a real health result',
      '',
      `Simulated health outcome (healthStatus): **${result?.outcome ?? 'unknown'}**. Expected: ${args.expect || 'not stated'}. Test status (testStatus): **${verdict.testStatus}**.`,
      '',
      ...verdict.problems.map((problem) => `- ${problem}`),
      '',
    ].join('\n')
    console.log(text)
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${text}\n`)
    if (verdict.testStatus === 'failed') {
      console.log(`::error title=Synthetic test failed::${verdict.problems.join(' ')}`)
      process.exitCode = 1
    }
    return
  }

  const dataset = parseJson(readIfThere(args.dataset))
  const ranChecks = flag(args['checks-ran'])
  const launch = parseJson(readIfThere(args.launch))
  const result = buildHealthResult({
    disabled: args.state === 'disabled',
    disabledReason: env.HEALTH_CHECKS_REASON,
    missing: (args.missing ?? '').split(',').filter(Boolean),
    ranChecks,
    skipReason: args['skip-reason'],
    mode: args.mode,
    modeSource: args['mode-source'],
    synthetic: flag(args.synthetic),
    expectedOutcome: args.expect || null,
    launch,
    dataset: dataset
      ? { ...dataset, exitCode: dataset.ok ? 0 : 1 }
      : { exitCode: 1, private: null, enquiries: null },
    enquiriesStore: env.ENQUIRIES_STORE === '1',
    url: env.PRODUCTION_URL,
    checkedAt: new Date().toISOString(),
    repoTemplateVersion: readTemplateVersion(),
  })
  const report =
    result.outcome === 'failed'
      ? buildReport({
          launch,
          launchStderr: readIfThere(args['launch-stderr']),
          dataset: {
            exitCode: dataset?.ok ? 0 : 1,
            output: dataset?.message ?? 'check:dataset printed no result.',
          },
          enquiries: result.enquiries,
          enquiriesStore: env.ENQUIRIES_STORE === '1',
          skipLaunch: result.mode === 'unknown',
          url: env.PRODUCTION_URL,
          runUrl: env.RUN_URL,
          date: result.checkedAt.slice(0, 10),
        })
      : { failed: false, body: '' }
  const deprecated =
    env.ENQUIRIES_STORE === undefined || env.ENQUIRIES_STORE === ''
      ? []
      : [
          'The ENQUIRIES_STORE repository variable is deprecated. The check now asks Sanity anonymously whether visitors can count stored enquiries; delete the variable.',
        ]
  const summary = buildSummary(result, { issueBody: report.body, deprecated })

  writeFileSync(args.out || 'health-result.json', `${JSON.stringify(result, null, 2)}\n`)
  if (report.failed && args.issue) writeFileSync(args.issue, report.body)
  console.log(summary)
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${summary}\n`)
  if (['disabled', 'unconfigured', 'skipped'].includes(result.outcome)) {
    console.log(
      `::warning title=Health check: nothing was checked::Nothing was checked. ${result.reason}`,
    )
  }
  if (result.synthetic) {
    console.log('::notice title=Synthetic test::This is a synthetic run, not a real health result.')
  }
  const checked = ['healthy', 'warning', 'failed'].includes(result.outcome)
  output('outcome', result.outcome)
  output('checked', String(checked))
  output('failed', String(result.outcome === 'failed'))
  if (report.failed && !result.synthetic) outputBlock('issue_body', report.body.trimEnd())
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
