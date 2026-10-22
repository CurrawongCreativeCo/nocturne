import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

import { describe, expect, it } from 'vitest'

const requireCli = createRequire(import.meta.resolve('@lhci/cli/package.json'))
const { getAllAssertionResults } = requireCli('@lhci/utils/src/assertions.js')
const { ci } = JSON.parse(readFileSync(new URL('../lighthouserc.json', import.meta.url), 'utf8'))

const report = (url, score = 0.95, lcp = 1000, cls = 0, accessibility = 1) => ({
  requestedUrl: url,
  finalUrl: url,
  categories: { performance: { score }, accessibility: { score: accessibility } },
  audits: {
    'largest-contentful-paint': { score: 1, numericValue: lcp },
    'cumulative-layout-shift': { score: 1, numericValue: cls },
  },
})

describe('Lighthouse budgets', () => {
  for (const url of ci.collect.url) {
    it(`enforces the score, LCP and CLS budgets on ${url}`, () => {
      const good = getAllAssertionResults({ ...ci.assert, includePassedAssertions: true }, [
        report(url),
      ])
      expect(good).toHaveLength(4)
      expect(good.every((result) => result.passed)).toBe(true)
      const bad = getAllAssertionResults(ci.assert, [report(url, 0.5, 10000, 1)])
      expect(bad.filter((result) => !result.passed)).toHaveLength(3)
      const inaccessible = getAllAssertionResults(ci.assert, [report(url, 0.95, 1000, 0, 0.99)])
      expect(inaccessible.filter((result) => !result.passed)).toHaveLength(1)
      const mostlyBad = getAllAssertionResults(ci.assert, [
        report(url),
        report(url, 0.5, 10000, 1),
        report(url, 0.5, 10000, 1),
      ])
      expect(mostlyBad.filter((result) => !result.passed)).toHaveLength(3)
    })
  }
})
