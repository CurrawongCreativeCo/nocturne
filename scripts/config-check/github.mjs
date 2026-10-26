/**
 * The GitHub side of `config:check --github` (task 231; docs/nocturne/NOCTURNE_SETTINGS_CONFIGURATION.md
 * §R.2, §B.5, §B.7, §C.4). Read-only, dependency-free (Node built-ins only).
 *
 * Two layers. The pure one turns GitHub API JSON into statuses: no network, no `process.exit`, no
 * `console`, so Foundation (tasks 201 and 209) can import it unchanged. The thin one at the bottom
 * (`createGithubClient`, `collectGithubReport`) does the fetches. Neither prints or stores the token,
 * and no variable value or secret value reaches a report: names, states and dates only (a repository
 * variable is read only to compare it, and the comparison is reported as matches / differs).
 */
import { inflateRawSync } from 'node:zlib'

import { request } from '../launch-check/net.mjs'

export const API = 'https://api.github.com'
/** A real result older than this is Stale (§R.2). */
export const STALE_HOURS = 36
/** Newest runs inspected for a real result before giving up (synthetic dispatches are skipped). */
export const MAX_RUNS_INSPECTED = 8

const HOUR = 3_600_000
const OUTCOMES = ['disabled', 'unconfigured', 'skipped', 'healthy', 'warning', 'failed']
const RESULT_ARTIFACT = 'health-result'
/** Which workflow backs which feature. Add a line when a feature gains a GitHub setting. */
export const WORKFLOWS = {
  'health-monitoring': 'health.yml',
  backups: 'backup.yml',
  enquiries: 'enquiry-retention.yml',
  'sanity-workflow': 'sanity.yml',
}
/** Features whose workflow writes a health-result artifact. The others show their last run only. */
const RESULT_FEATURES = ['health-monitoring']

/** The monitoring states (§R.2), their wording and how serious each is. */
export const MONITORING = {
  disabled: { label: 'Intentionally disabled', tone: 'neutral' },
  unconfigured: { label: 'Expected but unconfigured', tone: 'problem' },
  skipped: { label: 'Configured but skipped', tone: 'problem' },
  healthy: { label: 'Healthy', tone: 'good' },
  warning: { label: 'Warning', tone: 'attention' },
  failed: { label: 'Failed', tone: 'problem' },
  stale: { label: 'Stale', tone: 'problem' },
  unknown: { label: 'Unknown', tone: 'neutral' },
}

/* ---------------------------------------------------------------- repository and token */

/** "owner/name" from `--repo`, or from an origin URL (https or ssh). Null when it isn't one. */
export function parseRepo(text) {
  const value = String(text ?? '').trim()
  const match =
    /^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(value) ??
    /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(value)
  return match ? { owner: match[1], name: match[2] } : null
}

/** What to say when `GITHUB_TOKEN` isn't set. Plain words; nothing is written anywhere. */
export function tokenHelp(repo) {
  const where = repo ? `${repo.owner}/${repo.name}` : 'this repository'
  return [
    'config:check --github needs a GitHub token, and GITHUB_TOKEN is not set.',
    '',
    'Create a fine-grained token that can only read, and only this repository:',
    '  1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.',
    `  2. Repository access: Only select repositories → ${where}.`,
    '  3. Repository permissions, all set to Read-only: Actions, Variables, Secrets, Issues, Metadata.',
    '  4. Give it a short expiry (7 days is plenty).',
    '',
    'Then run it with the token for this one command, so it never goes in a file:',
    '  GITHUB_TOKEN=<your token> npm run config:check -- --github',
    '',
    'The command only reads, and it never saves or prints the token. Secrets are listed by name and',
    'last-updated date; their values are not readable through the API.',
  ].join('\n')
}

/* ---------------------------------------------------------------- HTTP answers */

const PERMISSION = {
  repository: 'Metadata (read)',
  workflow: 'Actions (read)',
  runs: 'Actions (read)',
  artifacts: 'Actions (read)',
  variables: 'Variables (read)',
  secrets: 'Secrets (read)',
  issues: 'Issues (read)',
}

