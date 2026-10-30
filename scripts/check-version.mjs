/**
 * Fails when template-version.json, the latest CHANGELOG.md version heading, the registry snapshot or
 * (in the template itself) package.json, package-lock.json and blueprint.json disagree.
 * Run by CI (`npm run check:version`).
 */
import { existsSync, readFileSync } from 'node:fs'

import { BLUEPRINT_FILE, BLUEPRINT_SINCE, checkBlueprint } from './blueprint-utils.mjs'
import {
  checkPackageVersions,
  compareVersions,
  checkVersionStamp,
  parseSnapshot,
  SNAPSHOT_FILE,
  TEMPLATE_PACKAGE,
} from './release-utils.mjs'

const stamp = JSON.parse(readFileSync('template-version.json', 'utf8'))
const problem = checkVersionStamp(stamp, readFileSync('CHANGELOG.md', 'utf8'))

if (problem) {
  console.error(`Template version check failed: ${problem}`)
  process.exit(1)
}
// The registry snapshot, when there is one, must be the one for this release.
let snapshot = null
if (existsSync(SNAPSHOT_FILE)) {
  try {
    snapshot = parseSnapshot(readFileSync(SNAPSHOT_FILE, 'utf8'), stamp.version)
  } catch (error) {
    console.error(`Template version check failed: ${error.message}`)
    process.exit(1)
  }
}
const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null)
const pkg = readJson('package.json')
const packageProblem = checkPackageVersions(stamp, pkg, readJson('package-lock.json'))
if (packageProblem) {
  console.error(`Template version check failed: ${packageProblem}`)
  process.exit(1)
}
// The template's blueprint, from the release that introduced it. A client site's copy (merged with
// a template tag) describes the template, so it isn't checked against the client's own files.
if (pkg?.name === TEMPLATE_PACKAGE) {
  const blueprintProblems = existsSync(BLUEPRINT_FILE)
    ? checkBlueprint(readFileSync(BLUEPRINT_FILE, 'utf8'), { stamp, snapshot })
    : compareVersions(stamp.version, BLUEPRINT_SINCE) >= 0
      ? [
          `${BLUEPRINT_FILE} is missing. Every release from ${BLUEPRINT_SINCE} has one: run \`npm run release\`.`,
        ]
      : []
  if (blueprintProblems.length > 0) {
    console.error(
      `Template version check failed:\n${blueprintProblems.map((p) => `  - ${p}`).join('\n')}`,
    )
    process.exit(1)
  }
}
console.log(`Template version ${stamp.version} matches CHANGELOG.md and package.json.`)
