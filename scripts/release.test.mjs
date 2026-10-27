import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { parseSnapshot, prepareRelease, serialiseSnapshot } from './release-utils.mjs'
import { loadRules } from './release.mjs'

const { rules: realRules } = await loadRules()

const setting = (name, extra = {}) => ({
  name,
  kind: 'server-env',
  where: 'vercel',
  required: false,
  ...extra,
})
const feature = (id, settings, extra = {}) => ({
  id,
  title: `Feature ${id}`,
  summary: `Does ${id}.`,
  why: 'Because.',
  withoutIt: 'Nothing.',
  profileFlag: null,
  tier: 'optional',
  docs: 'README.md',
  settings,
  verify: [],
  ...extra,
})
const core = (settings) => feature('core', settings, { tier: 'core' })

const ENV_REQUIRED = setting('PROJECT_ID', { required: true })
const rules = (overrides = {}) => ({
  ...realRules,
  fixtures: [],
  readiness: {},
  allowedEnforced: ['PROJECT_ID'],
  ...overrides,
})

const CHANGELOG = `# Changelog

## [Unreleased]

### Added

- A new thing.

### Breaking changes / migration steps

## [1.8.0] - 2026-10-23

### Added

- First.

### Breaking changes / migration steps

None.

[Unreleased]: https://github.com/example/site/compare/v1.8.0...HEAD
[1.8.0]: https://github.com/example/site/releases/tag/v1.8.0
`
const STAMP = { version: '1.8.0', released: '2026-10-23' }

/** The previous release: a snapshot of `registry` as 1.8.0. */
const released = (registry) => serialiseSnapshot('1.8.0', registry)

function run(registry, previousRegistry, { version = '1.9.0', baseline = false, ...more } = {}) {
  return prepareRelease({
    stamp: STAMP,
    changelog: CHANGELOG,
    snapshotText: previousRegistry ? released(previousRegistry) : null,
    version,
    date: '2026-10-27',
    baseline,
    registry,
    rules: rules(more.rules),
  })
}