/** When a rate limit lifts, as a Date, from GitHub's headers. Null when they don't say. */
export function retryAfter(headers, now = new Date()) {
  const seconds = Number(headers['retry-after'])
  if (Number.isFinite(seconds) && seconds > 0) return new Date(now.getTime() + seconds * 1000)
  const reset = Number(headers['x-ratelimit-reset'])
  return Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000) : null
}

/**
 * What an API answer means. `kind` is one of ok, unauthorised (401), forbidden (403 for a missing
 * permission), rate-limited, not-found (404) or error. `fatal` answers stop the whole run: a bad
 * token, a rate limit, or a repository the token can't see.
 */
export function classifyResponse({ status, headers = {}, error }, what, now = new Date()) {
  const permission = PERMISSION[what] ?? 'the permission this needs'
  if (error || status === 0) {
    return {
      kind: 'error',
      fatal: false,
      message: `GitHub could not be reached (${error || 'no answer'}).`,
    }
  }
  if (status >= 200 && status < 300) return { kind: 'ok', fatal: false }
  const limited =
    status === 429 ||
    (status === 403 &&
      (headers['x-ratelimit-remaining'] === '0' || headers['retry-after'] !== undefined))
  if (limited) {
    const when = retryAfter(headers, now)
    return {
      kind: 'rate-limited',
      fatal: true,
      retryAt: when ? when.toISOString() : null,
      message: when
        ? `GitHub's rate limit has been reached. Stopping here; try again after ${formatTime(when)}.`
        : "GitHub's rate limit has been reached. Stopping here; try again in about an hour.",
    }
  }
  if (status === 401) {
    return {
      kind: 'unauthorised',
      fatal: true,
      message:
        'GitHub did not accept the token (401). It may be mistyped, expired or revoked. Create a new one and run the command again.',
    }
  }
  if (status === 403) {
    return {
      kind: 'forbidden',
      fatal: what === 'repository',
      permission,
      message: `The token is missing a permission (403): add ${permission} to the token, limited to this repository.`,
    }
  }
  if (status === 404) {
    return what === 'repository'
      ? {
          kind: 'not-found',
          fatal: true,
          message:
            "GitHub says this repository doesn't exist, or the token can't see it (404). Check the name, and that the token's repository access includes it.",
        }
      : { kind: 'not-found', fatal: false, message: 'Not found (404).' }
  }
  return { kind: 'error', fatal: false, message: `GitHub answered ${status}.` }
}

/* ---------------------------------------------------------------- the result artifact */

/** One file from a zip held in memory, via its central directory. Null when absent or unreadable. */
export function readZipEntry(buffer, wanted, { maxBytes = 1_000_000 } = {}) {
  try {
    let end = -1
    for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65_557); i -= 1) {
      if (buffer.readUInt32LE(i) === 0x06054b50) {
        end = i
        break
      }
    }
    if (end < 0) return null
    const count = buffer.readUInt16LE(end + 10)
    let at = buffer.readUInt32LE(end + 16)
    for (let n = 0; n < count; n += 1) {
      if (buffer.readUInt32LE(at) !== 0x02014b50) return null
      const method = buffer.readUInt16LE(at + 10)
      const size = buffer.readUInt32LE(at + 20)
      const nameLength = buffer.readUInt16LE(at + 28)
      const extraLength = buffer.readUInt16LE(at + 30)
      const commentLength = buffer.readUInt16LE(at + 32)
      const local = buffer.readUInt32LE(at + 42)
      const name = buffer.toString('utf8', at + 46, at + 46 + nameLength)
      if (name === wanted) {
        const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28)
        const data = buffer.subarray(start, start + size)
        if (method === 0) return data.subarray(0, maxBytes).toString('utf8')
        if (method === 8)
          return inflateRawSync(data, { maxOutputLength: maxBytes }).toString('utf8')
        return null
      }
      at += 46 + nameLength + extraLength + commentLength
    }
  } catch {
    return null
  }
  return null
}

