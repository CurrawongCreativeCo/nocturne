import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateRawSync } from 'node:zlib'

import { describe, expect, it } from 'vitest'

import {
  classifyResponse,
  collectGithubReport,
  findLatestEvidence,
  formatGithubTable,
  hasGithubProblem,
  healthMonitoring,
  lastRunMonitoring,
  parseHealthResult,
  parseRepo,
  readZipEntry,
  setupStatus,
  tokenHelp,
  WORKFLOWS,
} from './github.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = (name) => JSON.parse(readFileSync(join(here, 'fixtures', name), 'utf8'))
const fixtureText = (name) => readFileSync(join(here, 'fixtures', name), 'utf8')

const NOW = new Date('2026-10-26T12:00:00Z')
const REPO = { owner: 'acme', name: 'site' }

const feature = {
  id: 'health-monitoring',
  title: 'Daily health monitoring',
  settings: [
    { name: 'PRODUCTION_URL', kind: 'github-var', required: true },
    { name: 'NEXT_PUBLIC_SANITY_PROJECT_ID', kind: 'github-var', required: true },
    { name: 'NEXT_PUBLIC_SANITY_DATASET', kind: 'github-var', required: false },
    { name: 'SANITY_AUTH_TOKEN', kind: 'github-secret', required: true },
    { name: 'HEALTH_CHECKS', kind: 'github-var', required: false, format: 'off-switch' },
    { name: 'HEALTH_CHECKS_REASON', kind: 'github-var', required: false },
    {
      name: 'ENQUIRIES_STORE',
      kind: 'github-var',
      required: false,
      deprecated: { replacedBy: 'x', migration: 'y', removeWhen: 'z' },
    },
    { name: 'PLANNED', kind: 'github-var', required: true, planned: 'task 999' },
    { name: 'SANITY_API_READ_TOKEN', kind: 'secret', required: true },
  ],
}

const vars = (entries) => new Map(entries.map((v) => [v.name, v.value]))
const goodVars = () => vars(fixture('variables.json').variables)
const goodSecrets = () =>
  new Map(fixture('secrets.json').secrets.map((s) => [s.name, s.updated_at]))
const env = {
  NEXT_PUBLIC_SITE_URL: 'https://example.com.au/',
  NEXT_PUBLIC_SANITY_PROJECT_ID: 'abc123xy',
}
const active = { file: 'health.yml', state: 'active' }

const setup = (over = {}) =>
  setupStatus({
    feature,
    workflow: active,
    variables: goodVars(),
    secrets: goodSecrets(),
    env,
    file: 'health.yml',
    ...over,
  })

const result = (over = {}) => ({
  outcome: 'healthy',
  mode: 'live',
  synthetic: false,
  checkedAt: '2026-10-26T08:00:00Z',
  reason: null,
  failures: 0,
  missing: [],
  ...over,
})
const evidence = (over) => ({
  kind: 'result',
  result: result(over),
  run: { html_url: 'https://run' },
})
const monitor = (over = {}) =>
  healthMonitoring({ setup: setup(), workflow: active, evidence: evidence(), now: NOW, ...over })

describe('parseRepo', () => {
  it('reads owner/name, https and ssh origins', () => {
    expect(parseRepo('acme/site')).toEqual(REPO)
    expect(parseRepo('https://github.com/acme/site.git')).toEqual(REPO)
    expect(parseRepo('git@github.com:acme/site.git\n')).toEqual(REPO)
    expect(parseRepo('nonsense')).toBeNull()
  })
})

describe('tokenHelp', () => {
  it('names every permission and the repository, and says it only reads', () => {
    const text = tokenHelp(REPO)
    for (const name of [
      'Actions',
      'Variables',
      'Secrets',
      'Issues',
      'Metadata',
      'acme/site',
      'Read-only',
    ]) {
      expect(text).toContain(name)
    }
  })
})

