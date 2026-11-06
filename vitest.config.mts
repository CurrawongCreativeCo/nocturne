import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * The generator CI jobs add a section that has no snapshots yet (the output-parity and capability
 * availability ones). In CI a missing snapshot fails; `VITEST_NEW_SNAPSHOTS=1` writes new ones and still
 * fails any that changed. It is only honoured on a developer's machine and in the `generators` job (the
 * throwaway checkouts of .github/workflows/ci.yml): set anywhere else in CI it stops the run, so a normal
 * run can never write a snapshot and pass. It never touches Playwright's screenshots. Tested in
 * src/app/new-snapshots-flag.test.ts.
 */
function snapshotUpdate() {
  if (!process.env.VITEST_NEW_SNAPSHOTS) return {}
  if (process.env.CI && process.env.GITHUB_JOB !== 'generators') {
    throw new Error(
      `VITEST_NEW_SNAPSHOTS writes new snapshots, which only the generators job may do (this is the "${process.env.GITHUB_JOB ?? 'unknown'}" job).`,
    )
  }
  return { update: 'new' as const }
}

/** Unit tests for pure logic. Browser tests live in tests/e2e (Playwright). */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs', 'migrations/**/*.test.ts'],
    environment: 'node',
    ...snapshotUpdate(),
  },
})
