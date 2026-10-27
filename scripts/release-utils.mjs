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
 * compares the previous tag to it. `configuration` is the body of a "New configuration in X.Y.Z"
 * section (from the feature registry), written before _Breaking changes_ and left out when empty.
 * Throws a readable error when the file can't be released.
 */
export function releaseChangelog(changelog, { version, date, configuration = [] }) {
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
    ...(configuration.length > 0 ? block(`New configuration in ${version}`, configuration) : []),
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

/** The file `npm run release` writes: the registry as released, for the next release to compare with. */
export const SNAPSHOT_FILE = 'config-registry.snapshot.json'

/** The registry (names and words, never a value) as JSON, stamped with the version it was released as. */
export function serialiseSnapshot(version, features, { baseline = false } = {}) {
  const head = { schema: 1, version, ...(baseline ? { baseline: true } : {}) }
  return `${JSON.stringify({ ...head, features }, null, 2)}\n`
}

/**
 * The snapshot, or null when there is none yet (the first release that writes one is the baseline).
 * Throws a readable error for a file that can't be trusted as the comparison.
 */
export function parseSnapshot(text, expectedVersion) {
  if (text === null) return null
  let snapshot
  try {
    snapshot = JSON.parse(text)
  } catch {
    throw new Error(`${SNAPSHOT_FILE} is not valid JSON.`)
  }
  if (
    snapshot?.schema !== 1 ||
    !Array.isArray(snapshot.features) ||
    !parseVersion(snapshot.version)
  ) {
    throw new Error(`${SNAPSHOT_FILE} needs "schema": 1, a "version" and a "features" list.`)
  }
  if (snapshot.version !== expectedVersion) {
    throw new Error(
      `${SNAPSHOT_FILE} is the registry as released in ${snapshot.version}, but template-version.json says ${expectedVersion}. Restore the file from the ${expectedVersion} release.`,
    )
  }
  return snapshot
}

/**
 * Everything `npm run release` decides, with no file access: it validates first and only then builds
 * the new file contents, so a refused release changes nothing. `rules` are the registry functions
 * from src/lib/config/ (passed in because they are TypeScript the script loads with jiti):
 * `checkRelease`, `checkBaseline`, `allowedEnforced`, `changesSince`, `changelogLines`,
 * `formatChanges`, `findReadinessRegressions`, `checkHistoricalFixtures`, `readiness`, `fixtures`.
 *
 * `snapshotText` is the previous release's `config-registry.snapshot.json`, or null. Without one the
 * release is refused unless `baseline` is true, so a deleted snapshot can't quietly switch every
 * comparison off; with one, `baseline` is refused, so a baseline can't replace a real comparison.
 * The returned `files` carry the new snapshot only when nothing was refused.
 */
export function prepareRelease({
  stamp,
  changelog,
  snapshotText,
  version,
  date,
  baseline = false,
  registry,
  rules,
}) {
  const refused = (...problems) => ({ problems, files: null, notes: [], markdown: [] })

  if (!parseVersion(version)) return refused(`"${version}" is not a version like 1.2.0.`)
  if (!isValidDate(date)) return refused(`"${date}" is not a date like 2026-10-14.`)
  // Start from a consistent state, so a half-finished earlier run can't hide behind a new one.
  const inconsistent = checkVersionStamp(stamp, changelog)
  if (inconsistent) return refused(inconsistent)
  if (compareVersions(version, stamp.version) <= 0) {
    return refused(`${version} must be greater than the current version ${stamp.version}.`)
  }

  let previous
  try {
    previous = parseSnapshot(snapshotText, stamp.version)
  } catch (error) {
    return refused(error.message)
  }

  const problems = []
  const notes = []
  if (!previous && !baseline) {
    problems.push(
      `There is no ${SNAPSHOT_FILE}, so nothing can be compared. If ${version} is the first release with a feature registry, run it again with --baseline after reading what that means (README, "Cutting a release"). Otherwise restore the file from the ${stamp.version} release.`,
    )
  }
  if (previous && baseline) {
    problems.push(
      `--baseline is only for the first release. ${SNAPSHOT_FILE} exists (${previous.version}), and this release is checked against it.`,
    )
  }

  problems.push(...rules.checkRelease(previous, registry, version))
  if (!previous && baseline) {
    problems.push(...rules.checkBaseline(registry, version, rules.allowedEnforced))
    notes.push(
      `Baseline: no earlier snapshot exists, so ${version} can't be compared with ${stamp.version}. Nothing automated proves the registry matches what existing sites need; the checks that ran are that it enforces only ${rules.allowedEnforced.join(' and ')}, and that the historical fixtures are ready.`,
      ...rules.baselineSummary(registry, version),
    )
  }
  for (const failure of rules.checkHistoricalFixtures(
    rules.fixtures,
    registry,
    rules.readiness,
    version,
  )) {
    problems.push(
      `The ${failure.id} configuration, valid in an earlier release, is no longer ready: ${failure.problem}`,
    )
  }
  if (previous) {
    const { regressions } = rules.findReadinessRegressions(
      previous.features,
      registry,
      rules.readiness,
      version,
    )
    for (const item of regressions) {
      problems.push(
        `${item.title} was ready under ${previous.version} and would not be under ${version}: ${item.names.join(', ')}. Give the new requirement a default, or declare a deprecation window (deprecated.replacedBy).`,
      )
    }
  }
  if (problems.length > 0) return { problems, files: null, notes: [], markdown: [] }

  const changes = rules.changesSince(registry, stamp.version, version)
  let released
  try {
    released = releaseChangelog(changelog, {
      version,
      date,
      configuration: rules.changelogLines(changes),
    })
  } catch (error) {
    return refused(error.message)
  }
  return {
    problems: [],
    notes,
    // What a client's update PR gets from `config:check --since`, for the release notes to link.
    markdown: rules.formatChanges(changes, { markdown: true }),
    files: {
      changelog: released,
      stamp: `{ "version": "${version}", "released": "${date}" }\n`,
      snapshot: serialiseSnapshot(version, registry, { baseline: !previous }),
    },
  }
}
