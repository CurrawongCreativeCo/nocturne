import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * Gzipped JavaScript the home page may load, in KB (1 KB = 1000 bytes). See README "Performance budgets".
 * Raised from 200 to 220 for Motion (LazyMotion + m adds 16.5 KB under Turbopack; see README "Motion").
 */
const JS_BUDGET_KB = 220

const STATIC_PREFIX = '/_next/static/'

// The same HTML and chunks on every device, so run once. The Link page is a phone-first page people
// open from an Instagram bio on a slow connection, so it keeps to the same budget as the home page.
for (const [name, route] of [
  ['home page', '/'],
  ['Link page', '/links'],
] as const) {
  test(`${name} JavaScript stays within the gzip budget`, async ({ request, isMobile }) => {
    test.skip(isMobile, 'Desktop only')
    await checkBudget(request, route)
  })
}

async function checkBudget(request: APIRequestContext, route: string) {
  const html = await (await request.get(route)).text()
  const srcs = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1] ?? '')
  const chunks = [...new Set(srcs.map((src) => new URL(src, 'http://localhost').pathname))]
  expect(chunks.length, 'no <script src> found in the HTML of ${route}').toBeGreaterThan(0)

  const sizes = await Promise.all(
    chunks.map(async (pathname) => {
      expect(pathname.startsWith(STATIC_PREFIX), `unexpected script ${pathname}`).toBe(true)
      const file = path.join(
        '.next',
        'static',
        decodeURIComponent(pathname.slice(STATIC_PREFIX.length)),
      )
      return { pathname, bytes: gzipSync(await readFile(file), { level: 9 }).length }
    }),
  )

  const total = sizes.reduce((sum, { bytes }) => sum + bytes, 0)
  const breakdown = sizes
    .toSorted((a, b) => b.bytes - a.bytes)
    .map(({ pathname, bytes }) => `${(bytes / 1000).toFixed(1).padStart(7)} KB  ${pathname}`)
    .join('\n')

  test.info().annotations.push({
    type: 'js-gzip',
    description: `${(total / 1000).toFixed(1)} KB of ${JS_BUDGET_KB} KB`,
  })

  expect(
    total,
    `JavaScript on ${route} is ${(total / 1000).toFixed(1)} KB gzipped, over the ${JS_BUDGET_KB} KB budget:\n${breakdown}`,
  ).toBeLessThanOrEqual(JS_BUDGET_KB * 1000)
}
