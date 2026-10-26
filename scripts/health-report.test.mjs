import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { evaluateDataset } from './check-dataset.mjs'
import {
  buildHealthResult,
  buildReport,
  buildSummary,
  datasetFailures,
  declaredLaunchStatus,
  detectMode,
  evaluateSyntheticTest,
  launchFailures,
  resolveLaunchState,
} from './health-report.mjs'

const passing = {
  summary: { ok: true },
  results: [{ id: 'a', area: 'HTTP', status: 'pass', title: 'Home page is 200' }],
}
const failing = {
  summary: { ok: false },
  results: [
    { id: 'a', area: 'HTTP', status: 'pass', title: 'Home page is 200' },
    { id: 'b', area: 'SEO', status: 'warn', title: 'Slow', detail: 'Not a failure' },
    {
      id: 'c',
      area: '404',
      status: 'fail',
      title: 'Unknown URLs return 404',
      detail: 'Got 200.',
      fix: 'Check not-found.',
    },
  ],
}
const ok = { exitCode: 0, output: '✓ Dataset "production" is private.' }
const base = { launch: passing, dataset: ok, url: 'https://example.com.au' }

describe('launchFailures', () => {
  it('lists only failures, with detail and fix', () => {
    expect(launchFailures(failing)).toEqual([
      '**404: Unknown URLs return 404.** Got 200. Fix: Check not-found.',
    ])
  })

  it('reports a crash instead of passing when there is no JSON', () => {
    const [line] = launchFailures(null, 'first\nUsage: needs a url')
    expect(line).toContain('printed no results')
    expect(line).toContain('Usage: needs a url')
    expect(launchFailures({}, '')).toEqual(['launch:check printed no results.'])
  })
})

describe('datasetFailures', () => {
  const publicOutput = `✗ ${
    evaluateDataset({
      dataset: 'production',
      status: 200,
      body: [{ name: 'production', aclMode: 'public' }],
    }).message
  }`

  it('passes on exit 0', () => {
    expect(datasetFailures({ ...ok, enquiries: 'exposed' })).toEqual({ lines: [], exposed: false })
  })

  it('fails a public dataset, and calls out enquiries only when the anonymous probe confirmed them', () => {
    const plain = datasetFailures({ exitCode: 1, output: publicOutput, enquiries: 'none-found' })
    expect(plain.exposed).toBe(false)
    expect(plain.lines).toHaveLength(1)
    expect(plain.lines[0]).toContain('PUBLIC')

    const stored = datasetFailures({ exitCode: 1, output: publicOutput, enquiries: 'exposed' })
    expect(stored.exposed).toBe(true)
    expect(stored.lines[0]).toContain('enquiries are exposed')
    expect(stored.lines).toHaveLength(2)
  })

  it('says exposure could not be verified, and never assumes it from ENQUIRIES_STORE', () => {
    const result = datasetFailures({
      exitCode: 1,
      output: publicOutput,
      enquiries: 'unverified',
      enquiriesStore: true,
    })
    expect(result.exposed).toBe(false)
    expect(result.lines[1]).toContain('could not be verified')
    expect(result.lines[1]).toContain('ENQUIRIES_STORE')
  })

  it('says a refused anonymous count is unverified too, not "none found"', () => {
    const result = datasetFailures({ exitCode: 1, output: publicOutput, enquiries: 'refused' })
    expect(result.exposed).toBe(false)
    expect(result.lines[1]).toContain('was refused')
  })

  it('does not call a refused token an exposure', () => {
    const result = datasetFailures({
      exitCode: 1,
      output: '✗ The Sanity API refused the token (HTTP 401)',
      enquiries: 'unverified',
    })
    expect(result.exposed).toBe(false)
    expect(result.lines).toHaveLength(1)
  })
})

