import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  compareFindings,
  countBySeverity,
  isRuleId,
  makeFinding,
  RULE_IDS,
  RULES,
  ruleAnchor,
  sortFindings,
  type Finding,
} from './finding'

const finding = (severity: Finding['severity'], basis: Finding['basis'], tag: string): Finding => ({
  ...makeFinding({
    ruleId: 'seo.status',
    severity,
    basis,
    scope: { kind: 'page', url: `https://example.com.au/${tag}` },
    observed: tag,
    source: 'html',
    at: '2026-11-01T00:00:00.000Z',
    why: 'Because.',
    fix: { summary: 'Fix it.' },
  }),
})

describe('ordering (E2 §6)', () => {
  it('puts blockers first, then errors, warnings and suggestions', () => {
    const sorted = sortFindings([
      finding('suggestion', 'deterministic', 'd'),
      finding('error', 'deterministic', 'b'),
      finding('blocker', 'deterministic', 'a'),
      finding('warning', 'deterministic', 'c'),
    ])
    expect(sorted.map((f) => f.evidence.observed)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('then puts deterministic before heuristic before judgement', () => {
    const sorted = sortFindings([
      finding('warning', 'judgement', 'c'),
      finding('warning', 'heuristic', 'b'),
      finding('warning', 'deterministic', 'a'),
    ])
    expect(sorted.map((f) => f.basis)).toEqual(['deterministic', 'heuristic', 'judgement'])
  })

  it('lets severity outrank basis', () => {
    expect(
      compareFindings(finding('error', 'judgement', 'x'), finding('warning', 'deterministic', 'y')),
    ).toBeLessThan(0)
  })

  it('keeps arrival order among equals, and does not change its input', () => {
    const input = [
      finding('error', 'deterministic', '1'),
      finding('error', 'deterministic', '2'),
      finding('error', 'deterministic', '3'),
    ]
    expect(sortFindings(input).map((f) => f.evidence.observed)).toEqual(['1', '2', '3'])
    expect(input.map((f) => f.evidence.observed)).toEqual(['1', '2', '3'])
  })

  it('counts by severity', () => {
    expect(
      countBySeverity([finding('error', 'deterministic', 'a'), finding('error', 'heuristic', 'b')]),
    ).toEqual({ blocker: 0, error: 2, warning: 0, suggestion: 0 })
  })
})

describe('makeFinding', () => {
  it('defaults the basis, leaves out empty caveats and says how to re-check', () => {
    const made = makeFinding({
      ruleId: 'seo.noindex',
      severity: 'blocker',
      scope: { kind: 'page', url: 'https://example.com.au/a' },
      observed: { robotsMeta: 'noindex' },
      source: 'html',
      at: 'now',
      caveats: [],
      why: 'Because.',
      fix: { summary: 'Fix.' },
    })
    expect(made.basis).toBe('deterministic')
    expect(made.evidence).toEqual({
      observed: { robotsMeta: 'noindex' },
      source: 'html',
      at: 'now',
    })
    expect(made.verify).toBe('npm run audit:page -- https://example.com.au/a')
  })
})

describe('the rule registry', () => {
  it('gives every rule a title and a README anchor, and ids never repeat', () => {
    expect(new Set(RULE_IDS).size).toBe(RULE_IDS.length)
    for (const id of RULE_IDS) {
      expect(RULES[id].title, id).toMatch(/\S/)
      expect(RULES[id].anchor).toBe(ruleAnchor(id))
      expect(id).toMatch(/^[a-z0-9]+\.[a-z0-9-]+$/)
    }
  })

  it('has an anchor in the README for every rule', () => {
    const readme = readFileSync(new URL('../../../README.md', import.meta.url), 'utf8')
    for (const id of RULE_IDS) {
      expect(
        readme.includes(`<a id="${RULES[id].anchor}"></a>`),
        `README is missing <a id="${RULES[id].anchor}"></a>`,
      ).toBe(true)
    }
  })

  it('recognises its own ids only', () => {
    expect(isRuleId('seo.title-duplicate')).toBe(true)
    expect(isRuleId('seo.made-up')).toBe(false)
  })
})
