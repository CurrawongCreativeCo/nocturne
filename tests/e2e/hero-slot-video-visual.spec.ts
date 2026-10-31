import { expect, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * A screenshot of the hero's video block on `/hero-slot-video` (tests/e2e/hero-slot-video.spec.ts):
 * the poster and Play button in a Split hero, then the uploaded video's native player in a Full
 * background hero. Linux-only, like visual.spec.ts; the file name contains "visual" so the "Update
 * visual baselines" workflow regenerates the baseline. The CDN is a stand-in, so the poster is a
 * flat colour: this shows layout, not the picture.
 */
test.use({ reducedMotion: 'reduce' })
test.skip(
  process.platform !== 'linux' && !process.env.E2E_VISUAL_ANY_OS,
  'Visual baselines are Linux-only; refresh them with the "Update visual baselines" workflow',
)

const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`

async function open(page: Page) {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
  await page.goto('/hero-slot-video')
  await expect(page.locator('[data-hero-slot="slotVideo"]').first()).toBeVisible()
  // Pictures decode before the shot, so a late one can't change the page's height.
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => {
        image.loading = 'eager'
        return image.decode().catch(() => undefined)
      }),
    ),
  )
}

test('the hero video block', async ({ page }) => {
  await open(page)
  await expect(page.locator('#main-content')).toHaveScreenshot('hero-slot-video.png')
})
