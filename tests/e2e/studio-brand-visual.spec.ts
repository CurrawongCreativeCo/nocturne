import { expect, test } from '@playwright/test'

import { brandPreviewCases } from '../../src/features/studio/brand-preview/cases'

/**
 * Visual regression for the CMS brand: one screenshot per brand and colour scheme from
 * /studio-brand-preview, desktop only (the page is a fixed two-column kit; mobile only stacks it).
 * Baselines are Linux-only, like visual.spec.ts, and are refreshed by the same
 * "Update visual baselines" workflow (`npm run test:e2e:update` matches "visual").
 */
test.skip(
  process.platform !== 'linux' && !process.env.E2E_VISUAL_ANY_OS,
  'Baselines are rendered on Linux; set E2E_VISUAL_ANY_OS=1 to compare on this system anyway',
)

test.use({ reducedMotion: 'reduce' })

for (const item of brandPreviewCases) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`${item.label}, ${scheme}`, async ({ page, isMobile }) => {
      test.skip(isMobile, 'Desktop only')
      await page.goto('/studio-brand-preview')
      await expect(page.locator('main[data-ready="true"]')).toBeVisible()
      const section = page.locator(`[data-case="${item.id}"][data-scheme="${scheme}"]`)
      await page.evaluate(() => document.fonts.ready)
      await expect(section).toHaveScreenshot(`studio-brand-${item.id}-${scheme}.png`)
    })
  }
}
