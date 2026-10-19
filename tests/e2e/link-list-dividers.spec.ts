import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * Decorative dividers in the Link list (README, "Link list"): `/link-dividers` has a diamond after the
 * profile and around icons above the links, a fading Highlight line around icons below the links,
 * and dividers asked for around social icons that aren't shown.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const section = (page: Page, name: string) =>
  page.locator('#main-content section').filter({ has: page.getByRole('heading', { name }) })
/** The section's direct parts in order: divider style, or what the part is. */
const order = (page: Page, name: string) =>
  section(page, name).evaluate((root) => {
    const marks = root.querySelectorAll('[data-decorative-divider], h2, nav, ul:not(nav ul)')
    return [...marks].map((el) => {
      if (el.hasAttribute('data-decorative-divider')) return 'divider'
      if (el.tagName === 'H2') return 'profile'
      if (el.tagName === 'NAV') return 'social'
      return 'links'
    })
  })

test.describe('Link list dividers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/link-dividers')
  })

  test('sit between parts, and two that would meet become one', async ({ page }) => {
    expect(await order(page, 'Diamond dividers')).toEqual([
      'profile',
      'divider',
      'social',
      'divider',
      'links',
    ])
  })

  test('never end the section: icons below the links get one above them only', async ({ page }) => {
    expect(await order(page, 'Fading dividers')).toEqual(['profile', 'links', 'divider', 'social'])
  })

  test('are left out where there is nothing to divide', async ({ page }) => {
    await expect(
      section(page, 'No icons to divide').locator('[data-decorative-divider]'),
    ).toHaveCount(0)
  })

  test('are decoration only, in the chosen colour and width', async ({ page }) => {
    const divider = section(page, 'Fading dividers').locator('[data-decorative-divider]')
    await expect(divider).toHaveAttribute('aria-hidden', 'true')
    expect(await divider.evaluate((el) => el.style.color)).toBe('var(--color-highlight)')
    const [rule, list] = await Promise.all([
      divider.boundingBox(),
      section(page, 'Fading dividers').getByRole('list').first().boundingBox(),
    ])
    // Full width: as wide as the content.
    expect(Math.round(rule?.width ?? 0)).toBeGreaterThanOrEqual(Math.round((list?.width ?? 0) - 1))
    const diamond = section(page, 'Diamond dividers').locator('[data-decorative-divider]').first()
    await expect(diamond.locator('.rotate-45')).toHaveCount(1)
  })

  test('the page passes axe', async ({ page }) => {
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })
})
