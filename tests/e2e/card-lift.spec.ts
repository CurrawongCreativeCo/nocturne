import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * Hover lift (README, "Depth and glow"): a card that is one link rises a little under the pointer and
 * keyboard focus, with a deeper shadow that only fades in. `/card-depth` has a team card that links to a
 * member's page with Lift chosen, one with None, and one with nothing chosen. The movement is CSS only,
 * so it is read from the computed transform and opacity.
 */
test.skip(({ isMobile }) => isMobile, 'Desktop only: hover needs a pointer')
// The suite runs with reduced motion on (playwright.config.ts); a lift is only drawn without it.
test.use({ reducedMotion: 'no-preference' })

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const section = (page: Page, title: string) =>
  page.locator('#main-content section').filter({ has: page.getByRole('heading', { name: title }) })
const lifted = (page: Page) => section(page, 'Team lift').locator('.card-lift')
const card = (page: Page, title: string) =>
  section(page, title).locator('div.relative.rounded-card').first()

/** How far an element is raised, in px (0 at rest). */
const rise = (element: Locator) =>
  element.evaluate((node) => {
    const value = getComputedStyle(node).transform
    return value === 'none' ? 0 : -Number.parseFloat(value.split(',')[5] ?? '0')
  })
const layerOpacity = (wrapper: Locator) =>
  wrapper
    .locator('.card-lift__shadow')
    .evaluate((node) => Number.parseFloat(getComputedStyle(node).opacity))

/** Tabs until the element has keyboard focus (so :focus-visible applies), or fails. */
async function tabTo(page: Page, target: Locator) {
  for (let step = 0; step < 120; step++) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((element) => element === document.activeElement)) return
  }
  throw new Error('The card’s link never took keyboard focus.')
}

test.describe('a linked card with Lift chosen', () => {
  test('rests still, rises 4 px with a deeper shadow on hover, and settles back', async ({
    page,
  }) => {
    await page.goto('/card-depth')
    await expect(lifted(page)).toHaveCount(1)
    expect(await rise(lifted(page))).toBe(0)
    expect(await layerOpacity(lifted(page))).toBe(0)

    await lifted(page).hover()
    await expect.poll(() => rise(lifted(page))).toBe(4)
    await expect.poll(() => layerOpacity(lifted(page))).toBe(1)

    await page.mouse.move(0, 0)
    await expect.poll(() => rise(lifted(page))).toBe(0)
    await expect.poll(() => layerOpacity(lifted(page))).toBe(0)
  })

  test('rises the same way on keyboard focus, with the link’s own focus outline showing', async ({
    page,
  }) => {
    await page.goto('/card-depth')
    const link = lifted(page).locator('a').first()
    await tabTo(page, link)
    await expect.poll(() => rise(lifted(page))).toBe(4)
    await expect.poll(() => layerOpacity(lifted(page))).toBe(1)
    const outline = await link.evaluate((node) => {
      const style = getComputedStyle(node)
      return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) }
    })
    expect(outline.style).toBe('solid')
    expect(outline.width).toBeGreaterThan(0)
  })

  test('leaves the shadow layer room to draw: the wrapper clips nothing, and is still one link', async ({
    page,
  }) => {
    await page.goto('/card-depth')
    const overflow = await lifted(page).evaluate((node) => getComputedStyle(node).overflow)
    expect(overflow).toBe('visible')
    const layer = await lifted(page)
      .locator('.card-lift__shadow')
      .evaluate((node) => ({
        shadow: getComputedStyle(node).boxShadow,
        hidden: node.getAttribute('aria-hidden'),
      }))
    expect(layer.shadow).not.toBe('none')
    expect(layer.hidden).toBe('true')
    await expect(lifted(page).locator('a')).toHaveCount(1)
  })

  test('has no serious accessibility violations', async ({ page }) => {
    await page.goto('/card-depth')
    const { violations } = await new AxeBuilder({ page })
      .include('#main-content')
      .withTags(WCAG)
      .analyze()
    expect(violations.map(({ id }) => id)).toEqual([])
  })
})

test.describe('cards with None, or nothing, chosen', () => {
  test('None draws no lift wrapper and replaces the Motion rise a card has when nothing is chosen', async ({
    page,
  }) => {
    await page.goto('/card-depth')
    await expect(section(page, 'Team none').locator('.card-lift')).toHaveCount(0)
    await card(page, 'Team none').hover()
    await page.waitForTimeout(400)
    expect(await rise(card(page, 'Team none'))).toBe(0)
  })

  test('nothing chosen keeps the card’s own Motion rise and draws no lift wrapper', async ({
    page,
  }) => {
    await page.goto('/card-depth')
    await expect(section(page, 'Team unset').locator('.card-lift')).toHaveCount(0)
    await card(page, 'Team unset').hover()
    await expect.poll(() => rise(card(page, 'Team unset'))).toBe(4)
  })
})

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('hover and focus move nothing and show no extra shadow', async ({ page }) => {
    await page.goto('/card-depth')
    await lifted(page).hover()
    await page.waitForTimeout(400)
    expect(await rise(lifted(page))).toBe(0)
    expect(await layerOpacity(lifted(page))).toBe(0)
    await tabTo(page, lifted(page).locator('a').first())
    await page.waitForTimeout(400)
    expect(await rise(lifted(page))).toBe(0)
    expect(await layerOpacity(lifted(page))).toBe(0)
  })
})
