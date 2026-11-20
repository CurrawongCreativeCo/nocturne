import { mkdirSync } from 'node:fs'

import { test } from './fixtures/test'

// Throwaway (Task 3 control): the cut of two pairs at the failing ratios and one that passes, kept as images.
const CASES = [
  { id: 'curve-medium', ratio: 1.25, width: 390 },
  { id: 'curve-medium', ratio: 1.5, width: 411 },
  { id: 'wave-medium', ratio: 1.25, width: 390 },
]
for (const { id, ratio, width } of CASES) {
  test.describe(`${id} at ${String(ratio)}x`, () => {
    test.use({ deviceScaleFactor: ratio })
    test(`shot ${String(width)}px`, async ({ page }) => {
      mkdirSync('control-shots', { recursive: true })
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/edge-seams')
      await page.evaluate(() => document.fonts.ready)
      const below = page.locator(`section#seam-${id}--below`)
      await below.scrollIntoViewIfNeeded()
      await below.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 300))
      await page.waitForTimeout(500)
      await page.screenshot({ path: `control-shots/${id}-${String(ratio)}x-${String(width)}.png` })
    })
  })
}