/** A `health-result.json` (schema 1) as a small object, or null when it isn't one. */
export function parseHealthResult(text) {
  try {
    const result = JSON.parse(text)
    if (!result || result.schema !== 1 || !OUTCOMES.includes(result.outcome)) return null
    return {
      outcome: result.outcome,
      mode: typeof result.mode === 'string' ? result.mode : null,
      synthetic: result.synthetic === true,
      checkedAt: typeof result.checkedAt === 'string' ? result.checkedAt : null,
      reason: typeof result.reason === 'string' ? result.reason.slice(0, 300) : null,
      failures: Array.isArray(result.failures) ? result.failures.length : 0,
      missing: Array.isArray(result.setup?.missing) ? result.setup.missing.map(String) : [],
    }
  } catch {
    return null
  }
}

/* ---------------------------------------------------------------- setup status */

const isOn = (vars, name) => vars.has(name) && vars.get(name) !== ''

function sameOrigin(a, b) {
  try {
    return new URL(a).origin.toLowerCase() === new URL(b).origin.toLowerCase()
  } catch {
    return false
  }
}

/** Whether a repository variable agrees with `.env.local`. Never returns either value. */
export function compareWithLocal(name, remote, env) {
  const local =
    name === 'PRODUCTION_URL'
      ? env.NEXT_PUBLIC_SITE_URL
      : name === 'NEXT_PUBLIC_SANITY_PROJECT_ID'
        ? env.NEXT_PUBLIC_SANITY_PROJECT_ID
        : undefined
  if (!['PRODUCTION_URL', 'NEXT_PUBLIC_SANITY_PROJECT_ID'].includes(name)) return undefined
  if (!local) return 'not-compared'
  const same = name === 'PRODUCTION_URL' ? sameOrigin(remote, local) : remote === local
  return same ? 'matches' : 'differs'
}

/**
 * The setup of one feature.
 * `workflow`: `{ file, state }` or null when GitHub has no such workflow file.
 * `variables`: Map name → value, or null when unreadable. `secrets`: Map name → updated_at, or null.
 * `settings`: the registry's settings (only github-var and github-secret ones are used).
 */
export function setupStatus({ feature, workflow, variables, secrets, env = {}, file }) {
  const settings = feature.settings.filter(
    (s) => (s.kind === 'github-var' || s.kind === 'github-secret') && !s.planned,
  )
  const offSwitch = settings.find((s) => s.format === 'off-switch')
  const items = []
  const unreadable = []

  for (const setting of settings) {
    const isVar = setting.kind === 'github-var'
    const source = isVar ? variables : secrets
    const required = setting.deprecated
      ? false
      : typeof setting.required === 'object'
        ? Boolean(variables && isOn(variables, setting.required.when))
        : setting.required
    const item = { name: setting.name, kind: isVar ? 'variable' : 'secret', required }
    if (!source) {
      item.status = 'unreadable'
      unreadable.push(setting.name)
    } else if (isVar ? isOn(source, setting.name) : source.has(setting.name)) {
      item.status = setting.deprecated ? 'deprecated' : 'present'
      if (isVar) {
        const match = compareWithLocal(setting.name, source.get(setting.name), env)
        if (match) item.match = match
      } else {
        item.updatedAt = source.get(setting.name) || null
      }
    } else {
      item.status = 'missing'
    }
    items.push(item)
  }

  const base = { file, workflowState: workflow?.state ?? null, items }
  if (!workflow) {
    return {
      ...base,
      status: 'not-set-up',
      reason: `${file} is not on GitHub (no workflow with that file name).`,
    }
  }
  if (offSwitch && variables && variables.get(offSwitch.name) === 'off') {
    const why = variables.get(`${offSwitch.name}_REASON`)
    return {
      ...base,
      status: 'disabled',
      disabled: true,
      reason: `Intentionally disabled (${offSwitch.name}=off)${why ? `: ${why.slice(0, 200)}` : ''}`,
    }
  }
  const missing = items.filter((i) => i.required && i.status === 'missing').map((i) => i.name)
  const differs = items.filter((i) => i.match === 'differs').map((i) => i.name)
  if (missing.length > 0 || differs.length > 0) {
    const parts = []
    if (missing.length > 0) parts.push(`${missing.join(', ')} not set`)
    if (differs.length > 0) parts.push(`${differs.join(', ')} differs from .env.local`)
    return { ...base, status: 'not-set-up', reason: `Not set up: ${parts.join('; ')}` }
  }
  if (workflow.state !== 'active') {
    return {
      ...base,
      status: 'not-set-up',
      reason: `The workflow's state is ${workflow.state}. Enable it under Actions.`,
    }
  }
  if (unreadable.length > 0) {
    return {
      ...base,
      status: 'cant-check',
      reason: `Can't check ${unreadable.join(', ')}: the token can't read them.`,
    }
  }
  return { ...base, status: 'ready', reason: 'Ready' }
}