describe('buildReport', () => {
  it('is healthy with nothing to say when everything passes', () => {
    expect(buildReport(base)).toEqual({ failed: false, lines: [], body: '' })
  })

  it('builds an issue body from every failure', () => {
    const report = buildReport({
      ...base,
      launch: failing,
      dataset: { exitCode: 1, output: '✗ Missing in .env.local: SANITY_API_READ_TOKEN.' },
      runUrl: 'https://github.com/o/r/actions/runs/1',
      date: '2026-10-26',
    })
    expect(report.failed).toBe(true)
    expect(report.lines).toHaveLength(2)
    expect(report.body).toContain('failed on 2026-10-26')
    expect(report.body).toContain('- **Sanity: dataset check.**')
    expect(report.body).toContain('- **404: Unknown URLs return 404.**')
    expect(report.body).toContain('Run: https://github.com/o/r/actions/runs/1')
  })

  it('caps a long list', () => {
    const results = Array.from({ length: 60 }, (_, i) => ({
      id: String(i),
      area: 'SEO',
      status: 'fail',
      title: `Page ${i}`,
    }))
    const report = buildReport({ ...base, launch: { results } })
    expect(report.body).toContain('…and 20 more.')
  })
})

describe('buildHealthResult', () => {
  const run = {
    ranChecks: true,
    mode: 'live',
    launch: passing,
    dataset: { exitCode: 0, private: true, enquiries: null },
    url: 'https://example.com.au',
    checkedAt: '2026-10-26T20:00:00.000Z',
    repoTemplateVersion: '1.8.0',
  }

  it('records a disabled run with its reason, even when setup is also missing', () => {
    const result = buildHealthResult({
      ...run,
      ranChecks: false,
      disabled: true,
      disabledReason: '  Template\nrepo ',
      missing: ['PRODUCTION_URL'],
    })
    expect(result).toMatchObject({
      schema: 1,
      outcome: 'disabled',
      reason: 'Template repo',
      mode: null,
      setup: { missing: [] },
      repoTemplateVersion: '1.8.0',
    })
  })

  it('gives a disabled run a default reason', () => {
    expect(buildHealthResult({ ...run, disabled: true }).reason).toBe('HEALTH_CHECKS is off.')
  })

  it('is unconfigured with the names that are missing, and checks nothing', () => {
    const result = buildHealthResult({
      ...run,
      ranChecks: false,
      missing: ['PRODUCTION_URL', 'SANITY_AUTH_TOKEN'],
    })
    expect(result.outcome).toBe('unconfigured')
    expect(result.setup.missing).toEqual(['PRODUCTION_URL', 'SANITY_AUTH_TOKEN'])
    expect(result.mode).toBeNull()
    expect(result.summary).toEqual({ pass: 0, warn: 0, fail: 0 })
  })

  it('is skipped, with the reason, when setup is present but no checks ran', () => {
    const result = buildHealthResult({
      ...run,
      ranChecks: false,
      skipReason: 'The run was cancelled before the checks finished.',
    })
    expect(result).toMatchObject({
      outcome: 'skipped',
      skipReason: 'The run was cancelled before the checks finished.',
      mode: null,
    })
    expect(buildHealthResult({ ...run, ranChecks: false }).skipReason).toBe(
      'The checks did not run.',
    )
  })

  it('is healthy, counting the dataset check among the passes', () => {
    const result = buildHealthResult(run)
    expect(result).toMatchObject({
      outcome: 'healthy',
      mode: 'live',
      synthetic: false,
      url: 'https://example.com.au',
      summary: { pass: 2, warn: 0, fail: 0 },
      failures: [],
      dataset: { private: true },
      enquiriesExposed: false,
    })
  })

  it('is a warning when only warnings were found', () => {
    const result = buildHealthResult({ ...run, launch: { results: failing.results.slice(0, 2) } })
    expect(result.outcome).toBe('warning')
    expect(result.summary).toEqual({ pass: 2, warn: 1, fail: 0 })
  })

  it('fails with structured failures from the launch check', () => {
    const result = buildHealthResult({ ...run, launch: failing })
    expect(result.outcome).toBe('failed')
    expect(result.failures).toEqual([
      { id: 'c', area: '404', title: 'Unknown URLs return 404', fix: 'Check not-found.' },
    ])
    expect(result.summary).toEqual({ pass: 2, warn: 1, fail: 1 })
  })

  it('fails with the reason when launch:check printed no results, as before', () => {
    const result = buildHealthResult({ ...run, launch: null })
    expect(result.outcome).toBe('failed')
    expect(result.reason).toBe('launch:check printed no results')
    expect(result.failures[0]).toMatchObject({ id: 'launch-no-results' })
  })

  it('fails on a malformed launch block shape', () => {
    expect(buildHealthResult({ ...run, launch: { results: 'nope' } }).outcome).toBe('failed')
  })

  it('records prelaunch mode', () => {
    expect(buildHealthResult({ ...run, mode: 'prelaunch' }).mode).toBe('prelaunch')
  })

  it('reports confirmed exposure first', () => {
    const result = buildHealthResult({
      ...run,
      dataset: { exitCode: 1, private: false, enquiries: 'exposed' },
    })
    expect(result.outcome).toBe('failed')
    expect(result).toMatchObject({ enquiries: 'exposed', enquiriesExposed: true })
    expect(result.dataset).toEqual({ private: false })
    expect(result.failures.map((failure) => failure.id)).toEqual([
      'dataset-enquiries-exposed',
      'dataset-check',
    ])
  })

  it('does not call a public dataset with no enquiries found exposed', () => {
    const result = buildHealthResult({
      ...run,
      dataset: { exitCode: 1, private: false, enquiries: 'none-found' },
    })
    expect(result).toMatchObject({ enquiries: 'none-found', enquiriesExposed: false })
    expect(result.failures.map((failure) => failure.id)).toEqual(['dataset-check'])
  })

  it('reports a verification failure as its own thing, not as exposure or as none', () => {
    const result = buildHealthResult({
      ...run,
      enquiriesStore: true,
      dataset: { exitCode: 1, private: false, enquiries: 'unverified' },
    })
    expect(result).toMatchObject({ enquiries: 'unverified', enquiriesExposed: false })
    expect(result.failures.map((failure) => failure.id)).toEqual([
      'dataset-check',
      'dataset-enquiries-unverified',
    ])
  })

  it('keeps a refused anonymous count apart from none-found', () => {
    const result = buildHealthResult({
      ...run,
      dataset: { exitCode: 1, private: false, enquiries: 'refused' },
    })
    expect(result).toMatchObject({ enquiries: 'refused', enquiriesExposed: false })
    expect(result.failures.map((failure) => failure.id)).toContain('dataset-enquiries-unverified')
  })

  it('treats a private dataset, or no probe, as not checked', () => {
    expect(buildHealthResult({ ...run, enquiriesStore: true }).enquiries).toBe('not-checked')
    const odd = buildHealthResult({
      ...run,
      dataset: { exitCode: 1, private: null, enquiries: 'garbage' },
    })
    expect(odd).toMatchObject({ enquiries: 'not-checked', dataset: { private: null } })
  })

  it('skips the launch checks and warns when the launch state is unknown', () => {
    const result = buildHealthResult({ ...run, mode: 'unknown', launch: null })
    expect(result).toMatchObject({
      outcome: 'warning',
      mode: 'unknown',
      summary: { pass: 1, warn: 1, fail: 0 },
      failures: [],
    })
    expect(result.reason).toContain('Could not tell')
  })

  it('still fails an unknown-state site whose dataset is public', () => {
    const result = buildHealthResult({
      ...run,
      mode: 'unknown',
      launch: null,
      dataset: { exitCode: 1, private: false, enquiries: 'none-found' },
    })
    expect(result.outcome).toBe('failed')
    expect(result.failures.map((failure) => failure.id)).toEqual(['dataset-check'])
  })

  it('records where the mode came from', () => {
    expect(buildHealthResult({ ...run, modeSource: 'profile' }).modeSource).toBe('profile')
    expect(buildHealthResult({ ...run, modeSource: 'whatever' }).modeSource).toBeNull()
  })

  it('marks a synthetic run, keeps its outcome and records what it expected', () => {
    const result = buildHealthResult({
      ...run,
      synthetic: true,
      expectedOutcome: 'failed',
      launch: failing,
    })
    expect(result).toMatchObject({
      synthetic: true,
      outcome: 'failed',
      test: { expectedOutcome: 'failed', healthStatus: 'failed', testStatus: null, problems: [] },
    })
    expect(buildHealthResult(run).test).toBeUndefined()
  })

  it('gives a synthetic disabled run its healthStatus too', () => {
    const result = buildHealthResult({ ...run, synthetic: true, disabled: true })
    expect(result.test.healthStatus).toBe('disabled')
  })

  it('carries no environment value: only the origin of the address and whitelisted fields', () => {
    const canary = 'sk-canary-token-123456'
    const result = buildHealthResult({
      ...run,
      url: `https://user:${canary}@example.com.au/path?token=${canary}`,
      launch: {
        results: [
          {
            id: 'x',
            area: 'A',
            status: 'fail',
            title: 'T',
            fix: 'F',
            detail: canary,
            extra: canary,
          },
        ],
      },
      dataset: { exitCode: 1, private: null, enquiries: canary, message: canary },
    })
    expect(JSON.stringify(result)).not.toContain(canary)
    expect(result.url).toBe('https://example.com.au')
  })

  it('has an empty address for junk', () => {
    expect(buildHealthResult({ ...run, url: 'not a url' }).url).toBe('')
  })
})

