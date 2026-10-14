/**
 * Prepares a template release: npm run release -- 1.2.0 [--date 2026-10-14]
 *
 * Checks the version is greater than the current one, moves the CHANGELOG.md "Unreleased" entries
 * into a dated section, updates the compare links and template-version.json, then prints the git
 * commands to commit, tag and push. It never runs git and never pushes.
 */
import { readFileSync, writeFileSync } from 'node:fs'

import {
  checkVersionStamp,
  compareVersions,
  isValidDate,
  parseVersion,
  releaseChangelog,
} from './release-utils.mjs'

const STAMP_FILE = 'template-version.json'
const CHANGELOG_FILE = 'CHANGELOG.md'

function fail(message) {
  console.error(message)
  process.exit(1)
}

function today() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const args = process.argv.slice(2)
const dateFlag = args.indexOf('--date')
const date = dateFlag === -1 ? today() : (args[dateFlag + 1] ?? '')
const version = args.find(
  (arg, index) => !arg.startsWith('--') && (dateFlag === -1 || index !== dateFlag + 1),
)

if (!version)
  fail('Usage: npm run release -- <version> [--date YYYY-MM-DD]   e.g. npm run release -- 1.2.0')
if (!parseVersion(version))
  fail(`"${version}" is not a version like 1.2.0 (no "v", no pre-release suffix).`)
if (!isValidDate(date)) fail(`"${date}" is not a date like 2026-10-14.`)

const stamp = JSON.parse(readFileSync(STAMP_FILE, 'utf8'))
const changelog = readFileSync(CHANGELOG_FILE, 'utf8')

// Start from a consistent state, so the new files can't hide an earlier mismatch.
const problem = checkVersionStamp(stamp, changelog)
if (problem) fail(problem)
if (compareVersions(version, stamp.version) <= 0) {
  fail(`${version} must be greater than the current version ${stamp.version}.`)
}

let updated
try {
  updated = releaseChangelog(changelog, { version, date })
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

writeFileSync(CHANGELOG_FILE, updated)
writeFileSync(STAMP_FILE, `{ "version": "${version}", "released": "${date}" }\n`)

console.log(`Released ${stamp.version} -> ${version} (${date}) in ${CHANGELOG_FILE} and ${STAMP_FILE}.

Next, by hand (this script never runs git):

  1. Review the diff, then npm run format && npm run check && npm run test:e2e
  2. git add ${CHANGELOG_FILE} ${STAMP_FILE}
     git commit -m "Release v${version}"
  3. Get that commit onto main (pull request, or push main directly if you are an admin), then:
     git switch main && git pull --ff-only
     git tag -a v${version} -m "v${version}"
     git push origin main v${version}
`)