describe('setup status', () => {
  it('is ready, with secrets by name and date only and variables compared with .env.local', () => {
    const status = setup()
    expect(status.status).toBe('ready')
    expect(status.workflowState).toBe('active')
    expect(status.items.find((i) => i.name === 'PRODUCTION_URL').match).toBe('matches')
    expect(status.items.find((i) => i.name === 'NEXT_PUBLIC_SANITY_PROJECT_ID').match).toBe(
      'matches',
    )
    expect(status.items.find((i) => i.name === 'SANITY_AUTH_TOKEN')).toMatchObject({
      status: 'present',
      updatedAt: '2026-10-02T03:04:05Z',
    })
    expect(status.items.map((i) => i.name)).not.toContain('PLANNED')
    expect(status.items.map((i) => i.name)).not.toContain('SANITY_API_READ_TOKEN')
    expect(JSON.stringify(status)).not.toContain('example.com.au')
    expect(JSON.stringify(status)).not.toContain('abc123xy')
  })

  it('says what is missing', () => {
    const variables = goodVars()
    variables.delete('PRODUCTION_URL')
    const status = setup({ variables, secrets: new Map() })
    expect(status.status).toBe('not-set-up')
    expect(status.reason).toBe('Not set up: PRODUCTION_URL, SANITY_AUTH_TOKEN not set')
  })

  it('flags a variable that differs from .env.local, without printing either value', () => {
    const variables = goodVars()
    variables.set('NEXT_PUBLIC_SANITY_PROJECT_ID', 'other999')
    const status = setup({ variables })
    expect(status.status).toBe('not-set-up')
    expect(status.reason).toContain('NEXT_PUBLIC_SANITY_PROJECT_ID differs from .env.local')
    expect(JSON.stringify(status)).not.toContain('other999')
  })

  it('does not compare when .env.local has no value', () => {
    expect(setup({ env: {} }).items.find((i) => i.name === 'PRODUCTION_URL').match).toBe(
      'not-compared',
    )
  })

  it('reports HEALTH_CHECKS=off as intentionally disabled, with its reason', () => {
    const variables = goodVars()
    variables.set('HEALTH_CHECKS', 'off')
    variables.set('HEALTH_CHECKS_REASON', 'Template repository')
    const status = setup({ variables, secrets: new Map() })
    expect(status).toMatchObject({ status: 'disabled', disabled: true })
    expect(status.reason).toContain('Template repository')
  })

  it('shows the workflow state verbatim and treats a non-active one as not set up', () => {
    const status = setup({ workflow: { file: 'health.yml', state: 'disabled_inactivity' } })
    expect(status.workflowState).toBe('disabled_inactivity')
    expect(status.status).toBe('not-set-up')
    expect(status.reason).toContain('disabled_inactivity')
  })

  it('notices a workflow file GitHub does not have', () => {
    expect(setup({ workflow: null }).reason).toContain('not on GitHub')
  })

  it("can't check what the token can't read", () => {
    const status = setup({ secrets: null })
    expect(status.status).toBe('cant-check')
    expect(status.reason).toContain('SANITY_AUTH_TOKEN')
  })

  it('marks a deprecated variable without requiring it', () => {
    const variables = goodVars()
    variables.set('ENQUIRIES_STORE', 'on')
    const status = setup({ variables })
    expect(status.status).toBe('ready')
    expect(status.items.find((i) => i.name === 'ENQUIRIES_STORE').status).toBe('deprecated')
  })
})

