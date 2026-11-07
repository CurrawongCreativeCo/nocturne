import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { missingBaseOutcome } from './capability-base-utils.mjs'

const root = join(import.meta.dirname, '..')
const dir = mkdtempSync(join(tmpdir(), 'capability-baseline-'))
const file = join(dir, 'baseline.json')
const run = (...args) =>
  spawnSync('node', ['scripts/design-capabilities.mjs', '--baseline', file, ...args], {
    cwd: root,
    encoding: 'utf8',
  })

afterAll(() => rmSync(dir, { recursive: true, force: true }))

describe('npm run design-capabilities', () => {
  it('writes the first baseline once, and refuses to write it again', () => {
    expect(run('--init-baseline').status).toBe(0)
    const again = run('--init-baseline')
    expect(again.status).toBe(1)
    expect(again.stderr).toMatch(/only shrinks/)
    expect(run().status).toBe(0)
  }, 60_000)

  it('refuses to add a gap, and removes a closed one', () => {
    const baseline = JSON.parse(readFileSync(file, 'utf8'))
    // A gap missing from the baseline: the check fails, and update refuses to add it.
    writeFileSync(file, JSON.stringify({ ...baseline, required: baseline.required.slice(1) }))
    expect(run().status).toBe(1)
    const refused = run('--update-baseline')
    expect(refused.status).toBe(1)
    expect(refused.stderr).toMatch(/isn't in the baseline/)
    // A closed gap left in it: the check fails, and update removes it.
    // The hero's edge is verified, so listing it is a closed gap.
    const extra = {
      component: 'hero',
      capability: 'edge',
      scope: 'section',
      layouts: ['overlay'],
      closingTask: 151,
    }
    writeFileSync(file, JSON.stringify({ ...baseline, required: [...baseline.required, extra] }))
    expect(run().status).toBe(1)
    expect(run('--update-baseline').status).toBe(0)
    expect(JSON.parse(readFileSync(file, 'utf8')).required).toHaveLength(baseline.required.length)
  }, 120_000)
})

describe('npm run design-capabilities, against the base commit', () => {
  const base = join(dir, 'base.json')
  const head = join(dir, 'head.json')
  const against = (...args) => {
    const result = spawnSync(
      'node',
      ['scripts/design-capabilities.mjs', '--baseline', head, ...args],
      { cwd: root, encoding: 'utf8' },
    )
    return result
  }

  it('passes when the baseline is the same as the base commit’s', () => {
    // The first describe leaves the file as it is today; make sure of it.
    expect(run('--update-baseline').status).toBe(0)
    const current = readFileSync(file, 'utf8')
    writeFileSync(head, current)
    writeFileSync(base, current)
    expect(against('--against-file', base).status).toBe(0)
  }, 60_000)

  it('fails a gap that is in the baseline now and wasn’t on the base commit', () => {
    const baseline = JSON.parse(readFileSync(head, 'utf8'))
    // The base lacks one pair, as if the head had added it by hand: it equals what is pending today,
    // so only the comparison with the base can see it.
    writeFileSync(base, JSON.stringify({ ...baseline, required: baseline.required.slice(1) }))
    const result = against('--against-file', base)
    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(
      /is in the baseline now and wasn't on the base commit, and no admit row covers it/,
    )
  }, 60_000)

  it('fails a gap that is gone from the baseline and still pending', () => {
    const baseline = JSON.parse(readFileSync(head, 'utf8'))
    const [dropped] = baseline.required
    // The base lists every gap; the head dropped one by hand, though it is still pending.
    writeFileSync(base, JSON.stringify(baseline))
    writeFileSync(head, JSON.stringify({ ...baseline, required: baseline.required.slice(1) }))
    try {
      const result = against('--against-file', base)
      expect(result.status).toBe(1)
      // The static ratchet already notices that a pending pair isn't listed; the comparison names the
      // pair as removed from the base.
      expect(result.stderr).toContain(dropped.component)
    } finally {
      writeFileSync(head, JSON.stringify(baseline))
    }
  }, 60_000)

  it('fails when the base has no baseline: the template always has one', () => {
    const result = against('--against-file', join(dir, 'does-not-exist.json'))
    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/There is no baseline to compare with/)
  }, 60_000)

  it('refuses the bootstrap flag in the template', () => {
    const result = against(
      '--against-file',
      join(dir, 'does-not-exist.json'),
      '--allow-missing-base',
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/older client repositories only, and this is the template/)
  }, 60_000)

  it('fails when git can’t give the base, rather than skipping the comparison', () => {
    const result = against('--against-ref', 'no-such-ref-for-this-test')
    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/The base baseline couldn't be read/)
  }, 60_000)

  it('fails a missing --against-file path or ref argument', () => {
    expect(against('--against-ref').status).toBe(1)
  }, 60_000)
})

describe('the bootstrap exception for a missing base baseline', () => {
  const missing = 'capability-baseline.json isn’t in abc123'
  it('fails by default, whatever the repository', () => {
    for (const template of [true, false]) {
      const outcome = missingBaseOutcome({ missing, allowed: false, template })
      expect(outcome.problem?.message).toContain('There is no baseline to compare with')
      expect(outcome.notice).toBeUndefined()
    }
  })

  it('is refused in the template, even when asked for', () => {
    const outcome = missingBaseOutcome({ missing, allowed: true, template: true })
    expect(outcome.problem?.message).toMatch(/older client repositories only/)
  })

  it('is allowed in an older client repository, with a notice that says to remove it', () => {
    const outcome = missingBaseOutcome({ missing, allowed: true, template: false })
    expect(outcome.problem).toBeUndefined()
    expect(outcome.notice).toMatch(/Remove the flag once this pull request has merged/)
  })
})
