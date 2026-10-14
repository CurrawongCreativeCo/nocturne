/**
 * Fails when template-version.json and the latest CHANGELOG.md version heading disagree.
 * Run by CI (`npm run check:version`).
 */
import { readFileSync } from 'node:fs'

import { checkVersionStamp } from './release-utils.mjs'

const stamp = JSON.parse(readFileSync('template-version.json', 'utf8'))
const problem = checkVersionStamp(stamp, readFileSync('CHANGELOG.md', 'utf8'))

if (problem) {
  console.error(`Template version check failed: ${problem}`)
  process.exit(1)
}
console.log(`Template version ${stamp.version} matches CHANGELOG.md.`)
