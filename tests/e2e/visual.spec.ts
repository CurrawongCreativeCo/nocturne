import { readFileSync, readdirSync } from 'node:fs'

import { expect } from '@playwright/test'

import { galleryIds } from './fixtures/dataset.mjs'
import { test } from './fixtures/test'
import { settleImagesAndFonts } from './settle'

/**
 * Visual regression: one screenshot per section (and per variant) from the section gallery, on
 * desktop and mobile. The gallery renders the fixture page `section-gallery`; each section's `_key`
 * is its id and names its baseline (tests/e2e/visual.spec.ts-snapshots/<id>-<project>-linux.png).
 *
 * Baselines are Linux-only: other systems draw text differently. CI is Linux; on macOS or Windows
 * refresh them in Docker (see the README's "Section gallery").
 */
test.skip(
  process.platform !== 'linux' && !process.env.E2E_VISUAL_ANY_OS,
  'Baselines are rendered on Linux; set E2E_VISUAL_ANY_OS=1 to compare on this system anyway',
)

const GALLERY = '/section-gallery'

/** Stands in for every Sanity CDN image, so the screenshots never depend on the network. */
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#ec4899"/>
  </linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
</svg>`

const FRAME_FILE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill-rule="evenodd" d="M0 0H100V100H0Z M4 4V96H96V4Z"/></svg>`

test.use({ reducedMotion: 'reduce' })

/** Location's "Open now" badge reads the clock: pin it so the badge text is the same on every run. */
const FRIDAY_MORNING = new Date('2026-10-16T10:00:00+11:00')

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FRIDAY_MORNING)
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
  // An approved custom frame is a mask: serve an outline, not the placeholder, which would cover the picture.
  await page.route('https://cdn.sanity.io/files/**/*.svg', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: FRAME_FILE }),
  )
  await page.route(
    'https://cdn.sanity.io/images/**/cccccccccccccccccccccccccccccccccccccccc-*',
    (route) =>
      route.fulfill({
        contentType: 'image/webp',
        body: readFileSync('tests/e2e/fixtures/frame-picture.webp'),
      }),
  )
  await page.goto(GALLERY)
  await settleImagesAndFonts(page)
})

test.describe('section gallery', () => {
  test('shows every section type and variant', async ({ page }) => {
    const labels = await page.locator('[data-gallery-section] > p').allTextContents()

    // A section type is registered by its insert-menu thumbnail (public/section-previews/<type>.svg).
    const types = readdirSync('public/section-previews')
      .filter((file) => file.endsWith('.svg') && !file.startsWith('_'))
      .map((file) => file.replace(/\.svg$/, ''))
    for (const type of types) {
      expect(
        labels.some((label) => label === type || label.startsWith(`${type} (`)),
        `no ${type} section in the gallery: add one to the fixture page in tests/e2e/fixtures/dataset.mjs`,
      ).toBe(true)
    }

    expect(labels).toEqual(
      expect.arrayContaining([
        'ctaBanner (brand tone)',
        'ctaBanner (dark tone)',
        'ctaBanner (light tone)',
        'hero (overlay)',
        'hero (split)',
        'hero (editorial)',
        'hero (full-bleed)',
        'mediaText (image left)',
        'mediaText (image right)',
        'mediaText (no image)',
        'featuresGrid (2 columns)',
        'featuresGrid (3 columns)',
        'featuresGrid (4 columns)',
      ]),
    )
    expect(labels).toHaveLength(galleryIds.length)
  })

  for (const id of galleryIds) {
    test(`looks the same: ${id}`, async ({ page }) => {
      const section = page.locator(`[data-gallery-section="${id}"]`)
      await section.scrollIntoViewIfNeeded()
      await expect(section).toHaveScreenshot(`${id}.png`)
    })
  }
})