/* ---------------------------------------------------------------- monitoring status */

const hoursBetween = (later, earlier) => (later.getTime() - earlier.getTime()) / HOUR

/**
 * Walks the newest completed runs and returns the first piece of real evidence:
 * `{ kind: 'result', result, run }`, `{ kind: 'run-without-result', run }` (a cancelled, skipped or
 * crashed scheduled run, which §R.2 counts as skipped), or `{ kind: 'none' }`.
 * `load(run)` returns the parsed result for that run, or null (no artifact, expired, unreadable).
 * A synthetic result is ignored. A manual run with no result might have been synthetic, so it is
 * ignored too; only a scheduled run can prove a skip.
 */
export async function findLatestEvidence({ runs, load, max = MAX_RUNS_INSPECTED }) {
  const completed = runs.filter((run) => run.status === 'completed').slice(0, max)
  for (const run of completed) {
    const result = await load(run)
    if (result) {
      if (result.synthetic) continue
      return { kind: 'result', result, run }
    }
    const noResult = [
      'cancelled',
      'skipped',
      'timed_out',
      'startup_failure',
      'failure',
      'action_required',
    ]
    if (run.event === 'schedule' && noResult.includes(run.conclusion)) {
      return { kind: 'run-without-result', run }
    }
  }
  return { kind: 'none' }
}

function monitoring(status, reason, extra = {}) {
  return { status, ...MONITORING[status], reason, ...extra }
}

/**
 * The monitoring state of the health feature (§R.2). `evidence` comes from `findLatestEvidence`;
 * null when the runs couldn't be read. `setup` is the feature's `setupStatus` result.
 */
