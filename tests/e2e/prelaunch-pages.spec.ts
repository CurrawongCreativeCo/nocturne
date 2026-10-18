import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * The "Coming soon" and "Under construction" page templates (README, "Pre-launch pages"), built from
 * existing sections: a minimal page (no header or footer) that search engines are told to skip.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const VIEWPORTS = [
  { name: 'phone', width: 375, height: 800 },
  { name: 'desktop', width: 1280, height: 800 },
]

const PAGES = [
  { path: '/coming-soon', h1: 'Something new is on its way', section: 'Be the first to know' },
  { path: '/under-construction', h1: 'We’re updating our website', section: 'Send us a message' },
]

for (const { path, h1, section } of PAGES) {
  test.describe(path, () => {
    for (const { name, width, height } of VIEWPORTS) {
      test(`renders on a ${name} with one h1 and no accessibility violations`, async ({ page }) => {
        await page.setViewportSize({ width, height })
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1)
        await expect(page.getByRole('heading', { name: section })).toBeVisible()
        // A minimal page: no site header or footer.
        await expect(page.getByRole('banner')).toBeHidden()
        await expect(page.getByRole('contentinfo')).toBeHidden()
        // Nothing wider than the screen.
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow).toBeLessThanOrEqual(0)
        const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
        expect(results.violations).toEqual([])
      })
    }

    test('asks search engines to skip it', async ({ page, request }) => {
      await page.goto(path)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
      const sitemap = await (await request.get('/sitemap.xml')).text()
      expect(sitemap).not.toContain(path)
    })
  })
}

test('Coming soon keeps the "Replace:" placeholder visible until the editor changes it', async ({
  page,
}) => {
  await page.goto('/coming-soon')
  await expect(page.getByText('Replace: Opening [date]')).toBeVisible()
})