describe('prepareRelease: the seven cases', () => {
  const base = [core([ENV_REQUIRED]), feature('forms', [setting('KEY', { required: true })])]

  it('1. a safe release with no configuration changes', () => {
    const result = run(base, base)
    expect(result.problems).toEqual([])
    expect(result.files.changelog).toContain('## [1.9.0] - 2026-10-27')
    expect(result.files.changelog).not.toContain('New configuration in')
    expect(result.markdown).toEqual([])
    expect(parseSnapshot(result.files.snapshot, '1.9.0')?.baseline).toBeUndefined()
  })

  it('2. a new optional setting is announced and never refused', () => {
    const now = [
      base[0],
      feature('forms', [base[1].settings[0], setting('EXTRA', { since: '1.9.0' })]),
    ]
    const result = run(now, base)
    expect(result.problems).toEqual([])
    expect(result.files.changelog).toContain('### New configuration in 1.9.0')
    expect(result.files.changelog).toContain('`EXTRA`')
    expect(result.markdown.join('\n')).toContain('## Configuration changes')
    expect(result.markdown.join('\n')).toContain('`EXTRA`')
  })

  it('3. a new required setting with a warning period is accepted, then enforced a release later', () => {
    const warned = core([
      ENV_REQUIRED,
      setting('NEW_CORE', {
        required: true,
        requiredIn: ['production'],
        enforceFrom: '1.10.0',
        since: '1.9.0',
      }),
    ])
    const first = run([warned], base)
    expect(first.problems).toEqual([])
    expect(first.markdown.join('\n')).toContain('Required from a later version')

    // 1.9.0 shipped with the warning; 1.10.0 may enforce it.
    const second = prepareRelease({
      stamp: { version: '1.9.0', released: '2026-10-27' },
      changelog: first.files.changelog.replace('### Added\n', '### Added\n\n- Enforced it.\n'),
      snapshotText: first.files.snapshot,
      version: '1.10.0',
      date: '2026-11-10',
      registry: [warned],
      rules: rules(),
    })
    expect(second.problems).toEqual([])
  })

  it('4. a required setting introduced without warning is refused, all reasons at once, writing nothing', () => {
    const now = [
      core([ENV_REQUIRED, setting('SURPRISE', { required: true })]),
      feature('forms', [base[1].settings[0], setting('NEW_REQUIRED', { required: true })]),
      core([]),
    ]
    const result = run(now, base)
    expect(result.files).toBeNull()
    expect(result.problems.length).toBeGreaterThanOrEqual(2)
    const text = result.problems.join('\n')
    expect(text).toContain('SURPRISE')
    expect(text).toContain('NEW_REQUIRED')
  })

  it('5. a readiness validation change that breaks a previously valid fixture is refused', () => {
    const fixtures = [{ id: 'forms@1.8.0', featureId: 'forms', env: { KEY: 'v' }, note: 'worked' }]
    const withFn = [base[0], { ...base[1], readiness: 'check' }]
    const result = run(withFn, withFn, {
      rules: { fixtures, readiness: { check: () => ({ ready: false, missing: ['KEY'] }) } },
    })
    expect(result.files).toBeNull()
    expect(result.problems.join('\n')).toContain('forms@1.8.0')
  })

  it('6. a repeated run is refused and cannot duplicate a section', () => {
    const first = run(base, base)
    const again = prepareRelease({
      stamp: { version: '1.9.0', released: '2026-10-27' },
      changelog: first.files.changelog,
      snapshotText: first.files.snapshot,
      version: '1.9.0',
      date: '2026-10-27',
      registry: base,
      rules: rules(),
    })
    expect(again.files).toBeNull()
    expect(again.problems[0]).toContain('must be greater')
    expect(first.files.changelog.match(/^## \[1\.9\.0\]/gm)).toHaveLength(1)

    // A run that stopped after the changelog but before the stamp is refused, not repeated.
    const halfDone = prepareRelease({
      stamp: STAMP,
      changelog: first.files.changelog,
      snapshotText: released(base),
      version: '1.9.0',
      date: '2026-10-27',
      registry: base,
      rules: rules(),
    })
    expect(halfDone.files).toBeNull()
    expect(halfDone.problems[0]).toContain('template-version.json says 1.8.0')
  })

  it('7. the first release is a baseline, and only an explicit one', () => {
    expect(run(base, null).files).toBeNull()
    expect(run(base, null).problems[0]).toContain('--baseline')

    const result = run(base, null, { baseline: true })
    expect(result.problems).toEqual([])
    expect(result.notes.join('\n')).toContain('Baseline')
    expect(result.notes.join('\n')).toContain('Enforced by the build: PROJECT_ID')
    expect(JSON.parse(result.files.snapshot).baseline).toBe(true)

    // A baseline may not add requirements for existing sites.
    const extra = [core([ENV_REQUIRED, setting('SURPRISE', { required: true })])]
    expect(run(extra, null, { baseline: true }).problems.join('\n')).toContain('SURPRISE')

    // And it can't replace a real comparison.
    expect(run(base, base, { baseline: true }).problems.join('\n')).toContain('only for the first')
  })

  it('does not accept an entry claiming a later version than the release', () => {
    const future = [base[0], feature('forms', [base[1].settings[0]], { since: '1.10.0' })]
    expect(run(future, base).problems.join('\n')).toContain('later than this release')
  })
})

describe('the real script', () => {
  const root = join(fileURLToPath(import.meta.url), '..', '..')
  const script = join(root, 'scripts', 'release.mjs')
  const dir = mkdtempSync(join(tmpdir(), 'release-'))
  for (const file of ['CHANGELOG.md', 'template-version.json'])
    copyFileSync(join(root, file), join(dir, file))
  const go = (...args) => spawnSync('node', [script, ...args], { cwd: dir, encoding: 'utf8' })
  const read = (file) => readFileSync(join(dir, file), 'utf8')

  it('refuses without a snapshot or --baseline, and writes nothing', () => {
    const before = read('CHANGELOG.md')
    const result = go('1.9.0')
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Nothing was written')
    expect(read('CHANGELOG.md')).toBe(before)
    expect(existsSync(join(dir, 'config-registry.snapshot.json'))).toBe(false)
  })

  it('--dry-run checks everything and writes nothing', () => {
    const before = read('template-version.json')
    const result = go('1.9.0', '--baseline', '--dry-run')
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Nothing was written')
    expect(read('template-version.json')).toBe(before)
    expect(existsSync(join(dir, 'config-registry.snapshot.json'))).toBe(false)
  })

  it('writes the baseline once, then refuses to run again', () => {
    expect(go('1.9.0', '--baseline').status).toBe(0)
    expect(JSON.parse(read('config-registry.snapshot.json'))).toMatchObject({
      version: '1.9.0',
      baseline: true,
    })
    expect(read('CHANGELOG.md').match(/^## \[1\.9\.0\]/gm)).toHaveLength(1)

    const again = go('1.9.0')
    expect(again.status).toBe(1)
    expect(read('CHANGELOG.md').match(/^## \[1\.9\.0\]/gm)).toHaveLength(1)
    expect(
      execFileSync('node', [join(root, 'scripts', 'check-version.mjs')], {
        cwd: dir,
        encoding: 'utf8',
      }),
    ).toContain('matches')
  })
})