export function healthMonitoring({
  setup,
  workflow,
  evidence,
  running = false,
  issues = [],
  now = new Date(),
}) {
  const extra = { running, issues }
  if (setup.disabled) return monitoring('disabled', setup.reason, extra)
  if (!workflow)
    return monitoring('unknown', 'The workflow is not on GitHub, so nothing can have run.', extra)
  const missing = setup.items.filter((i) => i.required && i.status === 'missing').map((i) => i.name)
  if (missing.length > 0) {
    return monitoring('unconfigured', `Setup is missing: ${missing.join(', ')}.`, extra)
  }
  if (workflow.state !== 'active') {
    return monitoring(
      'stale',
      `GitHub has the workflow as ${workflow.state}, so it is not running.`,
      extra,
    )
  }
  if (!evidence)
    return monitoring('unknown', "Can't read the workflow's runs with this token.", extra)
  if (evidence.kind === 'none') {
    return monitoring(
      'unknown',
      'No run has produced a result yet. Run the Health workflow once from the Actions tab.',
      extra,
    )
  }
  const runUrl = evidence.run?.html_url ?? null
  if (evidence.kind === 'run-without-result') {
    const how =
      evidence.run.conclusion === 'cancelled'
        ? 'was cancelled'
        : `ended as ${evidence.run.conclusion}`
    return monitoring(
      'skipped',
      `The latest scheduled run ${how} and left no result, so nothing was checked.`,
      {
        ...extra,
        lastRun: { at: evidence.run.created_at ?? null, url: runUrl },
      },
    )
  }
  const { result } = evidence
  const checkedAt = new Date(result.checkedAt ?? evidence.run.created_at ?? NaN)
  const last = {
    outcome: result.outcome,
    mode: result.mode,
    at: Number.isNaN(checkedAt.getTime()) ? null : checkedAt.toISOString(),
    url: runUrl,
  }
  if (Number.isNaN(checkedAt.getTime())) {
    return monitoring('unknown', "The newest result doesn't say when it ran.", {
      ...extra,
      lastResult: last,
    })
  }
  if (hoursBetween(now, checkedAt) > STALE_HOURS) {
    return monitoring(
      'stale',
      `The newest real result (${result.outcome}) is from ${ago(checkedAt, now)}; it should be under ${STALE_HOURS} hours old.`,
      { ...extra, lastResult: last },
    )
  }
  const detail = {
    disabled: result.reason || 'The last run recorded monitoring as off.',
    unconfigured:
      result.reason ||
      `Setup was missing on the last run${result.missing.length ? `: ${result.missing.join(', ')}` : ''}.`,
    skipped: result.reason || 'The last run did not check anything.',
    healthy: `Checked ${ago(checkedAt, now)}${result.mode ? ` (${result.mode})` : ''}.`,
    warning: `Checked ${ago(checkedAt, now)}${result.mode ? ` (${result.mode})` : ''}, with warnings.`,
    failed: `Checked ${ago(checkedAt, now)}: ${result.failures} failure${result.failures === 1 ? '' : 's'}.`,
  }[result.outcome]
  return monitoring(result.outcome, detail, { ...extra, lastResult: last })
}

/** Features without a result file: just the newest completed run, as a fact. */
export function lastRunMonitoring({ workflow, runs, now = new Date() }) {
  if (!workflow)
    return {
      status: 'unknown',
      label: 'Unknown',
      tone: 'neutral',
      reason: 'The workflow is not on GitHub.',
    }
  if (!runs)
    return {
      status: 'unknown',
      label: 'Unknown',
      tone: 'neutral',
      reason: "Can't read the workflow's runs with this token.",
    }
  const run = runs.find((r) => r.status === 'completed')
  if (!run)
    return {
      status: 'unknown',
      label: 'Unknown',
      tone: 'neutral',
      reason: 'No run has happened yet.',
    }
  const at = new Date(run.created_at)
  const problem = ['failure', 'timed_out', 'startup_failure'].includes(run.conclusion)
  return {
    status: 'last-run',
    label: `Last run: ${run.conclusion ?? 'unfinished'}`,
    tone: problem ? 'problem' : 'neutral',
    reason: `The newest run (${run.event}) ended as ${run.conclusion} ${ago(at, now)}.`,
    lastRun: { at: at.toISOString(), url: run.html_url ?? null },
  }
}

/* ---------------------------------------------------------------- wording */

/** "3 hours ago", "2 days ago". */
export function ago(then, now = new Date()) {
  const hours = Math.max(0, hoursBetween(now, then))
  if (hours < 1) return 'less than an hour ago'
  if (hours < 48) return `${Math.floor(hours)} hour${Math.floor(hours) === 1 ? '' : 's'} ago`
  return `${Math.floor(hours / 24)} days ago`
}

