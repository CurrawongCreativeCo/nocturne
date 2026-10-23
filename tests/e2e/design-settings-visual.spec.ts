import { expect, type APIRequestContext, type Page } from '@playwright/test'

import { test } from './fixtures/test'
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

import { FAKE_SANITY_PORT, REVALIDATE_SECRET } from './constants'

/**
 * Visual regression with the Studio's brand colours: the same gallery sections as visual.spec.ts,
 * drawn in the sample palettes the fake Content Lake serves (tests/e2e/fixtures/dataset.mjs), light and
 * dark. Linux-only baselines, like visual.spec.ts; refresh them with the "Update visual baselines" workflow.
 * It runs in its own Playwright project (playwright.config.ts) because it changes the whole site's colours.
 */
test.skip(
  process.platform !== 'linux' && !process.env.E2E_VISUAL_ANY_OS,
  'Baselines are rendered on Linux; set E2E_VISUAL_ANY_OS=1 to compare on this system anyway',
)
test.describe.configure({ mode: 'serial' })
test.use({ reducedMotion: 'reduce' })

const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#ec4899"/>
  </linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
</svg>`

const SECTIONS = [
  'hero',
  'rich-text',
  'faq',
  'cta-banner-brand',
  'cta-banner-light',
  'features-grid-style-surface',
  'features-grid-style-alt',
  'features-grid-style-inverse',
  'features-grid-style-accent',
  'link-list-glass-rows',
] as const

async function usePalette(request: APIRequestContext, palette: 'off' | 'light' | 'dark') {
  const control = await request.post(
    `http://localhost:${FAKE_SANITY_PORT}/__fixture/design/${palette}`,
  )
  expect(control.status()).toBe(204)
  const body = JSON.stringify({ _type: 'designSettings', _id: 'designSettings' })
  const webhook = await request.post('/api/revalidate', {
    data: body,
    headers: {
      'content-type': 'application/json',
      [SIGNATURE_HEADER_NAME]: await encodeSignatureHeader(body, Date.now(), REVALIDATE_SECRET),
    },
  })
  expect(webhook.status()).toBe(200)
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll('img')) img.loading = 'eager'
    await Promise.all(
      [...document.querySelectorAll('img')].map((img) => img.decode().catch(() => undefined)),
    )
    await document.fonts.ready
  })
}

test.afterAll(async ({ request }) => {
  test.setTimeout(30_000)
  await usePalette(request, 'off')
})

for (const palette of ['light', 'dark'] as const) {
  test.describe(`${palette} sample palette`, () => {
    test.beforeEach(async ({ page, request }) => {
      await page.route('https://cdn.sanity.io/**', (route) =>
        route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
      )
      await usePalette(request, palette)
      // The first request after an expiry may still get the old copy while the new one renders.
      await expect
        .poll(async () => {
          await page.goto('/section-gallery')
          return page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)
        })
        .toBe(palette === 'dark' ? 'dark' : 'normal')
      await settle(page)
    })

    for (const id of SECTIONS) {
      test(`looks the same: ${id}`, async ({ page }) => {
        const section = page.locator(`[data-gallery-section="${id}"]`)
        await section.scrollIntoViewIfNeeded()
        await expect(section).toHaveScreenshot(`${palette}-${id}.png`)
      })
    }

    // Glass rows over a photo take their colours from the palette: Light and Dark Brand colours, at a phone, tablet and laptop width.
    for (const width of [375, 768, 1280]) {
      test(`looks the same: Glass rows page at ${String(width)} px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/link-glass')
        await settle(page)
        await expect(page).toHaveScreenshot(`${palette}-link-glass-${String(width)}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.01,
        })
      })
    }

    test('looks the same: the home page header and first screen', async ({ page }) => {
      await page.goto('/')
      await settle(page)
      // A whole screen with the hero image and gradients: a few shades of dithering between runs
      // can differ without anything having moved, so allow 2% of pixels (the sections stay exact).
      await expect(page).toHaveScreenshot(`${palette}-home.png`, { maxDiffPixelRatio: 0.02 })
    })
  })
}