describe('launch state', () => {
  const info = (status) => ({
    ok: true,
    text: JSON.stringify({ launch: { status, homepage: 'links' } }),
  })

  it('trusts a readable /api/site-info above the profile', () => {
    expect(resolveLaunchState({ siteInfo: info('prelaunch'), declared: 'live' })).toEqual({
      state: 'prelaunch',
      source: 'site-info',
    })
    expect(resolveLaunchState({ siteInfo: info('live'), declared: 'prelaunch' })).toEqual({
      state: 'live',
      source: 'site-info',
    })
  })

  it('treats an answer with no launch block as a template older than the launch state: live', () => {
    expect(
      resolveLaunchState({ siteInfo: { ok: true, text: '{"name":"x"}' }, declared: null }),
    ).toEqual({ state: 'live', source: 'site-info' })
  })

  it('uses an explicit profile status when the endpoint is unreadable', () => {
    for (const siteInfo of [null, { ok: false, text: '' }, { ok: true, text: '{not json' }]) {
      expect(resolveLaunchState({ siteInfo, declared: 'live' })).toEqual({
        state: 'live',
        source: 'profile',
      })
      expect(resolveLaunchState({ siteInfo, declared: 'prelaunch' })).toEqual({
        state: 'prelaunch',
        source: 'profile',
      })
    }
  })

  it('is unknown, not live, when the endpoint is unreadable and the profile says nothing', () => {
    expect(resolveLaunchState({ siteInfo: null, declared: null })).toEqual({
      state: 'unknown',
      source: null,
    })
    expect(resolveLaunchState({ siteInfo: info('maybe'), declared: null }).state).toBe('unknown')
    expect(
      resolveLaunchState({
        siteInfo: { ok: true, text: '{"launch":{"status":"live"}}' },
        declared: null,
      }).state,
    ).toBe('unknown')
  })

  describe('declaredLaunchStatus', () => {
    it('reads an explicit status', () => {
      expect(
        declaredLaunchStatus("export default defineSiteProfile({ launch: { status: 'live' } })"),
      ).toBe('live')
      expect(
        declaredLaunchStatus('launch: {\n    status: "prelaunch",\n    homepage: "links",\n  },'),
      ).toBe('prelaunch')
    })

    it('ignores commented-out blocks, missing blocks and missing files', () => {
      expect(
        declaredLaunchStatus(
          "// launch: { status: 'prelaunch', homepage: 'links' },\n/* launch: { status: 'live' } */",
        ),
      ).toBeNull()
      expect(declaredLaunchStatus('export default defineSiteProfile({})')).toBeNull()
      expect(declaredLaunchStatus(null)).toBeNull()
    })
  })

  describe('detectMode', () => {
    const answer = (body) => async () => ({ ok: true, text: async () => body })

    it('reads /api/site-info from the address’s origin', async () => {
      const calls = []
      const fetchImpl = async (url) => {
        calls.push(url)
        return {
          ok: true,
          text: async () => JSON.stringify({ launch: { status: 'prelaunch', homepage: 'links' } }),
        }
      }
      expect(await detectMode('https://example.com.au/some/path', { fetchImpl })).toEqual({
        state: 'prelaunch',
        source: 'site-info',
      })
      expect(calls).toEqual(['https://example.com.au/api/site-info'])
    })

    it('falls back to the profile, then to unknown, when the request fails or errors', async () => {
      const down = async () => {
        throw new Error('down')
      }
      const profileSource = "launch: { status: 'live' }"
      expect(
        await detectMode('https://example.com.au', { fetchImpl: down, profileSource }),
      ).toEqual({
        state: 'live',
        source: 'profile',
      })
      expect((await detectMode('https://example.com.au', { fetchImpl: down })).state).toBe(
        'unknown',
      )
      expect(
        (await detectMode('https://example.com.au', { fetchImpl: async () => ({ ok: false }) }))
          .state,
      ).toBe('unknown')
      expect((await detectMode('', { fetchImpl: answer('{}') })).state).toBe('unknown')
    })
  })
})

