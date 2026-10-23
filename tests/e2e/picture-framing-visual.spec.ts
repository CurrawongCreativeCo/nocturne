import { expect, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * Screenshots of "Adjust picture" on /studio-brand-preview, in light and dark at a phone and a
 * desktop width. Linux-only, like visual.spec.ts. The file name contains "visual" so that
 * `npm run test:e2e:update` (the "Update visual baselines" workflow) regenerates the baselines.
 * The behaviour tests are in picture-framing.spec.ts.
 */
test.use({ reducedMotion: 'reduce' })
test.skip(
  process.platform !== 'linux' && !process.env.E2E_VISUAL_ANY_OS,
  'Visual baselines are Linux-only; refresh them with the "Update visual baselines" workflow',
)
test.skip(({ isMobile }) => isMobile, 'Sized explicitly below')

const SCHEMES = ['light', 'dark'] as const

async function openDialog(page: Page, scheme: string) {
  await page.goto('/studio-brand-preview')
  await expect(page.locator('main[data-ready="true"]')).toBeVisible()
  const holder = page.locator(`[data-framing-scheme="${scheme}"] [data-framing-example="circle"]`)
  await holder.scrollIntoViewIfNeeded()
  await holder.getByRole('button', { name: 'Adjust picture' }).click()
  const dialog = page.getByRole('dialog', { name: 'Adjust picture' })
  await expect(dialog).toBeVisible()
  return dialog
}

for (const scheme of SCHEMES) {
  for (const width of [390, 1280]) {
    test(`the dialog at ${width}px, ${scheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
      const dialog = await openDialog(page, scheme)
      await expect(dialog).toHaveScreenshot(`picture-framing-${scheme}-${width}.png`)
    })
  }
}
