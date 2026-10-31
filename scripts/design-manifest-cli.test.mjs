import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const script = join(root, 'scripts/build-design-manifest.mjs')
// Synchronous, so each child has exited before the next line runs; the timeout kills one that hangs.
const TIMEOUT = 30_000
const run = (...args) =>
  spawnSync('node', [script, ...args], { cwd: root, encoding: 'utf8', timeout: TIMEOUT })

describe('build-design-manifest.mjs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'design-manifest-'))
  const first = join(dir, 'first.json')
  const second = join(dir, 'second.json')

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('writes byte-identical output every time, and matches the committed file', () => {
    execFileSync('node', [script, '--out', first], { cwd: root, timeout: TIMEOUT })
    execFileSync('node', [script, '--out', second], { cwd: root, timeout: TIMEOUT })
    expect(readFileSync(first)).toEqual(readFileSync(second))
    expect(readFileSync(first, 'utf8')).toBe(
      readFileSync(join(root, 'design-manifest.generated.json'), 'utf8'),
    )
  }, 60_000)

  it('--check passes when the file is current and fails when it is stale', () => {
    expect(run('--check', '--out', first).status).toBe(0)
    writeFileSync(first, readFileSync(first, 'utf8').replace('"hero"', '"heroine"'))
    const stale = run('--check', '--out', first)
    expect(stale.status).toBe(1)
    expect(stale.stderr).toContain('stale')
  }, 60_000)
})