describe('evaluateSyntheticTest', () => {
  const result = { schema: 1, outcome: 'failed', synthetic: true }
  const issues = [{ number: 3, state: 'OPEN', title: 'x', updatedAt: '2026-10-01' }]
  const ok = { result, expectedOutcome: 'failed', issuesBefore: issues, issuesAfter: issues }

  it('passes when the outcome is the expected one and no issue changed', () => {
    expect(evaluateSyntheticTest(ok)).toEqual({ testStatus: 'passed', problems: [] })
  })

  it('fails when the observed outcome differs from the expected one', () => {
    const verdict = evaluateSyntheticTest({ ...ok, result: { ...result, outcome: 'healthy' } })
    expect(verdict.testStatus).toBe('failed')
    expect(verdict.problems[0]).toContain('Expected the outcome "failed" but observed "healthy"')
  })

  it('fails when the result is missing, invalid or not marked synthetic', () => {
    for (const bad of [null, {}, { schema: 2, outcome: 'failed' }, 'text']) {
      const verdict = evaluateSyntheticTest({ ...ok, result: bad })
      expect(verdict.testStatus).toBe('failed')
      expect(verdict.problems[0]).toContain('missing or invalid')
    }
    expect(
      evaluateSyntheticTest({ ...ok, result: { ...result, synthetic: false } }).testStatus,
    ).toBe('failed')
  })

  it('fails when an issue was created, edited or closed', () => {
    for (const after of [
      [],
      [{ ...issues[0], state: 'CLOSED' }],
      [{ ...issues[0], updatedAt: '2026-10-26' }],
      [...issues, { number: 4, state: 'OPEN', title: 'new', updatedAt: 'now' }],
    ]) {
      const verdict = evaluateSyntheticTest({ ...ok, issuesAfter: after })
      expect(verdict.testStatus).toBe('failed')
      expect(verdict.problems.join(' ')).toContain('issue was created, edited or closed')
    }
  })

  it('fails when the issue snapshots are missing, because "no issue touched" is then unproven', () => {
    expect(evaluateSyntheticTest({ ...ok, issuesAfter: null }).testStatus).toBe('failed')
    expect(evaluateSyntheticTest({ ...ok, issuesBefore: null }).testStatus).toBe('failed')
  })

  it('reports every problem at once', () => {
    const verdict = evaluateSyntheticTest({
      result: null,
      expectedOutcome: 'failed',
      issuesBefore: [],
      issuesAfter: [1],
    })
    expect(verdict.problems).toHaveLength(2)
  })
})