describe('monitoring states', () => {
  it.each([
    ['disabled', { reason: 'Off on purpose' }, 'neutral'],
    ['unconfigured', { reason: 'Setup is missing: PRODUCTION_URL.' }, 'problem'],
    ['skipped', { reason: 'The run was cancelled.' }, 'problem'],
    ['healthy', {}, 'good'],
    ['warning', {}, 'attention'],
    ['failed', { failures: 2 }, 'problem'],
  ])('maps a recent %s result', (outcome, over, tone) => {
    const state = monitor({ evidence: evidence({ outcome, ...over }) })
    expect(state.status).toBe(outcome)
    expect(state.tone).toBe(tone)
  })

  it('is Intentionally disabled from the variable alone', () => {
    const variables = goodVars()
    variables.set('HEALTH_CHECKS', 'off')
    const state = monitor({ setup: setup({ variables }), evidence: null })
    expect(state).toMatchObject({ status: 'disabled', label: 'Intentionally disabled' })
  })

  it('is Expected but unconfigured when required setup is missing, whatever the runs say', () => {
    const state = monitor({ setup: setup({ secrets: new Map() }), evidence: evidence() })
    expect(state).toMatchObject({ status: 'unconfigured', label: 'Expected but unconfigured' })
  })

  it('is Configured but skipped for a cancelled scheduled run with no result', () => {
    const run = { conclusion: 'cancelled', created_at: '2026-10-26T01:00:00Z', html_url: 'u' }
    const state = monitor({ evidence: { kind: 'run-without-result', run } })
    expect(state).toMatchObject({ status: 'skipped', label: 'Configured but skipped' })
    expect(state.reason).toContain('cancelled')
  })

  it('is Stale when the newest real result is over 36 hours old', () => {
    const state = monitor({ evidence: evidence({ checkedAt: '2026-10-24T23:00:00Z' }) })
    expect(state.status).toBe('stale')
    expect(state.lastResult.outcome).toBe('healthy')
    expect(monitor({ evidence: evidence({ checkedAt: '2026-10-25T01:00:00Z' }) }).status).toBe(
      'healthy',
    )
  })

  it('is Stale when GitHub has paused the workflow, with the state shown verbatim', () => {
    const paused = { file: 'health.yml', state: 'disabled_inactivity' }
    const state = monitor({ workflow: paused, setup: setup({ workflow: paused }) })
    expect(state.status).toBe('stale')
    expect(state.reason).toContain('disabled_inactivity')
  })

  it('is Unknown with no run, unreadable runs, or no workflow', () => {
    expect(monitor({ evidence: { kind: 'none' } }).status).toBe('unknown')
    expect(monitor({ evidence: null }).status).toBe('unknown')
    expect(monitor({ workflow: null, setup: setup({ workflow: null }) }).status).toBe('unknown')
  })

  it('carries open health issues and a run in progress beside the state', () => {
    const state = monitor({ running: true, issues: [{ number: 12, title: 't', url: 'u' }] })
    expect(state.running).toBe(true)
    expect(state.issues).toHaveLength(1)
  })
})

describe('evidence', () => {
  const run = (id, over = {}) => ({
    id,
    status: 'completed',
    conclusion: 'success',
    event: 'schedule',
    ...over,
  })

  it('ignores a synthetic result and finds the real one behind it', async () => {
    const results = {
      3: result({ synthetic: true, outcome: 'failed' }),
      2: result({ outcome: 'warning' }),
    }
    const found = await findLatestEvidence({
      runs: [run(3, { event: 'workflow_dispatch' }), run(2), run(1)],
      load: async (r) => results[r.id] ?? null,
    })
    expect(found.kind).toBe('result')
    expect(found.result.outcome).toBe('warning')
  })

  it('skips runs still in progress', async () => {
    const found = await findLatestEvidence({
      runs: [run(2, { status: 'in_progress', conclusion: null }), run(1)],
      load: async (r) => (r.id === 1 ? result() : null),
    })
    expect(found.run.id).toBe(1)
  })

  it('counts a cancelled scheduled run with no result as skipped, but not a manual one', async () => {
    const load = async () => null
    const scheduled = await findLatestEvidence({
      runs: [run(2, { conclusion: 'cancelled' })],
      load,
    })
    expect(scheduled.kind).toBe('run-without-result')
    const manual = await findLatestEvidence({
      runs: [run(2, { conclusion: 'cancelled', event: 'workflow_dispatch' })],
      load,
    })
    expect(manual.kind).toBe('none')
  })

  it('is none when only synthetic results exist', async () => {
    const found = await findLatestEvidence({
      runs: [run(1)],
      load: async () => result({ synthetic: true }),
    })
    expect(found.kind).toBe('none')
  })
})

