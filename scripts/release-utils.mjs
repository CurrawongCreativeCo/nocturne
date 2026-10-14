/**
 * Pure helpers for scripts/release.mjs and scripts/check-version.mjs: version maths and the
 * CHANGELOG.md transformation. No file or git access here, so it is unit-tested directly.
 */

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const UNRELEASED_HEADING = '## [Unreleased]'
const BREAKING_HEADING = 'Breaking changes / migration steps'
/** What a fresh _Unreleased_ section contains after a release. */
const UNRELEASED_SKELETON = ['Added', 'Changed', 'Fixed', BREAKING_HEADING]

/** `1.2.0` as [1, 2, 0], or null when it is not plain MAJOR.MINOR.PATCH (no `v`, no pre-release). */
export function parseVersion(value) {
  const match = SEMVER.exec(String(value))
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

export function isValidDate(value) {
  if (!DATE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

/** Negative when a < b, 0 when equal, positive when a > b. Both must be valid versions. */
export function compareVersions(a, b) {
  const left = parseVersion(a)
  const right = parseVersion(b)
  if (!left || !right) throw new Error(`Cannot compare "${a}" and "${b}"`)
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2]
}

/** The newest `## [x.y.z] - date` heading in the changelog (the first one), or null. */
export function latestChangelogRelease(changelog) {
  const match = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})\s*$/m.exec(changelog)
  return match ? { version: match[1], date: match[2] } : null
}

/**
 * Why template-version.json and CHANGELOG.md disagree, or null when they match. CI runs this so
 * a release can't be tagged with one of them forgotten.
 */
export function checkVersionStamp(stamp, changelog) {
  if (!stamp || !parseVersion(stamp.version)) {
    return 'template-version.json needs a "version" like "1.2.0".'
  }
  if (!isValidDate(String(stamp.released))) {
    return 'template-version.json needs a "released" date like "2026-10-14".'
  }
  const latest = latestChangelogRelease(changelog)
  if (!latest) return 'CHANGELOG.md has no "## [x.y.z] - YYYY-MM-DD" heading.'
  if (latest.version !== stamp.version) {
    return `template-version.json says ${stamp.version} but the latest CHANGELOG.md heading is ${latest.version}. Run \`npm run release\` or fix whichever is wrong.`
  }
  if (latest.date !== stamp.released) {
    return `template-version.json says released ${stamp.released} but the CHANGELOG.md heading for ${latest.version} says ${latest.date}.`
  }
  return null
}

/** Splits the lines of one changelog section into the text before its first `###` and its subsections. */
function splitSubsections(lines) {
  const subsections = []
  const intro = []
  let current = null
  for (const line of lines) {
    const heading = /^### (.+?)\s*$/.exec(line)
    if (heading) {
      current = { title: heading[1], lines: [] }
      subsections.push(current)
    } else if (current) {
      current.lines.push(line)
    } else {
      intro.push(line)
    }
  }
  return { intro, subsections }
}

function trimBlankLines(lines) {
  let start = 0
  let end = lines.length
  while (start < end && !lines[start].trim()) start++
  while (end > start && !lines[end - 1].trim()) end--
  return lines.slice(start, end)
}

const isEmptyBody = (lines) => {
  const text = lines.join('\n').trim()
  return text === '' || text === 'None.'
}

/**
 * Moves the _Unreleased_ entries into a dated `## [version] - date` section and leaves a fresh,
 * empty _Unreleased_ block. Empty subsections are dropped from the release, except _Breaking
 * changes / migration steps_, which is always kept (last) and says "None." when empty. The compare
 * links at the foot are updated: _Unreleased_ now compares from the new tag, and the new version
 * compares the previous tag to it. Throws a readable error when the file can't be released.
 */
export function releaseChangelog(changelog, { version, date }) {
  if (!parseVersion(version)) throw new Error(`"${version}" is not a version like 1.2.0.`)
  if (!isValidDate(date)) throw new Error(`"${date}" is not a date like 2026-10-14.`)

  const previous = latestChangelogRelease(changelog)
  if (!previous) throw new Error('CHANGELOG.md has no released version heading to compare from.')
  if (compareVersions(version, previous.version) <= 0) {
    throw new Error(
      `${version} must be greater than the latest CHANGELOG.md version ${previous.version}.`,
    )
  }

  const lines = changelog.split('\n')
  const start = lines.indexOf(UNRELEASED_HEADING)
  if (start === -1) throw new Error(`CHANGELOG.md has no "${UNRELEASED_HEADING}" heading.`)
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## ['))
  if (end === -1) throw new Error('CHANGELOG.md has nothing after the Unreleased section.')

  const { subsections } = splitSubsections(lines.slice(start + 1, end))
  const breaking = subsections.filter((section) => section.title === BREAKING_HEADING)
  const others = subsections.filter(
    (section) => section.title !== BREAKING_HEADING && !isEmptyBody(section.lines),
  )
  const hasBreaking = breaking.some((section) => !isEmptyBody(section.lines))
  if (others.length === 0 && !hasBreaking) {
    throw new Error('The Unreleased section has no entries to release.')
  }

  const block = (title, body) => [`### ${title}`, '', ...trimBlankLines(body), '']
  const released = [
    `## [${version}] - ${date}`,
    '',
    ...others.flatMap((section) => block(section.title, section.lines)),
    ...block(
      BREAKING_HEADING,
      hasBreaking ? breaking.flatMap((section) => section.lines) : ['None.'],
    ),
  ]
  const fresh = [
    UNRELEASED_HEADING,
    '',
    ...UNRELEASED_SKELETON.flatMap((title) => [`### ${title}`, '']),
  ]

  const rebuilt = [...lines.slice(0, start), ...fresh, ...released, ...lines.slice(end)]
  return updateCompareLinks(rebuilt, previous.version, version).join('\n')
}

function updateCompareLinks(lines, previous, version) {
  const index = lines.findIndex((line) => line.startsWith('[Unreleased]: '))
  if (index === -1)
    throw new Error('CHANGELOG.md has no "[Unreleased]: …" compare link at the foot.')
  const match = /^\[Unreleased\]: (.+)\/compare\/v[^./]+(?:\.[^./]+)*\.\.\.HEAD$/.exec(lines[index])
  if (!match) throw new Error(`Cannot read the compare link: ${lines[index]}`)
  const base = match[1]
  return [
    ...lines.slice(0, index),
    `[Unreleased]: ${base}/compare/v${version}...HEAD`,
    `[${version}]: ${base}/compare/v${previous}...v${version}`,
    ...lines.slice(index + 1),
  ]
}
