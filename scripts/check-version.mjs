/**
 * Fails when template-version.json and the latest CHANGELOG.md version heading disagree.
 * Run by CI (`npm run check:version`).
 */
import { existsSync, readFileSync } from 'node:fs'

import { checkVersionStamp, parseSnapshot, SNAPSHOT_FILE } from './release-utils.mjs'

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
console.log(`Template version ${stamp.version} matches CHANGELOG.md.`)
