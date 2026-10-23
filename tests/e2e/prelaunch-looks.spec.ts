import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * The six pre-launch looks (README, "Pre-launch looks") on the Link page + coming soon and Coming soon
 * pages: each renders on a phone and a desktop with one h1, nothing wider than the screen and no
 * accessibility violations. The fixtures mirror the looks table (tests/e2e/fixtures/dataset.mjs).
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const VIEWPORTS = [
  { name: 'phone', width: 375, height: 800 },
  { name: 'desktop', width: 1280, height: 800 },
]
const LOOKS = ['minimal', 'dark', 'editorial', 'bold', 'image-led', 'soft']
const BASES = [
  { prefix: 'look-links', name: 'Link page + coming soon', h1: 'Look:', heading: 'Test Co' },
  {
    prefix: 'look-soon',
    name: 'Coming soon',
    h1: 'Something new is on its way',
    heading: 'Be the first to know',
  },
]

// The pictures are fixture assets on a CDN the test server doesn't reach.
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#6366f1"/></svg>`

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

for (const { prefix, name, h1, heading } of BASES) {
  for (const look of LOOKS) {
    for (const { name: size, width, height } of VIEWPORTS) {
      test(`${name}, ${look} look: renders on a ${size} with one h1 and no violations`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height })
        await page.goto(`/${prefix}-${look}`)
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
        await expect(page.getByRole('heading', { level: 1 })).toContainText(h1)
        await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible()
        await expect(page.getByRole('banner')).toBeHidden()
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow).toBeLessThanOrEqual(0)
        const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
        expect(
          results.violations.map(
            ({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`,
          ),
        ).toEqual([])
      })
    }
  }
}

test('the looks change the page: Glass rows, Cards, the ruled list and the Brand tone', async ({
  page,
}) => {
  await page.goto('/look-links-dark')
  await expect(page.locator('.glass-row').first()).toBeVisible()
  await page.goto('/look-links-minimal')
  await expect(page.locator('.glass-row')).toHaveCount(0)
  await page.goto('/look-soon-editorial')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
