import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * The event image's two masks, as "Adjust picture" previews them (task 177; the `eventImage` resolver in
 * src/lib/sanity/image-frame-geometry.ts, whose unit test pins the shapes: `cardTop` and `card`, 16:9, the
 * 16px card corner). These measure what the site actually clips:
 * - Featured, nothing chosen: the picture fills the top of the card, which rounds only the top corners;
 * - Featured with a depth (the picture inset in its 16:9 space) and the event's page: the picture rounds all four.
 */

const CARD_CORNER = '16px'

async function corners(el: Locator) {
  return el.evaluate((node) => {
    const style = getComputedStyle(node)
    return [
      style.borderTopLeftRadius,
      style.borderTopRightRadius,
      style.borderBottomRightRadius,
      style.borderBottomLeftRadius,
    ]
  })
}

async function boxOf(el: Locator) {
  return el.evaluate((node) => {
    const { left, right, top, bottom, width, height } = node.getBoundingClientRect()
    return { left, right, top, bottom, width, height }
  })
}

const section = (page: Page, heading: string) =>
  page
    .locator('#main-content section')
    .filter({ has: page.getByRole('heading', { name: heading, exact: true }) })

test('Featured, nothing chosen: only the top corners are rounded, by the card that clips the picture', async ({
  page,
}) => {
  await page.goto('/picture-depth-events')
  await page.waitForLoadState('networkidle')
  const card = section(page, 'Events nothing chosen').locator('article').first()
  await card.scrollIntoViewIfNeeded()
  const picture = card.locator('img').first()
  expect(await corners(picture)).toEqual(['0px', '0px', '0px', '0px'])
  expect(await card.evaluate((node) => getComputedStyle(node).overflow)).toBe('hidden')
  const [topLeft, topRight] = await corners(card)
  expect([topLeft, topRight]).toEqual([CARD_CORNER, CARD_CORNER])
  // The picture sits flush with the card's top and sides, and ends well above the card's bottom.
  const [c, p] = [await boxOf(card), await boxOf(picture)]
  expect(Math.abs(p.top - c.top)).toBeLessThan(1)
  expect(Math.abs(p.left - c.left)).toBeLessThan(1)
  expect(Math.abs(p.right - c.right)).toBeLessThan(1)
  expect(c.bottom - p.bottom).toBeGreaterThan(40)
  expect(p.width / p.height).toBeCloseTo(16 / 9, 1)
})

test('Featured with a depth: the inset picture rounds all four corners', async ({ page }) => {
  await page.goto('/picture-depth-events')
  await page.waitForLoadState('networkidle')
  const picture = section(page, 'Events floating').locator('article img').first()
  await picture.scrollIntoViewIfNeeded()
  expect(await corners(picture)).toEqual([CARD_CORNER, CARD_CORNER, CARD_CORNER, CARD_CORNER])
  const box = await boxOf(picture)
  expect(box.width / box.height).toBeCloseTo(16 / 9, 1)
})

test('the event page: the picture rounds all four corners', async ({ page }) => {
  await page.goto('/events/pottery-workshop')
  const picture = page.locator('#main-content img').first()
  await expect(picture).toBeVisible()
  expect(await corners(picture)).toEqual([CARD_CORNER, CARD_CORNER, CARD_CORNER, CARD_CORNER])
  const box = await boxOf(picture)
  expect(box.width / box.height).toBeCloseTo(16 / 9, 1)
})
