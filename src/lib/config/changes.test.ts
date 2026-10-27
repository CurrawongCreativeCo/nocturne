import { describe, expect, it } from 'vitest'

import {
  defineFeatureConfig,
  type FeatureConfig,
  type FeatureSetting,
} from '@/config/feature-config'

import {
  baselineSummary,
  changelogLines,
  changesSince,
  checkBaseline,
  checkRelease,
  checkVersions,
  formatChanges,
  type RegistrySnapshot,
} from './changes'
import { findReadinessRegressions, minimalEnv } from './compat'

function setting(overrides: Partial<FeatureSetting> & { name: string }): FeatureSetting {
  return { kind: 'server-env', where: 'vercel', required: false, ...overrides }
}

function feature(
  id: string,
  settings: FeatureSetting[],
  overrides: Partial<FeatureConfig> = {},
): FeatureConfig {
  return defineFeatureConfig({
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
    ...overrides,
  })
}

const core = (settings: FeatureSetting[]) => feature('core', settings, { tier: 'core' })

const snapshot = (version: string, features: FeatureConfig[]): RegistrySnapshot => ({
  schema: 1,
  version,
  features,
})

const names = (items: { setting: { name: string } }[]) => items.map((item) => item.setting.name)

describe('changesSince', () => {
  const registry = [
    feature('old', [
      setting({ name: 'OLD_KEY', required: true, since: '1.0.0' }),
      setting({ name: 'OLD_NEW_OPTIONAL', since: '1.9.0' }),
      setting({ name: 'OLD_NEW_REQUIRED', required: true, since: '1.9.0' }),
      setting({
        name: 'RETIRED',
        deprecated: {
          since: '1.9.0',
          replacedBy: 'OLD_KEY',
          migration: 'Rename it.',
          removeWhen: 'Later.',
        },
      }),
    ]),
    feature('fresh', [setting({ name: 'FRESH_KEY', required: true })], {
      since: '1.9.0',
      summary: 'Sends fresh things.',
    }),
    feature(
      'core',
      [
        setting({ name: 'NOW', required: true, requiredIn: ['production'], enforceFrom: '1.9.0' }),
        setting({
          name: 'LATER',
          required: true,
          requiredIn: ['production'],
          enforceFrom: '1.11.0',
        }),
      ],
      { tier: 'core' },
    ),
    feature('unknown-history', [setting({ name: 'NO_SINCE' })]),
  ]

  it('sorts changes into newly enforced, upcoming, new required, new features and deprecations', () => {
    const changes = changesSince(registry, '1.8.0', '1.9.0')
    expect(names(changes.enforced)).toEqual(['NOW'])
    expect(names(changes.upcoming)).toEqual(['LATER'])
    expect(names(changes.newRequired)).toEqual(['OLD_NEW_REQUIRED'])
    expect(names(changes.newSettings)).toEqual(['OLD_NEW_OPTIONAL'])
    expect(changes.newFeatures.map((f) => f.feature.id)).toEqual(['fresh'])
    expect(changes.newFeatures[0]?.needs).toEqual(['FRESH_KEY'])
    expect(names(changes.deprecations)).toEqual(['RETIRED'])
  })

  it('reports nothing new for entries with no since, or from before the range', () => {
    const changes = changesSince(registry, '1.9.0', '1.9.0')
    expect(changes.newFeatures).toEqual([])
    expect(changes.newSettings).toEqual([])
    expect(changes.newRequired).toEqual([])
    expect(changes.enforced).toEqual([])
  })

  it('does not report an entry introduced after the version being updated to', () => {
    expect(changesSince(registry, '1.7.0', '1.8.0').newFeatures).toEqual([])
  })

  it('does not describe an old or undated deprecation as news', () => {
    const old = (since?: string) =>
      feature('f', [
        setting({
          name: 'OLD',
          deprecated: { since, replacedBy: 'NEW', migration: 'Move.', removeWhen: 'Later.' },
        }),
      ])
    expect(changesSince([old('1.5.0')], '1.8.0', '1.9.0').stillDeprecated).toHaveLength(1)
    expect(changesSince([old(undefined)], '1.8.0', '1.9.0').deprecations).toEqual([])
    expect(formatChanges(changesSince([old(undefined)], '1.0.0', '1.9.0'))).toEqual([])
    expect(changesSince([old('1.9.0')], '1.8.0', '1.9.0').deprecations).toHaveLength(1)
  })

  it('marks a feature the environment already satisfies', () => {
    const changes = changesSince(registry, '1.8.0', '1.9.0', new Set(['fresh']))
    expect(changes.newFeatures[0]?.setUp).toBe(true)
  })
})

