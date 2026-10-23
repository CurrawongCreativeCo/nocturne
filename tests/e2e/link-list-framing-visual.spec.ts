import { expect, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * Screenshots of `/link-framing` (tests/e2e/link-list-framing.spec.ts): the profile picture in a
 * circle, a rounded square, a ring and a frame, and thumbnails in every layout. Linux-only, like
 * visual.spec.ts; the file name contains "visual" so the "Update visual baselines" workflow
 * regenerates the baselines. The CDN is a stand-in, so these show layout and shape, not the area
 * the CDN would cut (the spec beside this one asserts that from the URLs).
 */
test.use({ reducedMotion: 'reduce' })
test.skip(
  process.platform !== 'linux' && !process.env.E2E_VISUAL_ANY_OS,
  'Visual baselines are Linux-only; refresh them with the "Update visual baselines" workflow',
)
test.skip(({ isMobile }) => isMobile, 'Sized explicitly below')

async function open(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/link-framing')
  await expect(page.locator('#main-content li[data-track-event]').first()).toBeVisible()
  // Pictures decode before the shot, so a late one can't change the page's height.
  await page.evaluate(() =>
    Promise.all([...document.images].map((image) => image.decode().catch(() => undefined))),
  )
}

for (const width of [375, 768, 1280]) {
  test(`framed pictures at ${width}px`, async ({ page }) => {
    await open(page, width)
    await expect(page.locator('#main-content')).toHaveScreenshot(`link-framing-${width}.png`)
  })
}
