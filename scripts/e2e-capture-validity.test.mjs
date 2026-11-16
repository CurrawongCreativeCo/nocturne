import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { assessCapture, describe as describeResult } from './e2e-capture-validity.mjs'

/**
 * The capture-validity check (scripts/e2e-capture-validity.mjs) and the way the manual capture workflow uses it: lake
 * traffic with no matching client request record is incomplete instrumentation and stops the capture before further
 * projects, and a project's test status and the diagnostics' validity are recorded and returned separately.
 */

const root = join(fileURLToPath(import.meta.url), '..', '..')
const line = (record) => `[WebServer] [e2e-diag] ${JSON.stringify({ at: 'x', pid: 1, ...record })}`
const lake = (n) => Array.from({ length: n }, () => line({ source: 'lake', event: 'request' }))
const client = (n, event = 'fetch-request') =>
  Array.from({ length: n }, () => line({ source: 'client', event }))

describe('assessCapture', () => {
  it('calls lake traffic with no client request record incomplete instrumentation', () => {
    const result = assessCapture(
      [...lake(3), line({ source: 'client', event: 'preload' })].join('\n'),
    )
    expect(result).toMatchObject({ status: 'incomplete', lakeRequests: 3, clientRequests: 0 })
    expect(describeResult(result, 'design')).toMatch(/INCOMPLETE INSTRUMENTATION/)
  })

  it('is valid once the client has recorded requests, by fetch or by node:http', () => {
    expect(assessCapture([...lake(3), ...client(2)].join('\n')).status).toBe('valid')
    expect(assessCapture([...lake(3), ...client(1, 'request-created')].join('\n')).status).toBe(
      'valid',
    )
  })

  it('is not a failure of the diagnostics when the lake served nothing', () => {
    expect(assessCapture(client(2).join('\n'))).toMatchObject({ status: 'no-lake-traffic' })
    expect(assessCapture('')).toMatchObject({ status: 'no-lake-traffic' })
  })

  it('ignores other lines, other events and malformed records, and reports exhausted budgets', () => {
    const text = [
      'plain output',
      '[WebServer] [e2e-diag] {not json',
      line({ source: 'lake', event: 'connection-open' }),
      line({ source: 'client', event: 'response' }),
      line({ source: 'client', pid: 9, event: 'limit-reached' }),
      ...lake(1),
      ...client(1),
    ].join('\n')
    expect(assessCapture(text)).toEqual({
      status: 'valid',
      lakeRequests: 1,
      clientRequests: 1,
      budgetExhausted: [{ source: 'client', pid: 9 }],
    })
  })

  it('is what the command line says, with the exit code the workflow reads', () => {
    const dir = mkdtempSync(join(tmpdir(), 'validity-'))
    const script = join(root, 'scripts', 'e2e-capture-validity.mjs')
    const bad = join(dir, 'bad.log')
    const good = join(dir, 'good.log')
    writeFileSync(bad, lake(2).join('\n'))
    writeFileSync(good, [...lake(2), ...client(2)].join('\n'))
    const failed = spawnSync(process.execPath, [script, bad, '--project', 'design'], {
      encoding: 'utf8',
    })
    expect(failed.status).toBe(70)
    expect(failed.stdout).toMatch(/project=design status=incomplete/)
    const passed = spawnSync(process.execPath, [script, good], { encoding: 'utf8' })
    expect(passed.status).toBe(0)
    expect(spawnSync(process.execPath, [script], { encoding: 'utf8' }).status).toBe(2)
  })
})

