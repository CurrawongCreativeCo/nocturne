import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

import { expect, test } from '@playwright/test'

/** Gzipped JavaScript the home page may load, in KB (1 KB = 1000 bytes). See README "Performance budgets". */
const JS_BUDGET_KB = 200

const STATIC_PREFIX = '/_next/static/'

// The same HTML and chunks on every device, so run once.
test('home page JavaScript stays within the gzip budget', async ({ request, isMobile }) => {
  test.skip(isMobile, 'Desktop only')

  const html = await (await request.get('/')).text()
  const srcs = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1] ?? '')
  const chunks = [...new Set(srcs.map((src) => new URL(src, 'http://localhost').pathname))]
  expect(chunks.length, 'no <script src> found in the home page HTML').toBeGreaterThan(0)

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
    `JavaScript is ${(total / 1000).toFixed(1)} KB gzipped, over the ${JS_BUDGET_KB} KB budget:\n${breakdown}`,
  ).toBeLessThanOrEqual(JS_BUDGET_KB * 1000)
})