describe('buildSummary', () => {
  const base = {
    schema: 1,
    mode: null,
    synthetic: false,
    summary: { pass: 0, warn: 0, fail: 0 },
    failures: [],
  }

  it.each(['disabled', 'unconfigured', 'skipped'])('says nothing was checked for %s', (outcome) => {
    const text = buildSummary({ ...base, outcome, reason: 'Because.' })
    expect(text).toContain('Nothing was checked.')
    expect(text).toContain('Because.')
  })

  it('shows the counts and failures of a real run', () => {
    const text = buildSummary({
      ...base,
      outcome: 'failed',
      mode: 'prelaunch',
      summary: { pass: 4, warn: 1, fail: 1 },
      failures: [{ id: 'c', area: '404', title: 'Unknown URLs return 404', fix: 'Check it.' }],
    })
    expect(text).toContain('Mode: prelaunch. 4 passed, 1 warning, 1 failed.')
    expect(text).toContain('**404: Unknown URLs return 404.** Check it.')
    expect(text).not.toContain('Nothing was checked')
  })

  it('puts the issue a synthetic run would have written in the summary', () => {
    const text = buildSummary(
      { ...base, outcome: 'failed', synthetic: true, mode: 'live' },
      { issueBody: 'The daily health check failed.' },
    )
    expect(text.startsWith('# SYNTHETIC TEST: not a real health result')).toBe(true)
    expect(text).toContain('No issue is opened, edited or closed')
    expect(text).toContain('healthStatus')
    expect(text).toContain('testStatus')
    expect(text).toContain('The daily health check failed.')
  })

  it('adds the ENQUIRIES_STORE deprecation line', () => {
    const text = buildSummary(
      { ...base, outcome: 'healthy', mode: 'live' },
      { deprecated: ['Old.'] },
    )
    expect(text).toContain('**Deprecated:** Old.')
  })
})