describe('formatChanges', () => {
  const registry = [
    feature('fresh', [setting({ name: 'FRESH_KEY', required: true })], {
      since: '1.9.0',
      summary: 'Sends fresh things.',
    }),
    feature(
      'core',
      [setting({ name: 'NOW', required: true, requiredIn: ['production'], enforceFrom: '1.9.0' })],
      { tier: 'core' },
    ),
  ]
  const changes = changesSince(registry, '1.8.0', '1.9.0')

  it('puts what can stop a deploy first, and says "available, not set up"', () => {
    const text = formatChanges(changes).join('\n')
    expect(text.indexOf('Set these before merging')).toBeLessThan(text.indexOf('New features'))
    expect(text).toContain('available, not set up')
    expect(text).toContain('NOW')
  })

  it('prints a Markdown "Configuration changes" block for the update PR', () => {
    const lines = formatChanges(changes, { markdown: true })
    expect(lines[0]).toBe('## Configuration changes')
    expect(lines).toContain('Updating from 1.8.0 to 1.9.0.')
    expect(lines.some((line) => line.startsWith('- `NOW`'))).toBe(true)
    expect(lines.at(-1)).not.toBe('')
  })

  it('prints a deprecation with its replacement and removal version', () => {
    const text = formatChanges(
      changesSince(
        [
          feature('f', [
            setting({
              name: 'OLD',
              deprecated: {
                since: '1.9.0',
                replacedBy: 'NEW',
                migration: 'Move the value.',
                removeWhen: 'Later.',
                removeIn: '2.0.0',
              },
            }),
          ]),
        ],
        '1.0.0',
        '1.9.0',
      ),
    ).join('\n')
    expect(text).toContain('OLD is replaced by NEW (removed in 2.0.0). Move the value.')
  })

  it('says there is no removal date when none is set', () => {
    const text = formatChanges(
      changesSince(
        [
          feature('f', [
            setting({
              name: 'OLD',
              deprecated: {
                since: '1.9.0',
                replacedBy: 'NEW',
                migration: 'Move.',
                removeWhen: 'Later.',
              },
            }),
          ]),
        ],
        '1.0.0',
        '1.9.0',
      ),
    ).join('\n')
    expect(text).toContain('no removal date yet')
  })

  it('prints nothing when nothing changed', () => {
    expect(formatChanges(changesSince(registry, '1.9.0', '1.9.0'))).toEqual([])
    expect(changelogLines(changesSince(registry, '1.9.0', '1.9.0'))).toEqual([])
  })

  it('gives the CHANGELOG bold sub-headings, not the PR block', () => {
    const lines = changelogLines(changes)
    expect(lines.join('\n')).not.toContain('## Configuration changes')
    expect(lines[0]).toBe('**Set these before merging: the build fails without them**')
  })
})

describe('a setting the site already needs at run time', () => {
  const registry = [
    core([
      setting({
        name: 'TOKEN',
        required: true,
        requiredAtRuntime: true,
        requiredIn: ['production'],
        enforceFrom: '1.11.0',
      }),
    ]),
  ]

  it('is described as needed now, never as optional until the build enforces it', () => {
    const text = formatChanges(changesSince(registry, '1.9.0', '1.10.0'), { markdown: true }).join(
      '\n',
    )
    expect(text).toContain('Needed for the site to run')
    expect(text).toContain('the site already fails without it, in every environment')
    expect(text).toContain('the build refuses a missing one from 1.11.0')
    expect(text).not.toContain('set them now, the build only warns')
    expect(text).not.toContain('in production')
  })

  it('keeps ordinary later requirements under the old heading', () => {
    const ordinary = [
      core([
        setting({
          name: 'LATER',
          required: true,
          requiredIn: ['production'],
          enforceFrom: '1.11.0',
        }),
      ]),
    ]
    const text = formatChanges(changesSince(ordinary, '1.9.0', '1.10.0')).join('\n')
    expect(text).toContain('Required from a later version')
    expect(text).not.toContain('Needed for the site to run')
  })
})