describe('the workflow’s capture step', () => {
  /** The step's own script, as the workflow file has it. */
  const workflow = readFileSync(join(root, '.github', 'workflows', 'e2e-lake-capture.yml'), 'utf8')
  const lines = workflow.split('\n')
  const start = lines.findIndex((l) =>
    l.includes('- name: Run the isolated projects with diagnostics'),
  )
  const runAt = lines.findIndex((l, i) => i > start && l.trim() === 'run: |')
  const indent = lines[runAt + 1].match(/^ */)[0].length
  const body = []
  for (const l of lines.slice(runAt + 1)) {
    if (l.trim() !== '' && l.match(/^ */)[0].length < indent) break
    body.push(l.slice(indent))
  }
  const script = body.join('\n')
  const PROJECTS = [
    'experiments',
    'design',
    'design-visual',
    'panel-palettes',
    'nav-submenus',
    'blog-card-design',
    'button-style',
    'footer-divider',
    'team-divider',
  ]

  /**
   * Runs it in a scratch directory with a stand-in `npx`: each project prints what `plan` says (lake and client request
   * records, an exit code), and the stand-in records which projects ran.
   */
  function execute(plan) {
    const dir = mkdtempSync(join(tmpdir(), 'capture-'))
    mkdirSync(join(dir, 'scripts'))
    mkdirSync(join(dir, 'bin'))
    copyFileSync(
      join(root, 'scripts', 'e2e-capture-validity.mjs'),
      join(dir, 'scripts', 'e2e-capture-validity.mjs'),
    )
    writeFileSync(join(dir, 'plan.json'), JSON.stringify(plan))
    writeFileSync(
      join(dir, 'bin', 'npx'),
      `#!/usr/bin/env node
const fs = require('node:fs')
const project = process.argv.find((a) => a.startsWith('--project=')).slice(10)
fs.appendFileSync('ran.txt', project + '\\n')
const plan = JSON.parse(fs.readFileSync('plan.json', 'utf8'))[project] ?? {}
const rec = (record) => '[WebServer] [e2e-diag] ' + JSON.stringify({ at: 'x', pid: 1, ...record })
for (let i = 0; i < (plan.lake ?? 1); i++) console.log(rec({ source: 'lake', event: 'request' }))
for (let i = 0; i < (plan.client ?? 1); i++) console.log(rec({ source: 'client', event: 'fetch-request' }))
console.log('ordinary output of ' + project)
process.exit(plan.exit ?? 0)
`,
    )
    chmodSync(join(dir, 'bin', 'npx'), 0o755)
    const result = spawnSync('bash', ['-c', script], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}` },
    })
    const read = (name) => {
      try {
        return readFileSync(join(dir, name), 'utf8')
      } catch {
        return ''
      }
    }
    return {
      status: result.status,
      ran: read('ran.txt').split('\n').filter(Boolean),
      tests: read('e2e-capture/exit-status.txt'),
      validity: read('e2e-capture/diagnostics-validity.txt'),
      log: read('e2e-capture/playwright.log'),
    }
  }

  it('is the step the check is wired into (extraction sanity)', () => {
    expect(script).toContain('e2e-capture-validity.mjs')
    expect(script).toContain('PIPESTATUS')
    for (const project of PROJECTS) expect(script).toContain(project)
  })

  it('runs every project and passes when tests pass and the diagnostics saw the lake’s traffic', () => {
    const out = execute({})
    expect(out.status).toBe(0)
    expect(out.ran).toEqual(PROJECTS)
    expect(out.tests).toContain('team-divider exit=0')
    expect(out.tests).toContain('tests overall exit=0')
    expect(out.validity).toContain('diagnostics overall exit=0')
    expect(out.log).toContain('ordinary output of experiments')
  })

  it('stops before further projects on incomplete instrumentation, with passing tests recorded apart from it', () => {
    const out = execute({ design: { lake: 4, client: 0 } })
    expect(out.ran).toEqual(['experiments', 'design'])
    // The tests passed, and say so; the diagnostics did not, and say so; the step does not pass.
    expect(out.tests).toContain('design exit=0')
    expect(out.tests).toContain('tests overall exit=0')
    expect(out.validity).toMatch(
      /project=design status=incomplete lake_requests=4 client_request_records=0/,
    )
    expect(out.validity).toContain('diagnostics overall exit=70')
    expect(out.status).toBe(70)
  })

  it('returns a failing test’s own exit status, whatever the diagnostics say', () => {
    const failing = execute({ 'design-visual': { exit: 7 } })
    expect(failing.status).toBe(7)
    expect(failing.ran).toEqual(['experiments', 'design', 'design-visual'])
    expect(failing.tests).toContain('design-visual exit=7')
    expect(failing.tests).toContain('tests overall exit=7')
    expect(failing.validity).toContain('diagnostics overall exit=0')
    // A test failure with incomplete instrumentation: the test's status is the step's, the invalidity is still recorded.
    const both = execute({ design: { exit: 2, lake: 3, client: 0 } })
    expect(both.status).toBe(2)
    expect(both.ran).toEqual(['experiments', 'design'])
    expect(both.tests).toContain('tests overall exit=2')
    expect(both.validity).toContain('diagnostics overall exit=70')
  })

  it('treats a project the lake served nothing for as not a failure of the diagnostics', () => {
    const out = execute({ design: { lake: 0, client: 0 } })
    expect(out.status).toBe(0)
    expect(out.ran).toEqual(PROJECTS)
    expect(out.validity).toMatch(/project=design status=no-lake-traffic/)
  })
})