describe('result files', () => {
  it('parses a schema 1 result and rejects anything else', () => {
    expect(parseHealthResult(fixtureText('result-failed.json'))).toMatchObject({
      outcome: 'failed',
      failures: 2,
    })
    expect(parseHealthResult(fixtureText('result-synthetic.json')).synthetic).toBe(true)
    expect(parseHealthResult('{"schema":2,"outcome":"healthy"}')).toBeNull()
    expect(parseHealthResult('{"schema":1,"outcome":"great"}')).toBeNull()
    expect(parseHealthResult('not json')).toBeNull()
  })

  it('reads a file out of an artifact zip, stored or deflated', () => {
    const text = fixtureText('result-failed.json')
    expect(readZipEntry(zip('health-result.json', text, 8), 'health-result.json')).toBe(text)
    expect(readZipEntry(zip('health-result.json', text, 0), 'health-result.json')).toBe(text)
    expect(readZipEntry(zip('other.txt', text, 8), 'health-result.json')).toBeNull()
    expect(readZipEntry(Buffer.from('not a zip'), 'health-result.json')).toBeNull()
  })
})

describe('HTTP answers', () => {
  it('401 says the token was refused', () => {
    expect(classifyResponse({ status: 401 }, 'repository', NOW)).toMatchObject({
      kind: 'unauthorised',
      fatal: true,
    })
  })

  it.each([
    ['variables', 'Variables (read)'],
    ['secrets', 'Secrets (read)'],
    ['runs', 'Actions (read)'],
    ['issues', 'Issues (read)'],
  ])('403 on %s names the missing permission', (what, permission) => {
    const answer = classifyResponse(
      { status: 403, headers: { 'x-ratelimit-remaining': '4000' } },
      what,
      NOW,
    )
    expect(answer).toMatchObject({ kind: 'forbidden', fatal: false, permission })
    expect(answer.message).toContain(permission)
  })

  it('404 on the repository stops the run; on anything else it is only that part', () => {
    expect(classifyResponse({ status: 404 }, 'repository', NOW)).toMatchObject({
      kind: 'not-found',
      fatal: true,
    })
    expect(classifyResponse({ status: 404 }, 'workflow', NOW)).toMatchObject({
      kind: 'not-found',
      fatal: false,
    })
  })

  it('stops on a rate limit and says when to retry', () => {
    const reset = Math.floor(new Date('2026-10-26T13:00:00Z').getTime() / 1000)
    const answer = classifyResponse(
      {
        status: 403,
        headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(reset) },
      },
      'runs',
      NOW,
    )
    expect(answer).toMatchObject({
      kind: 'rate-limited',
      fatal: true,
      retryAt: '2026-10-26T13:00:00.000Z',
    })
    expect(answer.message).toContain('try again after')
    const secondary = classifyResponse(
      { status: 429, headers: { 'retry-after': '90' } },
      'runs',
      NOW,
    )
    expect(secondary.retryAt).toBe('2026-10-26T12:01:30.000Z')
  })

  it('treats a network failure as unreadable, not fatal', () => {
    expect(classifyResponse({ status: 0, error: 'offline' }, 'runs', NOW)).toMatchObject({
      kind: 'error',
      fatal: false,
    })
  })
})

describe('last run only (features without a result file)', () => {
  it('reports the newest completed run', () => {
    const runs = fixture('runs.json').workflow_runs
    const state = lastRunMonitoring({ workflow: active, runs, now: NOW })
    expect(state.label).toBe('Last run: success')
    expect(state.tone).toBe('neutral')
    expect(lastRunMonitoring({ workflow: active, runs: [], now: NOW }).status).toBe('unknown')
  })
})