function formatTime(date) {
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

const ICON = { good: '✓', attention: '!', problem: '✗', neutral: '–' }
const SETUP_ICON = { ready: '✓', disabled: '–', 'not-set-up': '✗', 'cant-check': '?' }

/** The plain-English table: setup and monitoring as separate columns, then the detail lines. */
export function formatGithubTable(report) {
  const lines = [`GitHub (${report.repo}, repository-level variables and secrets only)`, '']
  const width = Math.max(10, ...report.features.map((f) => f.title.length)) + 2
  const setupLabels = report.features.map(
    (f) => `${SETUP_ICON[f.setup.status]} ${setupWord(f.setup.status)}`,
  )
  const setupWidth = Math.max(...setupLabels.map((l) => l.length)) + 2
  lines.push(`  ${'Feature'.padEnd(width)}${'Setup'.padEnd(setupWidth)}Monitoring`)
  report.features.forEach((feature, i) => {
    const m = feature.monitoring
    lines.push(
      `  ${feature.title.padEnd(width)}${setupLabels[i].padEnd(setupWidth)}${ICON[m.tone]} ${m.label}${m.running ? ' (a run is in progress)' : ''}`,
    )
  })
  for (const feature of report.features) {
    lines.push('', feature.title)
    lines.push(`  Setup: ${feature.setup.reason}`)
    if (feature.setup.workflowState)
      lines.push(`  Workflow ${feature.setup.file}: ${feature.setup.workflowState}`)
    for (const item of feature.setup.items) {
      const bits = [item.status]
      if (item.match)
        bits.push(
          item.match === 'matches'
            ? 'matches .env.local'
            : item.match === 'differs'
              ? 'differs from .env.local'
              : 'not compared',
        )
      if (item.updatedAt) bits.push(`updated ${item.updatedAt.slice(0, 10)}`)
      lines.push(
        `    ${item.kind === 'secret' ? 'Secret  ' : 'Variable'} ${item.name}: ${bits.join(', ')}${item.required ? '' : ' (optional)'}`,
      )
    }
    lines.push(`  Monitoring: ${feature.monitoring.reason}`)
    if (feature.monitoring.lastResult?.url)
      lines.push(`    Run: ${feature.monitoring.lastResult.url}`)
    for (const issue of feature.monitoring.issues ?? [])
      lines.push(`    Open issue #${issue.number}: ${issue.title} ${issue.url}`)
  }
  for (const note of report.notes) lines.push('', note)
  return lines.join('\n')
}

function setupWord(status) {
  return {
    ready: 'Ready',
    disabled: 'Disabled',
    'not-set-up': 'Not set up',
    'cant-check': "Can't check",
  }[status]
}

/** True when `--strict` should fail: a setup gap or a problem state. */
export function hasGithubProblem(report) {
  return report.features.some(
    (f) => f.setup.status === 'not-set-up' || f.monitoring.tone === 'problem',
  )
}

/* ---------------------------------------------------------------- the thin layer (fetches) */

/** A read-only client. `fetchImpl` and `now` are injectable for tests. The token is only ever sent to GitHub. */
export function createGithubClient({ token, repo, fetchImpl = fetch, now = () => new Date() }) {
  const base = `${API}/repos/${repo.owner}/${repo.name}`
  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
  }
  return {
    base,
    /** `{ problem, json }`; `problem.kind === 'ok'` on success. */
    async get(path, what) {
      const response = await request(`${base}${path}`, { headers, follow: true, fetchImpl })
      const problem = classifyResponse(response, what, now())
      let json = null
      if (problem.kind === 'ok') {
        try {
          json = JSON.parse(response.text)
        } catch {
          json = null
        }
      }
      return { problem, json }
    },
    /** The artifact zip. GitHub redirects to a signed address, which must not receive the token. */
    async artifact(id) {
      const first = await request(`${base}/actions/artifacts/${id}/zip`, { headers, fetchImpl })
      const location = first.headers.location
      if (first.status < 300 || first.status >= 400 || !location) return null
      const second = await request(location, { bytes: true, follow: true, fetchImpl })
      return second.status === 200 ? second.bytes : null
    },
  }
}

/** Pages of a `{ <key>: [...] }` listing, up to five. Returns null when the first page can't be read. */
async function listAll(client, path, key, what) {
  const all = []
  for (let page = 1; page <= 5; page += 1) {
    const { problem, json } = await client.get(
      `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`,
      what,
    )
    if (problem.fatal) throw Object.assign(new Error(problem.message), { problem })
    if (problem.kind !== 'ok')
      return page === 1 ? { problem, items: null } : { problem: { kind: 'ok' }, items: all }
    const items = json?.[key] ?? []
    all.push(...items)
    if (items.length < 100) break
  }
  return { problem: { kind: 'ok' }, items: all }
}

