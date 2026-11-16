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
import { gunzipSync } from 'node:zlib'

import { describe, expect, it } from 'vitest'

import { assessCapture, describe as describeResult } from './e2e-capture-validity.mjs'

/**
 * The capture-validity check (scripts/e2e-capture-validity.mjs) and the way the manual capture workflow uses it: lake
 * traffic with no matching client request record is incomplete instrumentation and stops the capture before further
 * projects, and a project's test status and the diagnostics' validity are recorded and returned separately.
 */

const root = join(fileURLToPath(import.meta.url), '..', '..')
const evidence = join(root, 'tests', 'e2e', 'diagnostics', 'evidence', 'capture-43785202190')
const line = (record) => `[WebServer] [e2e-diag] ${JSON.stringify({ at: 'x', pid: 1, ...record })}`
const DATA = '/v2026-10-01/data/query/production?returnQuery=false'
const lake = (n, path = DATA) =>
  Array.from({ length: n }, () => line({ source: 'lake', event: 'request', path }))
const fixtures = (n) => lake(n, '/__fixture/picture.png')
const BUILD = 'phase-production-build'

/** `n` client fetches, each with its socket record, from one process in the given Next phase. */
const fetches = (n, { phase = BUILD, pid = 7, from = 1, headers = true } = {}) =>
  Array.from({ length: n }, (_, i) => {
    const base = { source: 'client', pid, thread: 'main', phase, reqSeq: from + i }
    return [
      line({ ...base, event: 'fetch-request', path: DATA }),
      line({ ...base, event: 'fetch-socket', socketId: 1 }),
      ...(headers ? [line({ ...base, event: 'fetch-headers', status: 200 })] : []),
    ].join('\n')
  })
const preload = (phase = BUILD, pid = 7) =>
  line({ source: 'client', pid, thread: 'main', event: 'preload', phase })

