import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

import { galleryIds } from './fixtures/dataset.mjs'
import { test } from './fixtures/test'

/**
 * The Gallery section and its lightbox (README, "Gallery"), on a real page (/gallery; the section
 * gallery has no MotionProvider, so it only shows the layouts). The grid has twelve pictures
 * ("gallery-page-grid picture 1"...), every other one captioned, and the slider six.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PAGE = '/gallery'
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

const thumbnail = (page: Page, n: number, total = 12) =>
  page.getByRole('button', { name: new RegExp(`^Open image ${n} of ${total}: `) })
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Grid gallery: image viewer' })

/** Waits until the page has hydrated and Motion's features (which the swipe needs) have downloaded. */
const ready = async (page: Page) => {
  await page.goto(PAGE)
  await page.waitForLoadState('networkidle')
}

test('thumbnails are buttons named by their position and alt text', async ({ page }) => {
  await page.goto(PAGE)
  await expect(page.getByRole('heading', { level: 2, name: 'Grid gallery' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Open image \d+ of 12: / })).toHaveCount(12)
  await expect(thumbnail(page, 3)).toHaveAccessibleName(
    'Open image 3 of 12: gallery-page-grid picture 3',
  )
  // Named by the button, so the picture inside says nothing more.
  await expect(thumbnail(page, 3).locator('img')).toHaveAttribute('alt', '')
})

test('the lightbox code is only downloaded when a picture is opened', async ({ page }) => {
  const scripts: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(request.url())
  })
  await ready(page)
  const before = scripts.length
  await expect(dialog(page)).toHaveCount(0)

  await thumbnail(page, 2).click()
  await expect(dialog(page)).toBeVisible()
  expect(scripts.length).toBeGreaterThan(before)
})

test('opens on the picture clicked, moves by keyboard, closes with Escape and returns focus', async ({
  page,
}) => {
  await ready(page)
  await thumbnail(page, 3).click()

  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page).getByText('3 of 12', { exact: true })).toBeVisible()
  await expect(dialog(page).getByText('Caption for gallery-page-grid picture 3')).toBeVisible()

  await page.keyboard.press('ArrowRight')
  await expect(dialog(page).getByText('4 of 12', { exact: true })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(dialog(page).getByText('5 of 12', { exact: true })).toBeVisible()
  await expect(dialog(page).getByText('Caption for gallery-page-grid picture 5')).toBeVisible()
  await page.keyboard.press('ArrowLeft')
  await expect(dialog(page).getByText('4 of 12', { exact: true })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog(page)).toHaveCount(0)
  // The picture that opened it, not the one it ended on.
  await expect(thumbnail(page, 3)).toBeFocused()
})

test('the buttons step through the pictures and Close returns focus', async ({ page }) => {
  await ready(page)
  await thumbnail(page, 12).click()
  const viewer = dialog(page)
  await expect(viewer.getByText('12 of 12', { exact: true })).toBeVisible()
  await expect(viewer.getByRole('button', { name: 'Next slide' })).toBeDisabled()

  await viewer.getByRole('button', { name: 'Previous slide' }).click()
  await expect(viewer.getByText('11 of 12', { exact: true })).toBeVisible()

  await viewer.getByRole('button', { name: 'Close' }).click()
  await expect(viewer).toHaveCount(0)
  await expect(thumbnail(page, 12)).toBeFocused()
})

test('only the current and neighbouring pictures are loaded', async ({ page }) => {
  await ready(page)
  await thumbnail(page, 5).click()
  const pictures = dialog(page).locator('img')
  await expect(pictures).toHaveCount(3)

  await page.keyboard.press('ArrowRight')
  await expect(dialog(page).getByText('6 of 12', { exact: true })).toBeVisible()
  await expect(pictures).toHaveCount(3)

  await page.keyboard.press('Escape')
  await thumbnail(page, 1).click()
  await expect(dialog(page).locator('img')).toHaveCount(2)
})

test('passes axe with the lightbox open', async ({ page }) => {
  await ready(page)
  await thumbnail(page, 2).click()
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page).getByText('2 of 12', { exact: true })).toBeVisible()

  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(violations).toEqual([])
})

test('the page passes axe with the lightbox closed', async ({ page }) => {
  await page.goto(PAGE)
  const { violations } = await new AxeBuilder({ page }).include('main').withTags(WCAG).analyze()
  expect(violations).toEqual([])
})

test('the slider layout opens the lightbox too', async ({ page }) => {
  await ready(page)
  const carousel = page.getByRole('region', { name: 'Slider gallery', exact: true })
  await expect(carousel.getByRole('button', { name: 'Next slide' })).toBeVisible()

  const first = carousel.getByRole('button', { name: /^Open image 1 of 6: / })
  await first.click()
  const viewer = page.getByRole('dialog', { name: 'Slider gallery: image viewer' })
  await expect(viewer.getByText('1 of 6', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(first).toBeFocused()
})

test('swiping down closes the lightbox', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mouse drag is a desktop gesture')
  await ready(page)
  await thumbnail(page, 4).click()
  const viewer = dialog(page)
  await expect(viewer).toBeVisible()
  await expect(viewer.getByText('4 of 12', { exact: true })).toBeVisible()

  const box = await viewer.boundingBox()
  if (!box) throw new Error('The lightbox has no box')
  const x = box.x + box.width / 2
  const y = box.y + 120
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + 100, { steps: 5 })
  await page.mouse.move(x, y + 400, { steps: 10 })
  await page.mouse.up()

  await expect(viewer).toHaveCount(0)
  await expect(thumbnail(page, 4)).toBeFocused()
})

test('a short swipe down springs back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mouse drag is a desktop gesture')
  await ready(page)
  await thumbnail(page, 4).click()
  const viewer = dialog(page)
  await expect(viewer.getByText('4 of 12', { exact: true })).toBeVisible()

  const box = await viewer.boundingBox()
  if (!box) throw new Error('The lightbox has no box')
  const x = box.x + box.width / 2
  await page.mouse.move(x, box.y + 120)
  await page.mouse.down()
  await page.mouse.move(x, box.y + 150, { steps: 5 })
  await page.waitForTimeout(400)
  await page.mouse.up()

  await expect(viewer).toBeVisible()
})

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the lightbox still opens, moves and closes', async ({ page }) => {
    await ready(page)
    await thumbnail(page, 1).click()
    await expect(dialog(page).getByText('1 of 12', { exact: true })).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(dialog(page).getByText('2 of 12', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(thumbnail(page, 1)).toBeFocused()
  })
})

test('the section gallery has every layout, and they pass axe', async ({ page }) => {
  const ids = ['gallery-grid', 'gallery-grid-four', 'gallery-masonry', 'gallery-slider']
  expect(galleryIds).toEqual(expect.arrayContaining(ids))
  await page.goto('/section-gallery')
  for (const id of ids) {
    const { violations } = await new AxeBuilder({ page })
      .include(`[data-gallery-section="${id}"]`)
      .withTags(WCAG)
      .analyze()
    expect(
      violations.map(({ id: rule }) => rule),
      id,
    ).toEqual([])
  }
})
