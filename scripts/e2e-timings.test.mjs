import { describe, expect, it } from 'vitest'

import {
  readReport,
  renderSummary,
  slimReport,
  summariseJobs,
  summariseReport,
} from './e2e-timings.mjs'

const result = (startTime, duration) => ({ startTime, duration })
const report = (stats, specs) => ({
  stats,
  suites: [{ file: 'a.spec.ts', specs, suites: [] }],
})
const spec = (title, tests, file = 'tests/e2e/a.spec.ts') => ({ title, file, tests })

const SAMPLE = report({ startTime: '2026-01-01T00:00:00.000Z', duration: 100_000 }, [
  spec('fast', [
    {
      projectName: 'desktop',
      status: 'expected',
      results: [result('2026-01-01T00:01:00.000Z', 1000)],
    },
    { projectName: 'mobile', status: 'skipped', results: [result('2026-01-01T00:01:01.000Z', 0)] },
  ]),
  spec('retried', [
    {
      projectName: 'desktop',
      status: 'flaky',
      results: [
        result('2026-01-01T00:01:05.000Z', 30_000),
        result('2026-01-01T00:01:36.000Z', 2000),
      ],
    },
  ]),
  spec('broken', [
    {
      projectName: 'mobile',
      status: 'unexpected',
      results: [result('2026-01-01T00:01:10.000Z', 500)],
    },
  ]),
])

describe('readReport', () => {
  it('gives one row per test, summing the attempts of a retried one', () => {
    const tests = readReport(SAMPLE)
    expect(tests).toHaveLength(4)
    expect(tests.find((test) => test.title === 'retried')).toMatchObject({
      file: 'a.spec.ts',
      ms: 32_000,
      attempts: 2,
    })
  })
})

describe('summariseReport', () => {
  const summary = summariseReport('shard-1', SAMPLE)

  it('measures the time before the first test as build and server startup', () => {
    expect(summary.startupMs).toBe(60_000)
    expect(summary.wallMs).toBe(100_000)
  })

  it('counts what ran, what skipped, and what failed or needed a retry', () => {
    expect(summary).toMatchObject({ tests: 4, ran: 3, skipped: 1, retried: 1 })
    expect(summary.failed.map((test) => test.title)).toEqual(['broken'])
    expect(summary.flaky.map((test) => test.title)).toEqual(['retried'])
  })

  it('lists the slowest test first and ignores skipped ones', () => {
    expect(summary.slowest[0].title).toBe('retried')
    expect(summary.slowest.map((test) => test.title)).not.toContain('')
    expect(summary.specs[0]).toMatchObject({ key: 'a.spec.ts (desktop)', tests: 2 })
  })

  it('has no startup figure for a run with no tests', () => {
    const empty = summariseReport('x', {
      stats: { startTime: '2026-01-01T00:00:00.000Z', duration: 5 },
      suites: [],
    })
    expect(empty.startupMs).toBeNull()
  })
})

describe('renderSummary', () => {
  it('marks the slowest job and lists failures and retries', () => {
    const slow = summariseReport('shard-2', {
      ...SAMPLE,
      stats: { ...SAMPLE.stats, duration: 200_000 },
    })
    const text = renderSummary([summariseReport('shard-1', SAMPLE), slow])
    expect(text).toContain('**shard-2** (slowest)')
    expect(text).toContain('flaky (passed on retry)')
    expect(text).toContain('a.spec.ts (mobile): broken')
  })

  it('says so when no reports arrived', () => {
    expect(renderSummary([])).toContain('No Playwright reports')
  })
})

describe('summariseJobs', () => {
  it('turns timestamps into seconds', () => {
    const [job] = summariseJobs({
      jobs: [
        {
          name: 'e2e (1/4)',
          conclusion: 'success',
          started_at: '2026-01-01T00:00:00Z',
          completed_at: '2026-01-01T00:10:30Z',
          steps: [
            {
              name: 'End-to-end tests',
              started_at: '2026-01-01T00:02:00Z',
              completed_at: '2026-01-01T00:08:00Z',
            },
          ],
        },
      ],
    })
    expect(job.seconds).toBe(630)
    expect(job.steps[0].seconds).toBe(360)
  })
})

describe('missing measurements are not zero', () => {
  it('reports n/a for a run with no duration, no tests, or no startTime', () => {
    const summary = summariseReport('x', { suites: [] })
    expect(summary).toMatchObject({
      wallMs: null,
      startupMs: null,
      testPhaseMs: null,
      workerMs: null,
    })
    const text = renderSummary([summary])
    expect(text).toContain('n/a')
    expect(text).not.toContain('(slowest)')
  })

  it('keeps a genuinely instant test as 0 and an unmeasured one as null', () => {
    const report = {
      stats: { startTime: '2026-01-01T00:00:00.000Z', duration: 10 },
      suites: [
        {
          specs: [
            {
              title: 'instant',
              file: 'a.spec.ts',
              tests: [
                {
                  projectName: 'desktop',
                  status: 'expected',
                  results: [{ startTime: '2026-01-01T00:00:01.000Z', duration: 0 }],
                },
                {
                  projectName: 'desktop',
                  status: 'expected',
                  results: [{ startTime: '2026-01-01T00:00:01.000Z' }],
                },
              ],
            },
          ],
        },
      ],
    }
    const tests = readReport(report)
    expect(tests.map((test) => test.ms)).toEqual([0, null])
    const summary = summariseReport('x', report)
    expect(summary).toMatchObject({ ran: 2, unmeasured: 1, workerMs: 0 })
  })

  it('names the reports that never arrived', () => {
    const text = renderSummary([summariseReport('shard-1', SAMPLE)], [], ['shard-1', 'shard-2'])
    expect(text).toContain('Missing reports (no timings, not zero):** shard-2')
  })
})

describe('slimReport', () => {
  it('keeps the timings and drops config, errors, output and attachments', () => {
    const full = {
      ...SAMPLE,
      config: {
        workers: 2,
        shard: { current: 1, total: 4 },
        webServer: { env: { TOKEN: 'secret' } },
      },
      errors: [{ message: 'secret in an error' }],
      suites: [
        {
          file: 'a.spec.ts',
          specs: [
            spec('t', [
              {
                projectName: 'desktop',
                status: 'unexpected',
                results: [
                  {
                    ...result('2026-01-01T00:01:00.000Z', 5),
                    error: { message: 'Bearer abc' },
                    stdout: [{ text: 'password=hunter2' }],
                    attachments: [{ path: 'C:/Users/x/trace.zip' }],
                  },
                ],
              },
            ]),
          ],
        },
      ],
    }
    const slim = slimReport(full)
    expect(JSON.stringify(slim)).not.toMatch(/secret|Bearer|hunter2|trace\.zip|webServer/)
    expect(summariseReport('a', slim)).toMatchObject({ wallMs: 100_000, ran: 1, workerMs: 5 })
    expect(slim.workers).toBe(2)
  })
})
