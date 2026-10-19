import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * Decorative dividers in the Link list (README, "Decorative dividers"): `/link-dividers` rebuilds a
 * client's mock-ups (a short gold line between the categories and the bio, a sun between two lines,
 * "Stay connected" between two lines above the icons), a fading Highlight rule with a diamond, and
 * dividers asked for around icons that aren't shown.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const section = (page: Page, name: string) =>
  page.locator('#main-content section').filter({ has: page.getByRole('heading', { name }) })
/** The section's parts in order, each divider by its middle (or its style). */
const order = (page: Page, name: string) =>
  section(page, name).evaluate((root) =>
    [...root.querySelectorAll('[data-decorative-divider], h2, nav, li[data-track-event]')]
      .filter((el) => el.tagName !== 'LI' || !el.previousElementSibling)
      .map((el) => {
        if (el.hasAttribute('data-decorative-divider')) {
          return `divider:${el.getAttribute('data-divider-centre') ?? el.getAttribute('data-decorative-divider') ?? ''}`
        }
        if (el.tagName === 'H2') return 'name'
        if (el.tagName === 'NAV') return 'social'
        return 'links'
      }),
  )

test.describe('Link list dividers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/link-dividers')
  })

  test('each position has its own look, in the order the mock-ups show', async ({ page }) => {
    expect(await order(page, 'Mock-up dividers')).toEqual([
      'name',
      // Between the categories and the bio, inside the profile.
      'divider:line',
      'divider:icon',
      'links',
      'divider:text',
      'social',
      // Below the icons is dropped: they end the section.
    ])
  })

  test('words in the middle are read out; the lines and other middles are decoration', async ({
    page,
  }) => {
    const mockup = section(page, 'Mock-up dividers')
    await expect(mockup.getByText('Stay connected', { exact: true })).toBeVisible()
    const words = mockup.locator('[data-divider-centre="text"]')
    await expect(words).not.toHaveAttribute('aria-hidden', 'true')
    await expect(words.locator('> span[aria-hidden="true"]')).toHaveCount(2)
    await expect(mockup.locator('[data-divider-centre="icon"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })

  test('colours the lines and the middle separately', async ({ page }) => {
    const words = section(page, 'Mock-up dividers').locator('[data-divider-centre="text"]')
    const [line, text] = await Promise.all([
      words
        .locator('> span[aria-hidden]')
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      words.getByText('Stay connected').evaluate((el) => getComputedStyle(el).color),
    ])
    expect(line).toBe('rgb(138, 109, 29)')
    expect(text).not.toBe(line)
  })

  test('the short line is short, and a full width middle spans the content', async ({ page }) => {
    const mockup = section(page, 'Mock-up dividers')
    const [short, full, links] = await Promise.all([
      mockup.locator('[data-decorative-divider="line"]:not([data-divider-centre])').boundingBox(),
      mockup.locator('[data-divider-centre="text"]').boundingBox(),
      mockup.getByRole('list').first().boundingBox(),
    ])
    expect(Math.round(short?.width ?? 0)).toBe(96)
    expect(Math.round(full?.width ?? 0)).toBeGreaterThanOrEqual(Math.round((links?.width ?? 0) - 1))
  })

  test('where two would meet, the later stays; nothing ends the section', async ({ page }) => {
    expect(await order(page, 'Fading dividers')).toEqual([
      'name',
      'divider:diamond',
      'social',
      'divider:line',
      'links',
    ])
  })

  test('are left out where there is nothing to divide', async ({ page }) => {
    await expect(
      section(page, 'No icons to divide').locator('[data-decorative-divider]'),
    ).toHaveCount(0)
  })

  test('nothing overflows a phone', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('the page passes axe', async ({ page }) => {
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })
})
