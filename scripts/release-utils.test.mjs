import { describe, expect, it } from 'vitest'

import {
  checkVersionStamp,
  compareVersions,
  isValidDate,
  latestChangelogRelease,
  parseSnapshot,
  parseVersion,
  releaseChangelog,
  serialiseSnapshot,
} from './release-utils.mjs'

const BASE = 'https://github.com/example/site'

function changelog({ added = '- A new thing.', fixed = '', breaking = '' } = {}) {
  return `# Changelog

Intro text.

## [Unreleased]

### Added

${added}

### Changed

### Fixed

${fixed}

### Breaking changes / migration steps

${breaking}

## [1.1.0] - 2026-10-14

### Added

- Older thing.

### Breaking changes / migration steps

None.

## [1.0.0] - 2026-09-01

### Added

- Baseline.

### Breaking changes / migration steps

None.

[Unreleased]: ${BASE}/compare/v1.1.0...HEAD
[1.1.0]: ${BASE}/compare/v1.0.0...v1.1.0
[1.0.0]: ${BASE}/releases/tag/v1.0.0
`
}

const release = (text, version = '1.2.0', date = '2026-11-02') =>
  releaseChangelog(text, { version, date })

describe('versions', () => {
  it('parses plain MAJOR.MINOR.PATCH only', () => {
    expect(parseVersion('1.2.0')).toEqual([1, 2, 0])
    for (const bad of ['v1.2.0', '1.2', '1.2.0-beta', '1.2.x', '', 'latest'])
      expect(parseVersion(bad)).toBeNull()
  })

  it('compares numerically, not as text', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0)
    expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0)
    expect(compareVersions('1.2.0', '1.2.0')).toBe(0)
    expect(compareVersions('1.2.0', '1.2.1')).toBeLessThan(0)
  })

  it('accepts real dates only', () => {
    expect(isValidDate('2026-10-14')).toBe(true)
    for (const bad of ['2026-02-30', '2026-13-01', '14/10/2026', '2026-1-1', ''])
      expect(isValidDate(bad)).toBe(false)
  })
})

describe('latestChangelogRelease', () => {
  it('finds the first dated heading and ignores Unreleased', () => {
    expect(latestChangelogRelease(changelog())).toEqual({ version: '1.1.0', date: '2026-10-14' })
  })

  it('is null without one', () => {
    expect(latestChangelogRelease('## [Unreleased]\n')).toBeNull()
  })
})

describe('releaseChangelog', () => {
  it('moves the entries under a dated heading and resets Unreleased', () => {
    const out = release(changelog({ fixed: '- A bug.' }))
    expect(out).toContain(
      [
        '## [Unreleased]',
        '',
        '### Added',
        '',
        '### Changed',
        '',
        '### Fixed',
        '',
        '### Breaking changes / migration steps',
        '',
        '## [1.2.0] - 2026-11-02',
        '',
        '### Added',
        '',
        '- A new thing.',
        '',
        '### Fixed',
        '',
        '- A bug.',
        '',
        '### Breaking changes / migration steps',
        '',
        'None.',
        '',
        '## [1.1.0] - 2026-10-14',
      ].join('\n'),
    )
  })

  it('drops empty subsections but keeps the breaking one, writing None. when empty', () => {
    const section = release(changelog()).split('## [1.2.0]')[1].split('## [1.1.0]')[0]
    expect(section).not.toContain('### Changed')
    expect(section).not.toContain('### Fixed')
    expect(section).toContain('### Breaking changes / migration steps\n\nNone.')
  })

  it('keeps migration steps as written, in the new version', () => {
    const out = release(changelog({ breaking: '- **Sites:** switch the dataset to private.' }))
    const section = out.split('## [1.2.0]')[1].split('## [1.1.0]')[0]
    expect(section).toContain('- **Sites:** switch the dataset to private.')
    expect(section).not.toContain('None.')
    // Unreleased starts empty again.
    expect(out.split('## [1.2.0]')[0]).not.toContain('switch the dataset')
  })

  it('treats a leftover "None." in Unreleased as empty, not as an entry', () => {
    expect(() => release(changelog({ added: '', breaking: 'None.' }))).toThrow(/no entries/)
  })

  it('updates the compare links', () => {
    const out = release(changelog())
    expect(out).toContain(`[Unreleased]: ${BASE}/compare/v1.2.0...HEAD`)
    expect(out).toContain(`[1.2.0]: ${BASE}/compare/v1.1.0...v1.2.0`)
    expect(out).toContain(`[1.1.0]: ${BASE}/compare/v1.0.0...v1.1.0`)
    expect(out).not.toContain('compare/v1.1.0...HEAD')
  })

  it('leaves everything outside Unreleased and the links untouched', () => {
    const out = release(changelog())
    expect(out.startsWith('# Changelog\n\nIntro text.\n\n## [Unreleased]')).toBe(true)
    expect(out).toContain('## [1.0.0] - 2026-09-01\n\n### Added\n\n- Baseline.')
    expect(out.endsWith('\n')).toBe(true)
  })

  it('is stable: releasing again needs new entries', () => {
    const once = release(changelog())
    expect(() => release(once, '1.3.0')).toThrow(/no entries/)
    expect(latestChangelogRelease(once)).toEqual({ version: '1.2.0', date: '2026-11-02' })
  })

  it('rejects a version that is not greater than the latest', () => {
    expect(() => release(changelog(), '1.1.0')).toThrow(/greater/)
    expect(() => release(changelog(), '1.0.9')).toThrow(/greater/)
  })

  it('rejects a bad version or date', () => {
    expect(() => release(changelog(), 'v1.2.0')).toThrow(/not a version/)
    expect(() => release(changelog(), '1.2.0', '2 Nov 2026')).toThrow(/not a date/)
  })

  it('explains a changelog it cannot release', () => {
    expect(() => release('# Changelog\n')).toThrow(/no released version/)
    expect(() => release(changelog().replace('## [Unreleased]', '## Unreleased'))).toThrow(
      /Unreleased/,
    )
    expect(() => release(changelog().replace(/^\[Unreleased\].*$/m, ''))).toThrow(/compare link/)
  })
})

