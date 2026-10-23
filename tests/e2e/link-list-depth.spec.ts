import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * Depth and glow (README, "Link list"): `/link-depth` has Cards with floating links, raised social
 * buttons and a raised picture with a Highlight glow on a dark tone; Glass rows with only a glow; and
 * a Minimal list with nothing chosen, which must look as it always did.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const section = (page: Page, name: string) =>
  page.locator('#main-content section').filter({ has: page.getByRole('heading', { name }) })
const shadow = (page: Page, name: string, link: string) =>
  section(page, name)
    .getByRole('link', { name: link })
    .evaluate((el) => getComputedStyle(el).boxShadow)

test.describe('Link list depth and glow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/link-depth')
  })

  test('nothing chosen keeps the layout’s own card shadow and border', async ({ page }) => {
    const value = await shadow(page, 'Nothing chosen', 'Plain link')
    // The card token (two layers) plus the inset 1 px ring the layout uses as its border.
    expect(value).toContain('0px 1px 3px 0px')
    expect(value).toContain('inset')
  })

  test('a chosen level replaces the shadow and keeps the border, with the glow added', async ({
    page,
  }) => {
    const value = await shadow(page, 'Floating cards', 'Floating link')
    expect(value).toContain('0px 20px 40px -12px')
    expect(value).not.toContain('0px 1px 3px 0px')
    expect(value).toContain('inset')
    // The glow: no offset, an 18 px blur.
    expect(value).toMatch(/0px 0px 18px 0px/)
  })

  test('a glow on its own keeps the glass’s shadow', async ({ page }) => {
    const value = await shadow(page, 'Glowing glass', 'Glass link')
    expect(value).toContain('0px 8px 32px 0px')
    expect(value).toMatch(/0px 0px 28px 4px/)
  })

  test('social buttons and the picture take their own levels', async ({ page }) => {
    const cards = section(page, 'Floating cards')
    const social = await cards
      .getByRole('link', { name: 'Instagram' })
      .evaluate((el) => getComputedStyle(el).boxShadow)
    expect(social).toContain('0px 10px 15px -3px')
    // Not ticked for the glow, so no halo.
    expect(social).not.toMatch(/0px 0px 18px 0px/)
    const filter = await cards
      .locator('[data-profile-image]')
      .evaluate((el) => getComputedStyle(el).filter)
    expect(filter).toContain('drop-shadow')
  })

  test('the page passes axe', async ({ page }) => {
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })
})