describe('assessCapture', () => {
  it('calls lake data traffic with no client request record incomplete instrumentation', () => {
    const result = assessCapture([...lake(3), preload()].join('\n'))
    expect(result.status).toBe('incomplete')
    expect(result.reasons).toContain('no-client-requests')
    expect(result.counts).toMatchObject({ lakeDataRequests: 3, clientDataRequests: 0 })
    expect(describeResult(result, 'design')).toMatch(/INCOMPLETE INSTRUMENTATION/)
  })

  it('is valid when the client recorded the lake’s data requests, from production-build processes, with their sockets', () => {
    const result = assessCapture([...lake(3), ...fetches(3)].join('\n'))
    expect(result).toMatchObject({ status: 'valid', reasons: [] })
    expect(result.counts).toMatchObject({
      lakeDataRequests: 3,
      clientFetchRequests: 3,
      productionBuildFetchRequests: 3,
    })
    expect(result.coverage).toBe(1)
  })

  it('counts fixture-control traffic out of the lake’s side', () => {
    // 3 data requests and 40 fixture-control ones: the client's 3 cover the data requests.
    const result = assessCapture([...lake(3), ...fixtures(40), ...fetches(3)].join('\n'))
    expect(result.status).toBe('valid')
    expect(result.counts).toMatchObject({ lakeDataRequests: 3, lakeFixtureRequests: 40 })
  })

  it('takes node:http client records as client requests too, but not as evidence of production-build fetches', () => {
    const http = Array.from({ length: 3 }, () =>
      line({ source: 'client', pid: 8, event: 'request-created', path: DATA }),
    )
    const result = assessCapture([...lake(3), ...http].join('\n'))
    expect(result.counts).toMatchObject({ clientDataRequests: 3, clientFetchRequests: 0 })
    expect(result.reasons).toContain('no-production-build-fetch')
    expect(result.reasons).not.toContain('no-client-requests')
  })

  it('calls partial coverage incomplete: a few client records among many lake requests do not cover them', () => {
    const result = assessCapture([...lake(100), ...fetches(10)].join('\n'))
    expect(result.status).toBe('incomplete')
    expect(result.reasons).toEqual(['partial-coverage'])
    expect(result.coverage).toBeCloseTo(0.1, 5)
    // The threshold is a parameter, and the figure is a coverage check, not proof that every request was seen.
    expect(
      assessCapture([...lake(100), ...fetches(10)].join('\n'), { minCoverage: 0.05 }).status,
    ).toBe('valid')
    expect(describeResult(result)).toMatch(/coverage check/i)
    expect(describeResult(result)).toMatch(/not proof/i)
  })

  it('wants fetch requests from production-build processes, not only from other processes', () => {
    const result = assessCapture([...lake(3), ...fetches(3, { phase: null })].join('\n'))
    expect(result.reasons).toEqual(['no-production-build-fetch'])
    expect(result.status).toBe('incomplete')
    // The phase can also come from the process's own preload line.
    const viaPreload = assessCapture(
      [...lake(3), preload(BUILD, 9), ...fetches(3, { phase: undefined, pid: 9 })].join('\n'),
    )
    expect(viaPreload.status).toBe('valid')
  })

  it('wants each response-header record to have its request and socket records', () => {
    const orphan = line({
      source: 'client',
      pid: 7,
      thread: 'main',
      event: 'fetch-headers',
      reqSeq: 99,
      status: 200,
    })
    const noSocket = [
      line({
        source: 'client',
        pid: 7,
        thread: 'main',
        phase: BUILD,
        event: 'fetch-request',
        reqSeq: 50,
        path: DATA,
      }),
      line({
        source: 'client',
        pid: 7,
        thread: 'main',
        event: 'fetch-headers',
        reqSeq: 50,
        status: 200,
      }),
    ]
    const withOrphan = assessCapture([...lake(3), ...fetches(3), orphan].join('\n'))
    expect(withOrphan.reasons).toEqual(['unmatched-response-headers'])
    expect(withOrphan.counts).toMatchObject({ headersWithoutRequest: 1 })
    const withoutSocket = assessCapture([...lake(3), ...fetches(3), ...noSocket].join('\n'))
    expect(withoutSocket.counts).toMatchObject({ headersWithoutSocket: 1 })
    expect(withoutSocket.status).toBe('incomplete')
  })

  it('treats an exhausted logging budget as truncated evidence', () => {
    const truncated = assessCapture(
      [...lake(3), ...fetches(3), line({ source: 'client', pid: 9, event: 'limit-reached' })].join(
        '\n',
      ),
    )
    expect(truncated.status).toBe('truncated')
    expect(truncated.reasons).toEqual(['truncated'])
    expect(truncated.counts.budgetExhausted).toEqual([{ source: 'client', pid: 9 }])
    // Truncation alongside another problem is still incomplete instrumentation.
    const both = assessCapture(
      [...lake(3), line({ source: 'lake', pid: 2, event: 'limit-reached' })].join('\n'),
    )
    expect(both.status).toBe('incomplete')
    expect(both.reasons).toEqual(expect.arrayContaining(['no-client-requests', 'truncated']))
  })

  it('is not a failure of the diagnostics when the lake served no data requests', () => {
    expect(assessCapture(fetches(2).join('\n'))).toMatchObject({
      status: 'no-lake-traffic',
      reasons: [],
    })
    expect(assessCapture('')).toMatchObject({ status: 'no-lake-traffic' })
    expect(assessCapture(fixtures(5).join('\n')).status).toBe('no-lake-traffic')
  })

  it('ignores other lines, other events and malformed records', () => {
    const text = [
      'plain output',
      '[WebServer] [e2e-diag] {not json',
      line({ source: 'lake', event: 'connection-open' }),
      line({ source: 'client', event: 'response' }),
      ...lake(1),
      ...fetches(1),
    ].join('\n')
    expect(assessCapture(text).status).toBe('valid')
  })

  it('is what the command line says, with the exit codes the workflow reads', () => {
    const dir = mkdtempSync(join(tmpdir(), 'validity-'))
    const script = join(root, 'scripts', 'e2e-capture-validity.mjs')
    const file = (name, lines) => {
      const path = join(dir, name)
      writeFileSync(path, lines.join('\n'))
      return path
    }
    const run = (args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' })
    const incomplete = run([file('bad.log', lake(2)), '--project', 'design'])
    expect(incomplete.status).toBe(70)
    expect(incomplete.stdout).toMatch(/project=design status=incomplete/)
    expect(run([file('good.log', [...lake(2), ...fetches(2)])]).status).toBe(0)
    const truncated = run([
      file('trunc.log', [
        ...lake(2),
        ...fetches(2),
        line({ source: 'lake', pid: 3, event: 'limit-reached' }),
      ]),
    ])
    expect(truncated.status).toBe(71)
    expect(truncated.stdout).toMatch(/status=truncated/)
    expect(
      run([file('half.log', [...lake(100), ...fetches(10)]), '--min-coverage', '0.05']).status,
    ).toBe(0)
    expect(run([]).status).toBe(2)
  })
})

/**
 * The preserved first capture (run 43785202190): the lake served 1,855 data requests and 287 fixture-control ones, and no
 * client request was recorded. It is the case the check exists for, and with one client request added it must still be
 * called incomplete: one record among 1,855 is not coverage.
 */
describe('the preserved capture', () => {
  const capture = gunzipSync(
    readFileSync(join(evidence, '..', 'capture-43785202190', 'playwright.log.gz')),
  ).toString('utf8')

  it('is incomplete instrumentation: lake data traffic and no client request records', () => {
    const result = assessCapture(capture)
    expect(result.status).toBe('incomplete')
    expect(result.reasons).toEqual(
      expect.arrayContaining(['no-client-requests', 'no-production-build-fetch']),
    )
    expect(result.counts).toMatchObject({
      lakeDataRequests: 1855,
      lakeFixtureRequests: 287,
      clientDataRequests: 0,
      clientFetchRequests: 0,
    })
    expect(result.counts.budgetExhausted).toEqual([])
  })

  it('is still incomplete with one synthetic client request added, now for partial coverage', () => {
    const synthetic = fetches(1).join('\n')
    const result = assessCapture(`${capture}\n${synthetic}`)
    expect(result.status).toBe('incomplete')
    expect(result.reasons).toContain('partial-coverage')
    expect(result.reasons).not.toContain('no-client-requests')
    expect(result.reasons).not.toContain('no-production-build-fetch')
    expect(result.counts).toMatchObject({ lakeDataRequests: 1855, clientDataRequests: 1 })
    expect(result.coverage).toBeCloseTo(1 / 1855, 6)
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
const data = '/v2026-10-01/data/query/production?returnQuery=false'
for (let i = 0; i < (plan.lake ?? 1); i++) console.log(rec({ source: 'lake', event: 'request', path: data }))
for (let i = 0; i < (plan.client ?? 1); i++) {
  const base = { source: 'client', pid: 7, thread: 'main', phase: 'phase-production-build', reqSeq: i + 1 }
  console.log(rec({ ...base, event: 'fetch-request', path: data }))
  console.log(rec({ ...base, event: 'fetch-socket', socketId: 1 }))
}
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
      /project=design status=incomplete reasons=no-client-requests,no-production-build-fetch lake_data_requests=4 .*client_data_requests=0/,
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
