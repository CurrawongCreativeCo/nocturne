/**
 * Starts the site under test for Lighthouse CI: the fake Content Lake plus `next start` on a
 * production build, with the same ports and env as playwright.config.ts (tests/e2e/constants.ts).
 * Builds first unless .next already exists (CI builds it in the Playwright step); delete .next
 * after changing code. Prints "Ready" when the site answers; stops both servers on exit.
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

import { APP_ENV, APP_PORT, FAKE_SANITY_PORT } from '../tests/e2e/constants.ts'

const env = { ...process.env, ...APP_ENV, FAKE_SANITY_PORT: String(FAKE_SANITY_PORT) }
const shell = process.platform === 'win32'

if (!existsSync('.next/BUILD_ID')) {
  const build = spawnSync('npx', ['next', 'build'], { env, stdio: 'inherit', shell })
  if (build.status !== 0) process.exit(build.status ?? 1)
}

const children = [
  spawn('node', ['tests/e2e/fake-sanity.mjs'], { env, stdio: 'inherit' }),
  spawn('npx', ['next', 'start', '-p', String(APP_PORT)], { env, stdio: 'inherit', shell }),
]
for (const child of children) child.on('exit', (code) => process.exit(code ?? 1))
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const child of children) child.kill()
    process.exit(0)
  })
}

const url = `http://localhost:${APP_PORT}/`
for (;;) {
  try {
    if ((await fetch(url)).ok) break
  } catch {
    // not up yet
  }
  await new Promise((resolve) => setTimeout(resolve, 500))
}
console.log('Ready')
