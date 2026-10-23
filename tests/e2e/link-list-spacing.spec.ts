import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'

import { test } from './fixtures/test'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test('letter spacing applies independently to capitals and divider words', async ({ page }) => {
  await page.goto('/link-spacing')
  for (const [choice, em] of [
    ['normal', 0],
    ['wide', 0.1],
    ['extra-wide', 0.2],
  ] as const) {
    const section = page
      .locator('#main-content section')
      .filter({ has: page.getByRole('heading', { name: `Spacing: ${choice}`, exact: true }) })
    const categories = section.getByRole('list', { name: 'Services', exact: true })
    const words = section.getByText('Stay connected', { exact: true })
    for (const text of [categories, words]) {
      const typography = await text.evaluate((element) => {
        const css = getComputedStyle(element)
        return {
          spacing: css.letterSpacing === 'normal' ? 0 : Number.parseFloat(css.letterSpacing),
          fontSize: Number.parseFloat(css.fontSize),
        }
      })
      expect(typography.spacing).toBeCloseTo(typography.fontSize * em, 2)
    }
    await expect(categories).toHaveCSS('text-transform', 'uppercase')
    await expect(
      section.getByRole('navigation', { name: 'Stay connected', exact: true }),
    ).toBeVisible()
  }
  const result = await new AxeBuilder({ page }).include('#main-content').withTags(WCAG).analyze()
  expect(result.violations).toEqual([])
})
