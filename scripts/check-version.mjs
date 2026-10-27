/**
 * Fails when template-version.json, the latest CHANGELOG.md version heading, the registry snapshot or
 * (in the template itself) package.json and package-lock.json disagree.
 * Run by CI (`npm run check:version`).
 */
import { existsSync, readFileSync } from 'node:fs'

import {
  checkPackageVersions,
  checkVersionStamp,
  parseSnapshot,
  SNAPSHOT_FILE,
} from './release-utils.mjs'

const stamp = JSON.parse(readFileSync('template-version.json', 'utf8'))
const problem = checkVersionStamp(stamp, readFileSync('CHANGELOG.md', 'utf8'))

if (problem) {
  console.error(`Template version check failed: ${problem}`)
  process.exit(1)
}
// The registry snapshot, when there is one, must be the one for this release.
if (existsSync(SNAPSHOT_FILE)) {
  try {
    parseSnapshot(readFileSync(SNAPSHOT_FILE, 'utf8'), stamp.version)
  } catch (error) {
    console.error(`Template version check failed: ${error.message}`)
    process.exit(1)
  }
}
const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null)
const packageProblem = checkPackageVersions(
  stamp,
  readJson('package.json'),
  readJson('package-lock.json'),
)
if (packageProblem) {
  console.error(`Template version check failed: ${packageProblem}`)
  process.exit(1)
}
console.log(`Template version ${stamp.version} matches CHANGELOG.md and package.json.`)