describe('collectGithubReport', () => {
  const answers = (over = {}) => {
    const table = {
      '': { status: 200, json: { full_name: 'acme/site' } },
      '/actions/variables': { status: 200, json: fixture('variables.json') },
      '/actions/secrets': { status: 200, json: fixture('secrets.json') },
      '/actions/workflows/health.yml': { status: 200, json: fixture('workflow-active.json') },
      '/actions/workflows/health.yml/runs': { status: 200, json: fixture('runs.json') },
      '/actions/artifacts': { status: 200, json: fixture('artifacts.json') },
      '/issues': { status: 200, json: fixture('issues.json') },
      ...over,
    }
    const zips = {
      9002: zip('health-result.json', fixtureText('result-synthetic.json'), 8),
      9001: zip('health-result.json', fixtureText('result-failed.json'), 8),
    }
    return {
      async get(path, what) {
        const key = path.split('?')[0]
        const answer = table[key]
        const problem = classifyResponse(
          { status: answer.status, headers: answer.headers ?? {} },
          what,
          NOW,
        )
        if (problem.fatal) return { problem, json: null }
        return { problem, json: problem.kind === 'ok' ? answer.json : null }
      },
      async artifact(id) {
        return zips[id] ?? null
      },
    }
  }
  const run = (client) =>
    collectGithubReport({ client, repo: REPO, features: [feature], env, now: NOW })

  it('ignores the synthetic run and reports the real failure, in progress, with the open issue', async () => {
    const report = await run(answers())
    const [health] = report.features
    expect(health.setup.status).toBe('ready')
    expect(health.monitoring).toMatchObject({ status: 'failed', running: true })
    expect(health.monitoring.lastResult.outcome).toBe('failed')
    expect(health.monitoring.issues).toEqual([
      {
        number: 12,
        title: 'Production health check failing',
        url: 'https://github.com/acme/site/issues/12',
      },
    ])
    expect(hasGithubProblem(report)).toBe(true)
    const text = formatGithubTable(report)
    expect(text).toContain('Daily health monitoring')
    expect(text).toContain('Failed')
    expect(text).toContain('Open issue #12')
    expect(JSON.stringify(report)).not.toMatch(/example\.com\.au|abc123xy/)
  })

  it('names the missing permission and carries on', async () => {
    const report = await run(answers({ '/actions/secrets': { status: 403, json: null } }))
    expect(report.notes.join('\n')).toContain('Secrets (read)')
    expect(report.features[0].setup.status).toBe('cant-check')
  })

  it('stops on 401, a 404 repository and a rate limit', async () => {
    await expect(run(answers({ '': { status: 401 } }))).rejects.toMatchObject({
      problem: { kind: 'unauthorised' },
    })
    await expect(run(answers({ '': { status: 404 } }))).rejects.toMatchObject({
      problem: { kind: 'not-found' },
    })
    await expect(
      run(
        answers({
          '/actions/variables': {
            status: 403,
            headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1793000000' },
          },
        }),
      ),
    ).rejects.toMatchObject({ problem: { kind: 'rate-limited' } })
  })

  it('is Unknown with a missing workflow file', async () => {
    const report = await run(answers({ '/actions/workflows/health.yml': { status: 404 } }))
    expect(report.features[0].setup.reason).toContain('not on GitHub')
    expect(report.features[0].monitoring.status).toBe('unknown')
  })
})

describe('the workflow table', () => {
  it('only names workflow files that exist', () => {
    for (const file of Object.values(WORKFLOWS)) {
      expect(() => readFileSync(join(here, '..', '..', '.github', 'workflows', file))).not.toThrow()
    }
  })
})

/** A one-file zip with a central directory, the way GitHub serves an artifact. */
function zip(name, text, method) {
  const raw = Buffer.from(text)
  const data = method === 8 ? deflateRawSync(raw) : raw
  const nameBytes = Buffer.from(name)
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0)
  local.writeUInt16LE(method, 8)
  local.writeUInt32LE(data.length, 18)
  local.writeUInt32LE(raw.length, 22)
  local.writeUInt16LE(nameBytes.length, 26)
  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50, 0)
  central.writeUInt16LE(method, 10)
  central.writeUInt32LE(data.length, 20)
  central.writeUInt32LE(raw.length, 24)
  central.writeUInt16LE(nameBytes.length, 28)
  central.writeUInt32LE(0, 42)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(1, 8)
  end.writeUInt16LE(1, 10)
  end.writeUInt32LE(46 + nameBytes.length, 12)
  end.writeUInt32LE(30 + nameBytes.length + data.length, 16)
  return Buffer.concat([local, nameBytes, data, central, nameBytes, end])
}