describe('health.yml', () => {
  const workflow = readFileSync(new URL('../.github/workflows/health.yml', import.meta.url), 'utf8')
  const [head, ...jobParts] = workflow.split(/\n {2}(?=[a-z-]+:\n {4}(?:needs|if|runs-on):)/)
  const jobs = Object.fromEntries(jobParts.map((part) => [part.split(':')[0], part]))
  const steps = (job) => job.split(/\n {6}- /).slice(1)

  it('is read-only by default, and only the issues job can write issues', () => {
    expect(head).toMatch(/\npermissions:\n {2}contents: read\n/)
    expect(head).not.toMatch(/issues: write/)
    expect(Object.keys(jobs)).toEqual(['health', 'issues'])
    expect(jobs.health).toMatch(/permissions:\n {6}contents: read\n {6}issues: read\n/)
    expect(jobs.health).not.toMatch(/issues: write/)
    expect(jobs.issues).toMatch(/permissions:\n {6}issues: write\n/)
  })

  it('never starts the issues job for a synthetic run or a run that checked nothing', () => {
    expect(jobs.issues).toContain("needs.health.outputs.checked == 'true'")
    expect(jobs.issues).toContain('inputs.synthetic != true')
    expect(jobs.issues).toContain('needs: health')
  })

  it('writes to issues nowhere outside the issues job', () => {
    expect(jobs.health).not.toMatch(/\bgh (issue (create|edit|close)|label)\b/)
    expect(jobs.issues).toMatch(/\bgh issue create\b/)
  })

  it('reads issues in the health job only to prove a synthetic run left them alone', () => {
    const reading = steps(jobs.health).filter((step) => /\bgh issue list\b/.test(step))
    expect(reading).toHaveLength(2)
    for (const step of reading) expect(step).toContain('inputs.synthetic == true')
  })

  it('keeps the issue snapshots outside the workspace, which actions/checkout cleans', () => {
    expect(workflow).not.toMatch(/(?<!\/)issues-(before|after)\.json/)
    expect(workflow.match(/\$RUNNER_TEMP\/issues-(before|after)\.json/g)).not.toBeNull()
  })

  it('verifies every synthetic run, even when earlier steps failed', () => {
    const verify = steps(jobs.health).find((step) => step.includes('health-report.mjs verify'))
    expect(verify).toContain('always() && inputs.synthetic == true')
  })

  it('uploads the result on every run for 30 days', () => {
    const upload = steps(jobs.health).find((step) => step.includes('upload-artifact'))
    expect(upload).toContain('if: always()')
    expect(upload).toContain('name: health-result')
    expect(upload).toContain('retention-days: 30')
  })
})
