import { readFileSync } from 'node:fs'

import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * `VITEST_NEW_SNAPSHOTS` lets a generated section write its first snapshots. It must stay confined to the
 * generator smoke-test job, so a normal run, a PR check or the e2e jobs can never accept a new snapshot.
 * (vitest.config.mts; the flag does not reach Playwright's screenshots, which have their own commands.)
 */

const FLAG = 'VITEST_NEW_SNAPSHOTS'
const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

describe('where the flag is set', () => {
  const workflow = read('.github/workflows/ci.yml')
  const lines = workflow.split('\n')
  const uses = lines.flatMap((line, index) => (line.includes(`${FLAG}:`) ? [index] : []))

  const enclosing = (index: number, pattern: RegExp) => {
    for (let at = index; at >= 0; at--) {
      const found = pattern.exec(lines[at] ?? '')
      if (found) return found[1]
    }
    return undefined
  }

  it('is set once, on the one step of the generators job that runs the checks', () => {
    expect(uses).toHaveLength(1)
    const at = uses[0] ?? 0
    expect(enclosing(at, /^ {2}([a-z][a-z-]*):\s*$/)).toBe('generators')
    expect(enclosing(at, /^ {6}- name: (.+)$/)).toBe('Run every check')
    expect(lines[at]?.trim()).toBe(`${FLAG}: '1'`)
  })

  it('is not set at a level that reaches other steps or jobs', () => {
    const at = uses[0] ?? 0
    // Indented under a step's own `env:`: not a job's or the workflow's.
    expect(lines[at]?.startsWith(' '.repeat(10))).toBe(true)
    expect(lines[at - 1]?.trim()).toBe('env:')
  })

  it('appears nowhere else: not in the scripts, other workflows or hooks', () => {
    for (const file of [
      'package.json',
      '.github/workflows/backup.yml',
      '.github/workflows/enquiry-retention.yml',
      '.github/workflows/health.yml',
      '.github/workflows/sanity.yml',
      '.github/workflows/visual-baselines.yml',
      'lint-staged.config.mjs',
      'playwright.config.ts',
    ]) {
      expect(read(file), file).not.toContain(FLAG)
    }
  })

  it('is the only way vitest writes snapshots, and only the new ones', () => {
    const config = read('vitest.config.mts')
    expect(config).toContain("update: 'new'")
    expect(config).not.toMatch(/update:\s*(true|'all')/)
    const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> })
      .scripts
    for (const [name, command] of Object.entries(scripts)) {
      if (!command.includes('vitest')) continue
      expect(command, name).not.toMatch(/(^|\s)(-u|--update)(\s|$)/)
    }
  })
})

describe('what the config does with it', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  const updateFor = async (env: Record<string, string | undefined>) => {
    vi.resetModules()
    for (const key of ['CI', 'GITHUB_JOB', FLAG]) vi.stubEnv(key, env[key] ?? '')
    const { default: config } = await import('../../vitest.config.mts')
    return (config as { test?: { update?: unknown } }).test?.update
  }

  it('changes nothing when it is not set', async () => {
    expect(await updateFor({})).toBeUndefined()
    expect(await updateFor({ CI: 'true', GITHUB_JOB: 'check' })).toBeUndefined()
  })

  it('writes new snapshots in the generators job', async () => {
    expect(await updateFor({ CI: 'true', GITHUB_JOB: 'generators', [FLAG]: '1' })).toBe('new')
  })

  it('stops any other CI job that sets it', async () => {
    for (const job of ['check', 'e2e', 'e2e-isolated', undefined]) {
      await expect(
        updateFor({ CI: 'true', GITHUB_JOB: job, [FLAG]: '1' }),
        String(job),
      ).rejects.toThrow(/only the generators job/)
    }
  })

  it('still works on a developer’s machine, where there is no CI', async () => {
    expect(await updateFor({ [FLAG]: '1' })).toBe('new')
  })
})
