import { describe, expect, it } from 'vitest'

import { evaluateDataset } from './check-dataset.mjs'
import { buildReport, datasetFailures, launchFailures } from './health-report.mjs'

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
const base = { launch: passing, dataset: ok, enquiriesStore: false, url: 'https://example.com.au' }

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
    expect(datasetFailures({ ...ok, enquiriesStore: true })).toEqual({ lines: [], exposed: false })
  })

  it('fails a public dataset, and calls out stored enquiries when ENQUIRIES_STORE is 1', () => {
    const plain = datasetFailures({ exitCode: 1, output: publicOutput, enquiriesStore: false })
    expect(plain.exposed).toBe(false)
    expect(plain.lines).toHaveLength(1)
    expect(plain.lines[0]).toContain('PUBLIC')

    const stored = datasetFailures({ exitCode: 1, output: publicOutput, enquiriesStore: true })
    expect(stored.exposed).toBe(true)
    expect(stored.lines[0]).toContain('enquiries are exposed')
    expect(stored.lines).toHaveLength(2)
  })

  it('does not call a refused token an exposure', () => {
    const result = datasetFailures({
      exitCode: 1,
      output: '✗ The Sanity API refused the token (HTTP 401)',
      enquiriesStore: true,
    })
    expect(result.exposed).toBe(false)
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
