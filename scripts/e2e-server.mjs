/**
 * Starts the site under test for Lighthouse CI: the fake Content Lake plus `next start` on a
 * production build, with the same ports and env as playwright.config.ts (tests/e2e/constants.ts).
 * Builds with the gallery disabled after the fake lake answers, so stale or preview-only output
 * cannot affect the measurement. Prints "Ready" when the site answers; stops both servers on exit.
 */
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

import { APP_ENV, APP_PORT, FAKE_SANITY_PORT } from '../tests/e2e/constants.ts'

const require = createRequire(import.meta.url)
const next = require.resolve('next/dist/bin/next')
const env = {
  ...process.env,
  ...APP_ENV,
  E2E_GALLERY: '0',
  FAKE_SANITY_PORT: String(FAKE_SANITY_PORT),
}
const children = new Set()
process.on('exit', () => {
  for (const child of children) child.kill()
})
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => process.exit(0))
}

function start(args, building = false) {
  // Use the same Node executable on Windows too, without npm/npx selecting a global installation.
  const child = spawn(process.execPath, args, { env, stdio: 'inherit' })
  children.add(child)
  child.on('error', (error) => {
    console.error(error)
    process.exit(1)
  })
  child.on('exit', (code) => {
    children.delete(child)
    if (!building || code !== 0) process.exit(code || 1)
  })
  return child
}

async function waitFor(url) {
  const deadline = Date.now() + 240_000
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      // Not up yet. The deadline also bounds startup outside LHCI.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

start(['tests/e2e/fake-sanity.mjs'])
await waitFor(`http://localhost:${FAKE_SANITY_PORT}/__fixture/mutations`)
const build = start([next, 'build'], true)
await new Promise((resolve) => build.on('exit', resolve))
start([next, 'start', '-p', String(APP_PORT)])
await waitFor(`http://localhost:${APP_PORT}/`)
console.log('Ready')
