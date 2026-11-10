import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * Picture depth on the Hero's Split layout (README, "Picture depth and glow"): `/picture-depth-hero`.
 * The shadow is a filter on the picture's still box. An entrance animates the wrapper around it, and
 * parallax moves the picture inside it; neither carries the filter. Overlay and Editorial ignore it.
 */

const PAGE = '/picture-depth-hero'
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const section = (page: Page, heading: string) =>
  page
    .locator('#main-content section')
    .filter({ has: page.getByRole('heading', { name: heading }) })
/** The element the filter is on: the still box when there is one, else the plain <img>. */
const filtered = (scope: Locator) => scope.locator('[data-framed-image], img').first()
const filterOf = (scope: Locator) => filtered(scope).evaluate((el) => getComputedStyle(el).filter)

const scrollTo = (page: Page, y: number) =>
  page.evaluate(
    (top) =>
      new Promise<void>((resolve) => {
        window.scrollTo(0, top)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve()
          })
        })
      }),
    y,
  )

test.describe('motion on', () => {
  test.use({ reducedMotion: 'no-preference' })

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
  })

  test('nothing chosen draws no filter and no shadow', async ({ page }) => {
    const scope = section(page, 'Hero nothing chosen')
    expect(await filterOf(scope)).toBe('none')
    expect(await scope.locator('img').evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none')
  })

  test('Flat with Glow off is the same as nothing chosen', async ({ page }) => {
    expect(await filterOf(section(page, 'Hero flat and glow off'))).toBe('none')
  })

  test('Floating with a soft glow filters a plain picture', async ({ page }) => {
    const filter = await filterOf(section(page, 'Hero floating plain'))
    expect(filter.split('drop-shadow(').length - 1).toBe(3)
    expect(filter).toContain('0px 20px 28px')
    expect(filter).toMatch(/0px 0px 9px/)
  })

  test('the filter changes neither the picture’s box nor the page’s layout', async ({ page }) => {
    const target = filtered(section(page, 'Hero floating plain'))
    const read = () =>
      target.evaluate((el) => {
        const { x, y, width, height } = el.getBoundingClientRect()
        return { x, y, width, height, page: document.documentElement.scrollHeight }
      })
    const before = await read()
    await target.evaluate((el) => {
      el.style.setProperty('filter', 'none', 'important')
    })
    expect(await read()).toEqual(before)
  })

  test('an entrance animates the wrapper; the filter is on the picture inside it', async ({
    page,
  }) => {
    const scope = section(page, 'Hero floating entrance')
    const wrapper = scope.locator('[data-reveal]:has(img)')
    await expect(wrapper).toHaveCount(1)
    expect(await wrapper.evaluate((el) => getComputedStyle(el).filter)).toBe('none')
    expect(await filterOf(scope)).toContain('0px 20px 28px')
    // After it has played, the wrapper is fully shown and the shadow is still there.
    await wrapper.scrollIntoViewIfNeeded()
    await expect.poll(() => wrapper.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    expect(await filterOf(scope)).toContain('0px 20px 28px')
  })

  test('the picture drifts inside a still box that carries the shadow', async ({ page }) => {
    const scope = section(page, 'Hero floating moving')
    const box = scope.locator('[data-framed-image]')
    expect(await box.evaluate((el) => getComputedStyle(el).filter)).toContain('0px 20px 28px')
    const mover = scope.locator("[style*='--parallax-amount']")
    expect(await mover.evaluate((el) => getComputedStyle(el).filter)).toBe('none')
    const sizes: number[] = []
    const offsets: number[] = []
    for (const before of [700, 500, 300, 100, -100]) {
      const top = await box.evaluate((el) => el.getBoundingClientRect().top + scrollY)
      await scrollTo(page, top - before)
      await scrollTo(page, top - before + 1)
      sizes.push(await box.evaluate((el) => el.getBoundingClientRect().width))
      offsets.push(await mover.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42))
    }
    for (const width of sizes) expect(width).toBeCloseTo(sizes[0] ?? 0, 1)
    expect(new Set(offsets.map((offset) => Math.round(offset))).size).toBeGreaterThan(1)
    expect(await box.evaluate((el) => getComputedStyle(el).transform)).toBe('none')
  })

  test('the hero’s own parallax moves the picture, not the filtered box', async ({ page }) => {
    const scope = section(page, 'Hero floating parallax')
    const box = scope.locator('[data-framed-image]')
    expect(await box.evaluate((el) => getComputedStyle(el).filter)).toContain('0px 20px 28px')
    expect(
      await scope
        .locator("[style*='--parallax-amount']")
        .first()
        .evaluate((el) => getComputedStyle(el).filter),
    ).toBe('none')
    expect(await box.evaluate((el) => getComputedStyle(el).transform)).toBe('none')
  })

  test('Overlay and Editorial ignore a stored picture depth', async ({ page }) => {
    for (const heading of ['Hero overlay ignores it', 'Hero editorial ignores it']) {
      const scope = section(page, heading)
      for (const img of await scope.locator('img').all()) {
        expect(await img.evaluate((el) => getComputedStyle(el).filter), heading).toBe('none')
      }
    }
  })

  test('adds nothing the accessibility tree reads, and passes axe', async ({ page }) => {
    // The hero's picture is decorative (empty alt text): the filter keeps it out of the tree, as before.
    const scope = section(page, 'Hero floating plain')
    await expect(scope.getByRole('img')).toHaveCount(0)
    expect(await scope.locator('img').getAttribute('alt')).toBe('')
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('keeps the shadow on the entrance and moving pictures, which no longer move', async ({
    page,
  }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    for (const heading of ['Hero floating entrance', 'Hero floating moving']) {
      expect(await filterOf(section(page, heading)), heading).toContain('0px 20px 28px')
    }
    expect(
      await section(page, 'Hero floating moving')
        .locator('[data-framed-image-picture]')
        .evaluate((el) => getComputedStyle(el).scale),
    ).toBe('none')
  })
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('draws the shadow from the server’s markup alone', async ({ page }) => {
    await page.goto(PAGE)
    expect(await filterOf(section(page, 'Hero floating plain'))).toContain('0px 20px 28px')
  })
})
