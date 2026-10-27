/**
 * Clears Next.js's cached Sanity responses before the end-to-end build. The fake Content Lake dates its
 * events from the day the suite runs (tests/e2e/fixtures/dataset.mjs), but `.next/cache/fetch-cache`
 * outlives the day: a build on 27 October reused responses cached on 22 October, so the recurring
 * event's skipped day sat in the wrong week. CI starts clean; this keeps a local run honest too.
 * Only the cached responses go; the compiler caches stay, so builds are still fast.
 */
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

rmSync(resolve('.next', 'cache', 'fetch-cache'), { recursive: true, force: true })