describe('checkBaseline and checkVersions', () => {
  const allowed = ['NEXT_PUBLIC_SANITY_PROJECT_ID']

  it('lets a baseline enforce only what a build already needs', () => {
    const fine = core([setting({ name: 'NEXT_PUBLIC_SANITY_PROJECT_ID', required: true })])
    expect(checkBaseline([fine], '1.9.0', allowed)).toEqual([])
    const extra = core([setting({ name: 'SURPRISE', required: true })])
    expect(checkBaseline([extra], '1.9.0', allowed)[0]).toContain('SURPRISE')
  })

  it('treats a warning-only requirement as fine in a baseline, and says so in the summary', () => {
    const warns = core([
      setting({ name: 'NEXT_PUBLIC_SANITY_PROJECT_ID', required: true }),
      setting({ name: 'LATER', required: true, requiredIn: ['production'], enforceFrom: '1.10.0' }),
    ])
    expect(checkBaseline([warns], '1.9.0', allowed)).toEqual([])
    expect(baselineSummary([warns], '1.9.0').join('\n')).toContain(
      'Warns only: LATER, enforced from 1.10.0.',
    )
  })

  it('refuses entries that claim a version later than the release', () => {
    const future = feature(
      'f',
      [
        setting({ name: 'A', since: '1.10.0' }),
        setting({
          name: 'B',
          deprecated: { since: '1.10.0', replacedBy: 'C', migration: 'x', removeWhen: 'y' },
        }),
      ],
      { since: '1.10.0' },
    )
    expect(checkVersions([future], '1.9.0')).toHaveLength(3)
    expect(checkVersions([future], '1.10.0')).toEqual([])
  })
})

describe('checkRelease', () => {
  it('is the baseline, refusing nothing, when there is no earlier snapshot', () => {
    expect(checkRelease(null, [core([setting({ name: 'A', required: true })])], '1.9.0')).toEqual(
      [],
    )
  })

  it('refuses a setting that becomes enforced without an earlier warning', () => {
    const before = snapshot('1.8.0', [
      core([setting({ name: 'A', required: true, enforceFrom: '1.10.0' })]),
    ])
    const brandNew = core([setting({ name: 'B', required: true })])
    const problems = checkRelease(before, [brandNew], '1.9.0')
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('B (Feature core) becomes enforced in 1.9.0')
  })

  it('refuses enforcing a setting the earlier release only listed as optional', () => {
    const before = snapshot('1.8.0', [core([setting({ name: 'A', required: false })])])
    const now = core([setting({ name: 'A', required: true, enforceFrom: '1.9.0' })])
    expect(checkRelease(before, [now], '1.9.0')).toHaveLength(1)
  })

  it('allows enforcing a setting that the earlier release warned about', () => {
    const before = snapshot('1.9.0', [
      core([setting({ name: 'A', required: true, enforceFrom: '1.10.0' })]),
    ])
    const now = core([setting({ name: 'A', required: true, enforceFrom: '1.10.0' })])
    expect(checkRelease(before, [now], '1.10.0')).toEqual([])
  })

  it('does not count a setting that was already enforced as newly enforced', () => {
    const plain = core([setting({ name: 'A', required: true })])
    expect(checkRelease(snapshot('1.8.0', [plain]), [plain], '1.9.0')).toEqual([])
  })

  it('refuses an optional feature that gains a required setting with no default or window', () => {
    const before = snapshot('1.8.0', [feature('f', [setting({ name: 'A', required: true })])])
    const now = feature('f', [
      setting({ name: 'A', required: true }),
      setting({ name: 'B', required: true }),
    ])
    const problems = checkRelease(before, [now], '1.9.0')
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('B (Feature f) is newly required')
  })

  it('refuses an optional setting that becomes required', () => {
    const before = snapshot('1.8.0', [feature('f', [setting({ name: 'A' })])])
    const now = feature('f', [setting({ name: 'A', required: true })])
    expect(checkRelease(before, [now], '1.9.0')).toHaveLength(1)
  })

  it('allows the new requirement with a default, or a rename window', () => {
    const before = snapshot('1.8.0', [feature('f', [setting({ name: 'OLD', required: true })])])
    const withDefault = feature('f', [
      setting({ name: 'OLD', required: true }),
      setting({ name: 'B', required: true, default: 'Uses the site address.' }),
    ])
    expect(checkRelease(before, [withDefault], '1.9.0')).toEqual([])

    const renamed = feature('f', [
      setting({
        name: 'OLD',
        deprecated: { replacedBy: 'NEW', migration: 'Rename.', removeWhen: 'Later.' },
      }),
      setting({ name: 'NEW', required: true }),
    ])
    expect(checkRelease(before, [renamed], '1.9.0')).toEqual([])
  })

  it('allows a new optional feature to require what it needs', () => {
    expect(
      checkRelease(
        snapshot('1.8.0', []),
        [feature('new', [setting({ name: 'A', required: true })])],
        '1.9.0',
      ),
    ).toEqual([])
  })

  it('refuses a new core feature without an enforceFrom later than this version', () => {
    const bad = core([
      setting({ name: 'A', required: true }),
      setting({ name: 'B', required: true, enforceFrom: '1.9.0' }),
      setting({ name: 'C', required: true, enforceFrom: '1.10.0' }),
      setting({ name: 'D' }),
    ])
    const problems = checkRelease(snapshot('1.8.0', []), [bad], '1.9.0')
    expect(problems).toHaveLength(2)
    expect(problems[0]).toContain('A (Feature core)')
    expect(problems[1]).toContain('B (Feature core)')
  })
})