/**
 * Reads everything and returns the report. Throws an Error with `.problem` for a fatal answer (bad
 * token, rate limit, unseen repository); every other failure becomes "can't check" / Unknown for the
 * part it affects, with the missing permission named in `notes`.
 */
export async function collectGithubReport({ client, repo, features, env = {}, now = new Date() }) {
  const notes = []
  const noted = new Set()
  const note = (problem, text) => {
    if (problem.kind !== 'ok' && !noted.has(text)) {
      noted.add(text)
      notes.push(`${text}: ${problem.message}`)
    }
  }
  const fatal = (problem) => {
    if (problem.fatal) throw Object.assign(new Error(problem.message), { problem })
  }

  const repository = await client.get('', 'repository')
  fatal(repository.problem)
  note(repository.problem, 'Repository')

  const vars = await listAll(client, '/actions/variables', 'variables', 'variables')
  note(vars.problem, 'Variables')
  const secs = await listAll(client, '/actions/secrets', 'secrets', 'secrets')
  note(secs.problem, 'Secrets')
  const variables = vars.items
    ? new Map(vars.items.map((v) => [v.name, String(v.value ?? '')]))
    : null
  const secrets = secs.items ? new Map(secs.items.map((s) => [s.name, s.updated_at ?? ''])) : null

  const out = []
  for (const feature of features) {
    const file = WORKFLOWS[feature.id]
    if (!file) continue
    const wf = await client.get(`/actions/workflows/${file}`, 'workflow')
    fatal(wf.problem)
    if (wf.problem.kind !== 'ok' && wf.problem.kind !== 'not-found')
      note(wf.problem, `Workflow ${file}`)
    const workflow = wf.json ? { file, state: String(wf.json.state) } : null
    const setup = setupStatus({ feature, workflow, variables, secrets, env, file })

    let runs = null
    if (workflow) {
      const listed = await client.get(`/actions/workflows/${file}/runs?per_page=30`, 'runs')
      fatal(listed.problem)
      note(listed.problem, `Runs of ${file}`)
      runs = listed.json?.workflow_runs ?? null
    }

    let result
    if (RESULT_FEATURES.includes(feature.id)) {
      let evidence = null
      if (runs) {
        const art = await client.get(
          `/actions/artifacts?name=${RESULT_ARTIFACT}&per_page=100`,
          'artifacts',
        )
        fatal(art.problem)
        note(art.problem, 'Artifacts')
        const byRun = new Map(
          (art.json?.artifacts ?? []).filter((a) => !a.expired).map((a) => [a.workflow_run?.id, a]),
        )
        evidence = await findLatestEvidence({
          runs,
          load: async (run) => {
            const artifact = byRun.get(run.id)
            const zip = artifact ? await client.artifact(artifact.id) : null
            const text = zip ? readZipEntry(zip, 'health-result.json') : null
            return text ? parseHealthResult(text) : null
          },
        })
      }
      const issues = await openIssues(client, 'health', note, fatal)
      result = healthMonitoring({
        setup,
        workflow,
        evidence,
        running: Boolean(runs?.some((r) => r.status !== 'completed')),
        issues,
        now,
      })
    } else {
      result = lastRunMonitoring({ workflow, runs, now })
    }
    out.push({ id: feature.id, title: feature.title, setup, monitoring: result })
  }

  return {
    schema: 1,
    repo: `${repo.owner}/${repo.name}`,
    generatedAt: now.toISOString(),
    scope: 'repository',
    features: out,
    notes,
  }
}

async function openIssues(client, label, note, fatal) {
  const { problem, json } = await client.get(
    `/issues?labels=${label}&state=open&per_page=10`,
    'issues',
  )
  fatal(problem)
  note(problem, 'Issues')
  return (Array.isArray(json) ? json : [])
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      number: issue.number,
      title: String(issue.title).slice(0, 120),
      url: issue.html_url,
    }))
}
