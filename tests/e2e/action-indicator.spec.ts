import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * The action indicator (README, "Action indicator"): the arrow at the end of a card that is one link.
 * Two structures carry it: the link is the whole card (the Link list's Glass rows, `/link-screen`), and a
 * title link is stretched over a card that cannot take focus (the Events List, `/events`). In both,
 * hover and keyboard focus move it the same distance, reduced motion keeps it still, and the card stays
 * one keyboard destination. The movement is CSS only, so it is read from the computed `translate`.
 */
test.skip(
  ({ isMobile }) => isMobile,
  'Desktop only: hover and the Events chevron need a wide screen',
)

const WHOLE_CARD = '#main-content li[data-track-event] > a'
const STRETCHED = '#main-content li.group:has([data-link-arrow])'

/** How far the indicator is moved across, in px (0 at rest). */
const shift = (indicator: Locator) =>
  indicator.evaluate((svg) => {
    const moving = svg.closest('[data-action-motion]') ?? svg
    const value = getComputedStyle(moving).translate
    return value === 'none' ? 0 : Number.parseFloat(value)
  })

/** Tabs until the element has keyboard focus (so :focus-visible applies), or fails. */
async function tabTo(page: Page, target: Locator) {
  for (let step = 0; step < 80; step++) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((element) => element === document.activeElement)) return
  }
  throw new Error('The card never took keyboard focus.')
}

test.describe('whole-card link', () => {
  const row = (page: Page) => page.locator(WHOLE_CARD).first()
  const arrow = (page: Page) => row(page).locator('[data-action-motion]')

  test('rests still, moves on hover and on keyboard focus by the same distance', async ({
    page,
  }) => {
    await page.goto('/link-screen')
    await expect(arrow(page)).toHaveCount(1)
    expect(await shift(arrow(page))).toBe(0)

    await row(page).hover()
    await expect.poll(() => shift(arrow(page))).toBeGreaterThan(0)
    const hovered = await shift(arrow(page))

    await page.mouse.move(0, 0)
    await expect.poll(() => shift(arrow(page))).toBe(0)

    await tabTo(page, row(page))
    await expect.poll(() => shift(arrow(page))).toBe(hovered)
  })

  test('is decoration: aria-hidden, and the row is the one link', async ({ page }) => {
    await page.goto('/link-screen')
    await expect(row(page).locator('[data-link-arrow]')).toHaveAttribute('aria-hidden', 'true')
    await expect(row(page).locator('a, button, [tabindex]')).toHaveCount(0)
  })

  test('reverses across in right-to-left text', async ({ page }) => {
    await page.goto('/link-screen')
    await page.evaluate(() => {
      document.documentElement.setAttribute('dir', 'rtl')
    })
    await row(page).hover()
    await expect.poll(() => shift(arrow(page))).toBeLessThan(0)
  })
})

test.describe('a link stretched over its card', () => {
  const card = (page: Page) => page.locator(STRETCHED).first()
  const arrow = (page: Page) => card(page).locator('[data-action-motion]')
  const link = (page: Page) => card(page).locator('a').first()

  test('moves on hover and on keyboard focus of the stretched link, by the same distance', async ({
    page,
  }) => {
    await page.goto('/events')
    await expect(arrow(page)).toHaveCount(1)
    expect(await shift(arrow(page))).toBe(0)

    await card(page).hover()
    await expect.poll(() => shift(arrow(page))).toBe(4)

    await page.mouse.move(0, 0)
    await expect.poll(() => shift(arrow(page))).toBe(0)

    await tabTo(page, link(page))
    await expect.poll(() => shift(arrow(page))).toBe(4)
  })

  test('is one keyboard destination, and the indicator is not part of it', async ({ page }) => {
    await page.goto('/events')
    await expect(card(page).locator('a')).toHaveCount(1)
    await expect(
      arrow(page).locator('xpath=ancestor-or-self::*[@tabindex or self::a]'),
    ).toHaveCount(0)
    await expect(card(page).locator('[data-link-arrow]')).toHaveAttribute('aria-hidden', 'true')
  })
})

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('hover and focus move nothing, in either structure', async ({ page }) => {
    await page.goto('/link-screen')
    const row = page.locator(WHOLE_CARD).first()
    await row.hover()
    await page.waitForTimeout(300)
    expect(await shift(row.locator('[data-action-motion]'))).toBe(0)

    await page.goto('/events')
    const card = page.locator(STRETCHED).first()
    await card.hover()
    await page.waitForTimeout(300)
    expect(await shift(card.locator('[data-action-motion]'))).toBe(0)
    await tabTo(page, card.locator('a').first())
    await page.waitForTimeout(300)
    expect(await shift(card.locator('[data-action-motion]'))).toBe(0)
  })
})