describe('readiness compatibility: a warning period is not a regression', () => {
  it('lets a core setting through while its enforceFrom is later than the release', () => {
    const before = core([setting({ name: 'ID', required: true })])
    const after = core([
      setting({ name: 'ID', required: true }),
      setting({ name: 'TOKEN', required: true, enforceFrom: '1.10.0' }),
    ])
    expect(findReadinessRegressions([before], [after], {}, '1.9.0').regressions).toEqual([])
    expect(findReadinessRegressions([before], [after], {}, '1.10.0').regressions).toHaveLength(1)
  })
})

describe('readiness compatibility', () => {
  const oldFeature = feature('f', [setting({ name: 'KEY', required: true })])

  it('builds an environment that satisfies a feature, following conditional requirements', () => {
    const env = minimalEnv(
      feature('c', [
        setting({ name: 'A', required: true }),
        setting({ name: 'B', required: { when: 'A' } }),
        setting({ name: 'C', required: { when: 'NEVER' } }),
        setting({ name: 'D' }),
      ]),
    )
    expect(Object.keys(env).sort()).toEqual(['A', 'B'])
  })

  it('passes when the current registry asks for no more', () => {
    expect(findReadinessRegressions([oldFeature], [oldFeature], {}, '1.9.0')).toEqual({
      checked: ['f'],
      regressions: [],
    })
  })

  it('catches a feature that was ready and now is not', () => {
    const now = feature('f', [
      setting({ name: 'KEY', required: true }),
      setting({ name: 'EXTRA', required: true }),
    ])
    expect(findReadinessRegressions([oldFeature], [now], {}, '1.9.0').regressions).toEqual([
      { featureId: 'f', title: 'Feature f', names: ['EXTRA'] },
    ])
  })

  it('catches a stricter readiness function, not just a longer list', () => {
    const named = { ...oldFeature, readiness: 'strict' }
    const { regressions } = findReadinessRegressions(
      [oldFeature],
      [named],
      { strict: () => ({ ready: false, missing: ['KEY'] }) },
      '1.9.0',
    )
    expect(regressions.map((r) => r.names)).toEqual([['KEY']])
  })

  it('lets a declared deprecation window through', () => {
    const renamed = feature('f', [
      setting({
        name: 'KEY',
        deprecated: { replacedBy: 'NEW_KEY', migration: 'Rename.', removeWhen: 'Later.' },
      }),
      setting({ name: 'NEW_KEY', required: true }),
    ])
    expect(findReadinessRegressions([oldFeature], [renamed], {}, '1.9.0').regressions).toEqual([])
  })

  it('ignores a feature that has been removed', () => {
    expect(findReadinessRegressions([oldFeature], [], {}, '1.9.0').checked).toEqual([])
  })
})