describe('checkVersionStamp', () => {
  const stamp = { version: '1.1.0', released: '2026-10-14' }

  it('passes when the stamp matches the latest heading', () => {
    expect(checkVersionStamp(stamp, changelog())).toBeNull()
  })

  it('fails on a different version, naming both', () => {
    const problem = checkVersionStamp({ ...stamp, version: '1.2.0' }, changelog())
    expect(problem).toContain('1.2.0')
    expect(problem).toContain('1.1.0')
  })

  it('fails on a different date', () => {
    expect(checkVersionStamp({ ...stamp, released: '2026-10-15' }, changelog())).toMatch(/released/)
  })

  it('fails on a malformed stamp or changelog', () => {
    expect(checkVersionStamp({ version: 'one' }, changelog())).toMatch(/"version"/)
    expect(checkVersionStamp({ version: '1.1.0', released: 'soon' }, changelog())).toMatch(
      /"released"/,
    )
    expect(checkVersionStamp(stamp, '# Changelog')).toMatch(/no "## \[x.y.z\]/)
  })

  it('agrees with a release: the output of releaseChangelog matches the new stamp', () => {
    const out = release(changelog())
    expect(checkVersionStamp({ version: '1.2.0', released: '2026-11-02' }, out)).toBeNull()
    expect(checkVersionStamp(stamp, out)).not.toBeNull()
  })
})

describe('releaseChangelog configuration section', () => {
  const base = `# Changelog

## [Unreleased]

### Added

- A new thing.

### Breaking changes / migration steps

## [1.0.0] - 2026-01-01

### Added

- First.

### Breaking changes / migration steps

None.

[Unreleased]: https://github.com/example/site/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/example/site/releases/tag/v1.0.0
`

  it('writes "New configuration in X.Y.Z" before the breaking-changes section', () => {
    const out = releaseChangelog(base, {
      version: '1.1.0',
      date: '2026-02-01',
      configuration: ['**New features**', '', '- Forms: sends mail.'],
    })
    const released = out.slice(out.indexOf('## [1.1.0]'), out.indexOf('## [1.0.0]'))
    expect(released).toContain(
      '### New configuration in 1.1.0\n\n**New features**\n\n- Forms: sends mail.',
    )
    expect(released.indexOf('### New configuration in 1.1.0')).toBeLessThan(
      released.indexOf('### Breaking changes'),
    )
    expect(released.indexOf('### Added')).toBeLessThan(released.indexOf('### New configuration'))
  })

  it('leaves the section out when nothing changed', () => {
    expect(releaseChangelog(base, { version: '1.1.0', date: '2026-02-01' })).not.toContain(
      'New configuration in',
    )
  })
})

describe('the registry snapshot', () => {
  const text = serialiseSnapshot('1.8.0', [{ id: 'forms', settings: [] }])

  it('round-trips and ends with a newline', () => {
    expect(text.endsWith('\n')).toBe(true)
    expect(parseSnapshot(text, '1.8.0')).toEqual({
      schema: 1,
      version: '1.8.0',
      features: [{ id: 'forms', settings: [] }],
    })
  })

  it('is the baseline when there is no file', () => {
    expect(parseSnapshot(null, '1.8.0')).toBeNull()
  })

  it('refuses a snapshot from a different release, or one it cannot read', () => {
    expect(() => parseSnapshot(text, '1.9.0')).toThrow(/released in 1\.8\.0/)
    expect(() => parseSnapshot('{', '1.8.0')).toThrow(/not valid JSON/)
    expect(() => parseSnapshot('{"schema":2}', '1.8.0')).toThrow(/needs/)
  })
})
