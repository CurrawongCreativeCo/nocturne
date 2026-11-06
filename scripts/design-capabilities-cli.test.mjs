import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

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
