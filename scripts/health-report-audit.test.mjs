import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

const script = fileURLToPath(new URL('./health-report.mjs', import.meta.url))
const dirs = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const launch = { results: [{ id: 'a', area: 'HTTP', status: 'pass', title: 'Home page is 200' }] }
const dataset = { ok: true, private: true, enquiries: 'none-found' }
const blocker = {
  schema: 1,
  confirm: true,
  pages: ['https://example.com.au/'],
  summary: { blocker: 1, error: 0, warning: 0, suggestion: 0 },
  rules: {
    'seo.canonical-status': { title: 'The canonical link does not answer 200', anchor: 'x' },
  },
  blockers: [
    { ruleId: 'seo.canonical-status', url: 'https://example.com.au/about', confirmed: true },
  ],
  findings: [
    {
      ruleId: 'seo.canonical-status',
      severity: 'blocker',
      scope: { url: 'https://example.com.au/about' },
      fix: { summary: 'Point the canonical at this page.' },
    },
  ],
}

/** Runs `health-report.mjs result` the way the workflow does, on files in a temp folder. */
function run({ audit, attempted = true, mode = 'live' }) {
  const dir = mkdtempSync(join(tmpdir(), 'health-'))
  dirs.push(dir)
  const file = (name, value) => {
    const path = join(dir, name)
    writeFileSync(path, typeof value === 'string' ? value : JSON.stringify(value))
    return path
  }
  const output = file('output', '')
  const args = [
    script,
    'result',
    '--state=ready',
    `--mode=${mode}`,
    '--checks-ran=true',
    `--launch=${file('launch.json', launch)}`,
    `--dataset=${file('dataset.json', dataset)}`,
    ...(audit === undefined ? [] : [`--audit=${file('audit.json', audit)}`]),
    `--audit-attempted=${attempted}`,
    `--out=${join(dir, 'health-result.json')}`,
    `--issue=${join(dir, 'issue.md')}`,
  ]
  execFileSync(process.execPath, args, {
    env: {
      PATH: process.env.PATH,
      PRODUCTION_URL: 'https://example.com.au',
      GITHUB_OUTPUT: output,
    },
    stdio: 'pipe',
  })
  const read = (name) => {
    try {
      return readFileSync(join(dir, name), 'utf8')
    } catch {
      return null
    }
  }
  return {
    result: JSON.parse(read('health-result.json')),
    issue: read('issue.md'),
    outputs: Object.fromEntries(
      read('output')
        .split('\n')
        .filter((line) => /^[a-z_]+=/.test(line))
        .map((line) => line.split(/=(.*)/s).slice(0, 2)),
    ),
  }
}

describe('health-report result, as the workflow runs it', () => {
  it('fails on a confirmed audit blocker though every other check passes, and writes the issue', () => {
    const { result, issue, outputs } = run({ audit: blocker })
    expect(result.outcome).toBe('failed')
    expect(result.failures.map(({ id }) => id)).toEqual(['audit.seo.canonical-status'])
    expect(issue).toContain('**Page audit: The canonical link does not answer 200.** On `/about`.')
    expect(outputs).toMatchObject({ failed: 'true', checked: 'true', hold: 'false' })
  })

  it('is healthy, and may close an open issue, when the audit finds no confirmed blocker', () => {
    const { result, issue, outputs } = run({
      audit: { ...blocker, summary: { blocker: 0 }, blockers: [], findings: [] },
    })
    expect(result.outcome).toBe('healthy')
    expect(issue).toBeNull()
    expect(outputs).toMatchObject({ failed: 'false', hold: 'false' })
  })

  it('is a warning that holds an open issue when the audit step ran and left no file', () => {
    const { result, outputs } = run({ audit: undefined })
    expect(result.outcome).toBe('warning')
    expect(result.audit).toEqual({ state: 'unavailable' })
    expect(outputs).toMatchObject({ failed: 'false', checked: 'true', hold: 'true' })
  })

  it('is a warning that holds when the file is not JSON, as after a crash mid-write', () => {
    const { result, outputs } = run({ audit: '{"schema": 1, "findi' })
    expect(result.outcome).toBe('warning')
    expect(outputs.hold).toBe('true')
  })

  it('does not expect an audit of a workflow that did not try one, or of a pre-launch site', () => {
    expect(run({ audit: undefined, attempted: false }).result.outcome).toBe('healthy')
    const prelaunch = run({ audit: blocker, mode: 'prelaunch' })
    expect(prelaunch.result.audit).toEqual({ state: 'not-run' })
    expect(prelaunch.result.failures).toEqual([])
  })
})
