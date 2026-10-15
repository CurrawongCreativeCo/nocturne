import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * Parallax (README, "Motion"): the picture behind a parallax hero moves with the scroll, and does
 * not move for visitors who ask for less motion or have JavaScript off.
 */

const PAGE = '/parallax'
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

/** The element Parallax moves: it carries the `--parallax-amount` variable and, once scrolled, the transform. */
const moving = (page: Page, scope = 'main section:first-of-type') =>
  page.locator(`${scope} [style*='--parallax-amount']`).first()

const transformOf = (page: Page, scope?: string) =>
  moving(page, scope).evaluate((el) => getComputedStyle(el).transform)

/** How far the picture is shifted, in px; 0 for `none` and for a zero translate alike. */
const offsetOf = (page: Page, scope?: string) =>
  moving(page, scope).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42)

test.describe('motion on', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('a first-section hero rests unshifted, then moves as the page scrolls', async ({ page }) => {
    await page.goto(PAGE)
    await expect(moving(page)).toBeVisible()
    // At the top of the page the picture is exactly where the server drew it.
    expect(await offsetOf(page)).toBe(0)

    await page.mouse.wheel(0, 300)
    await expect.poll(() => offsetOf(page)).not.toBe(0)
    const first = await offsetOf(page)
    await page.mouse.wheel(0, 200)
    await expect.poll(() => offsetOf(page)).not.toBe(first)
  })

  test('the picture is scaled to cover its travel, so no gap shows', async ({ page }) => {
    await page.goto(PAGE)
    const scaler = page.locator('main section:first-of-type div:has(> img)').first()
    const scale = await scaler.evaluate((el) => getComputedStyle(el).scale)
    expect(Number(scale)).toBeGreaterThan(1)
    expect(Number(scale)).toBeLessThanOrEqual(1.5)
  })

  test('a hero further down the page moves while it crosses the screen', async ({ page }) => {
    await page.goto(PAGE)
    const scope = 'section:has(h2:text("Later parallax hero"))'
    await page.locator(scope).evaluate((el) => {
      window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 300)
    })
    await page.mouse.wheel(0, 100)
    await expect.poll(() => offsetOf(page, scope)).not.toBe(0)
    const first = await offsetOf(page, scope)
    await page.mouse.wheel(0, 150)
    await expect.poll(() => offsetOf(page, scope)).not.toBe(first)
  })

  test("a media section's picture moves with the parallax preset", async ({ page }) => {
    await page.goto(PAGE)
    const scope = 'section:has(h2:text("Parallax picture"))'
    await page.locator(scope).evaluate((el) => {
      window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 500)
    })
    await page.mouse.wheel(0, 100)
    await expect.poll(() => offsetOf(page, scope)).not.toBe(0)
    const first = await offsetOf(page, scope)
    await page.mouse.wheel(0, 150)
    await expect.poll(() => offsetOf(page, scope)).not.toBe(first)
  })

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    await page.goto(PAGE)
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(violations.map(({ id }) => id)).toEqual([])
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the picture has no transform and is not scaled, however far the page scrolls', async ({
    page,
  }) => {
    await page.goto(PAGE)
    await expect(moving(page)).toBeVisible()
    await page.mouse.wheel(0, 300)
    await page.waitForTimeout(300)
    expect(await transformOf(page)).toBe('none')
    expect(await moving(page).evaluate((el) => el.getAttribute('style') ?? '')).not.toContain(
      'transform',
    )
    const scaler = page.locator('main section:first-of-type div:has(> img)').first()
    expect(await scaler.evaluate((el) => getComputedStyle(el).scale)).toBe('none')
  })
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false, reducedMotion: 'no-preference' })

  test('the picture is in the HTML, still', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.locator('main section:first-of-type img')).toHaveCount(1)
    expect(await transformOf(page)).toBe('none')
  })
})
