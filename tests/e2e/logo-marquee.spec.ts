import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { galleryIds } from './fixtures/dataset.mjs'

/**
 * The Logo strip's Marquee layout (README, "Logo strip"): an endless row moved by CSS, with a Pause
 * button as its only JavaScript. Specs run under reduced motion by default (playwright.config.ts), which
 * is the static grid; the moving row is checked with motion allowed.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const GALLERY = '/section-gallery'
const MARQUEE = '[data-gallery-section="logo-cloud-marquee"]'
const COLOUR = '[data-gallery-section="logo-cloud-marquee-colour"]'
const LOGOS = 5
const PAGE = '/logos'
const PAGE_MARQUEE = '[data-marquee-track]'

const track = (page: Page) => page.locator(`${MARQUEE} [data-marquee-track]`)
const toggle = (page: Page) => page.locator(`${MARQUEE} button`)
const playState = (page: Page) =>
  track(page).evaluate((el) => getComputedStyle(el).animationPlayState)

const violationsOf = async (page: Page, include: string) => {
  const { violations } = await new AxeBuilder({ page }).include(include).withTags(WCAG).analyze()
  return violations.map(
    ({ id: rule, nodes }) => `${rule}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`,
  )
}

test('the gallery has both marquee options', () => {
  expect(galleryIds).toEqual(
    expect.arrayContaining(['logo-cloud', 'logo-cloud-marquee', 'logo-cloud-marquee-colour']),
  )
})

test.describe('the copy of the list', () => {
  test('is hidden from assistive technology and out of the tab order', async ({ page }) => {
    await page.goto(GALLERY)
    const copy = page.locator(`${MARQUEE} [data-marquee-copy]`)
    await expect(copy).toHaveAttribute('aria-hidden', 'true')
    await expect(copy.locator('li')).toHaveCount(LOGOS)
    await expect(copy.locator('a')).toHaveAttribute('tabindex', '-1')
    // The real list names each logo; the copy has no names at all.
    await expect(
      page.locator(`${MARQUEE} [data-marquee-group]:not([aria-hidden]) img`),
    ).toHaveCount(LOGOS)
    expect(await copy.locator('img[alt]:not([alt=""])').count()).toBe(0)
  })

  test('keeps keyboard focus on the real links only', async ({ page }) => {
    // The button is there only while the row moves.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(GALLERY)
    // The next stop after the real link is the Pause button, not the copy's link to the same
    // address. Retried as a whole: on a slow runner the page can still be hydrating when the first
    // Tab lands.
    await expect(async () => {
      await page.locator(`${MARQUEE} a`).first().focus()
      await page.keyboard.press('Tab')
      await expect(toggle(page)).toBeFocused({ timeout: 1000 })
    }).toPass()
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('shows the static wrapped grid: no animation, no copy, no button, no fade', async ({
    page,
  }) => {
    await page.goto(GALLERY)
    await expect(track(page)).toHaveCSS('animation-name', 'none')
    await expect(page.locator(`${MARQUEE} [data-marquee-copy]`)).toBeHidden()
    await expect(toggle(page)).toBeHidden()
    await expect(page.locator(`${MARQUEE} [data-marquee-viewport]`)).toHaveCSS('mask-image', 'none')
    await expect(page.locator(`${MARQUEE} [data-marquee-group]`).first()).toHaveCSS(
      'flex-wrap',
      'wrap',
    )
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false, reducedMotion: 'no-preference' })

  // A real page: the gallery streams its sections in with a script.
  test('shows the static grid, because nothing could stop the motion', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.locator(PAGE_MARQUEE)).toHaveCSS('animation-name', 'none')
    await expect(page.getByRole('button', { name: /logo scrolling/ })).toBeHidden()
    await expect(page.locator('[data-marquee-copy]')).toBeHidden()
    await expect(page.getByRole('img', { name: 'Acme' })).toBeVisible()
  })
})

test.describe('with motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('scrolls with a duration that scales with the logo count, and fades the edges', async ({
    page,
  }) => {
    await page.goto(GALLERY)
    await expect(track(page)).toHaveCSS('animation-name', 'marquee-scroll')
    await expect(track(page)).toHaveCSS('animation-iteration-count', 'infinite')
    // --marquee-per-logo (5s) x 5 logos.
    await expect(track(page)).toHaveCSS('animation-duration', '25s')
    await expect(page.locator(`${MARQUEE} [data-marquee-viewport]`)).not.toHaveCSS(
      'mask-image',
      'none',
    )
    expect(await playState(page)).toBe('running')
  })

  test('the Pause button stops the animation and Play starts it again', async ({ page }) => {
    await page.goto(GALLERY)
    await toggle(page).scrollIntoViewIfNeeded()
    await expect(toggle(page)).toHaveAccessibleName('Pause logo scrolling')
    await expect(toggle(page)).toHaveText('Pause')

    await toggle(page).click()
    await expect(toggle(page)).toHaveAccessibleName('Play logo scrolling')
    await expect(toggle(page)).toHaveText('Play')
    // The pointer is on the button, outside the row, so it is the button that holds the row still.
    expect(await playState(page)).toBe('paused')
    const before = await track(page).evaluate((el) => getComputedStyle(el).transform)
    await page.waitForTimeout(400)
    expect(await track(page).evaluate((el) => getComputedStyle(el).transform)).toBe(before)

    await toggle(page).click()
    await expect(toggle(page)).toHaveText('Pause')
    expect(await playState(page)).toBe('running')
  })

  test('pauses while focus is inside the row', async ({ page }) => {
    await page.goto(GALLERY)
    // Polled: the style can settle a frame after focus moves, and a slow runner may still be hydrating.
    await expect(async () => {
      await page.locator(`${MARQUEE} a`).first().focus()
      expect(await playState(page)).toBe('paused')
    }).toPass()
    await toggle(page).focus()
    await expect.poll(() => playState(page)).toBe('running')
  })

  test('pauses on hover', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Touch screens have no hover')
    await page.goto(GALLERY)
    await page.locator(MARQUEE).scrollIntoViewIfNeeded()
    await page.locator(`${MARQUEE} [data-marquee-viewport]`).hover()
    expect(await playState(page)).toBe('paused')
    await page.mouse.move(0, 0)
    expect(await playState(page)).toBe('running')
  })

  test('logos are greyscale unless the Design option says full colour', async ({ page }) => {
    await page.goto(GALLERY)
    await expect(page.locator(`${MARQUEE} img`).first()).toHaveCSS('filter', 'grayscale(1)')
    await expect(page.locator(`${COLOUR} img`).first()).toHaveCSS('filter', 'none')
  })

  for (const id of ['logo-cloud-marquee', 'logo-cloud-marquee-colour']) {
    test(`${id} has no WCAG 2.2 AA violations while moving`, async ({ page }) => {
      await page.goto(GALLERY)
      expect(await violationsOf(page, `[data-gallery-section="${id}"]`)).toEqual([])
    })
  }
})

for (const id of ['logo-cloud', 'logo-cloud-marquee', 'logo-cloud-marquee-colour']) {
  test(`${id} has no WCAG 2.2 AA violations as a static grid`, async ({ page }) => {
    await page.goto(GALLERY)
    expect(await violationsOf(page, `[data-gallery-section="${id}"]`)).toEqual([])
  })
}
