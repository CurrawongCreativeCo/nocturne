import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * Picture depth on Image + text (README, "Picture depth and glow"): `/picture-depth` has a section with
 * nothing chosen, which must look as it always did, then each level, a glow alone, and floating shadows
 * on pictures that move. The shadow is a drop-shadow filter on the picture's still outer box, so it
 * follows the visible outline and stays put while the picture inside drifts.
 */

const PAGE = '/picture-depth'
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const section = (page: Page, heading: string) =>
  page
    .locator('#main-content section')
    .filter({ has: page.getByRole('heading', { name: heading }) })
/** The element the filter is on: the still box when there is one, else the plain <img>. */
const filtered = (scope: Locator) => scope.locator('[data-framed-image], img').first()
const filterOf = (scope: Locator) => filtered(scope).evaluate((el) => getComputedStyle(el).filter)
const shadowCount = (filter: string) => filter.split('drop-shadow(').length - 1

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

  test('nothing chosen draws no filter and no shadow at all', async ({ page }) => {
    const scope = section(page, 'Nothing chosen')
    expect(await filterOf(scope)).toBe('none')
    expect(await scope.locator('img').evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none')
  })

  test('Flat with Glow off is the same as nothing chosen', async ({ page }) => {
    expect(await filterOf(section(page, 'Flat and glow off'))).toBe('none')
  })

  test('Floating with a soft glow draws two shadows and the halo, on a plain picture', async ({
    page,
  }) => {
    const scope = section(page, 'Floating with a soft glow')
    const filter = await filterOf(scope)
    // The token's two layers, then the glow.
    expect(shadowCount(filter)).toBe(3)
    expect(filter).toContain('0px 20px 28px')
    expect(filter).toMatch(/0px 0px 9px/)
    // A plain picture has no wrapper, and the filter is on the <img> itself.
    await expect(scope.locator('[data-framed-image]')).toHaveCount(0)
  })

  test('a stacked, framed picture is filtered on its box, frame included', async ({ page }) => {
    const scope = section(page, 'Raised, stacked and framed')
    const box = scope.locator('[data-framed-image]')
    expect(await box.evaluate((el) => getComputedStyle(el).filter)).toContain('0px 4px 6px')
    await expect(box.locator('[data-image-frame]')).toHaveCount(1)
    // Nothing inside the box is filtered a second time.
    expect(
      await box
        .locator('*')
        .evaluateAll((all) => all.filter((el) => getComputedStyle(el).filter !== 'none').length),
    ).toBe(0)
  })

  test('a glow with no shadow follows a circle’s outline', async ({ page }) => {
    const scope = section(page, 'A strong glow on a circle')
    // A circle with no motion or frame is a plain <img>, cut round by its own corners.
    const box = filtered(scope)
    expect(await box.evaluate((el) => getComputedStyle(el).borderRadius)).not.toBe('0px')
    const filter = await box.evaluate((el) => getComputedStyle(el).filter)
    expect(shadowCount(filter)).toBe(1)
    expect(filter).toMatch(/0px 0px 14px/)
    const { width, height } = (await box.boundingBox()) ?? { width: 0, height: 1 }
    expect(Math.abs(width - height)).toBeLessThan(1)
  })

  test('the filter changes neither the box nor the page’s layout', async ({ page }) => {
    // The same fixture section drawn with the filter off, by clearing it in the browser.
    const scope = section(page, 'Floating with a soft glow')
    const target = filtered(scope)
    const before = await target.evaluate((el) => {
      const { x, y, width, height } = el.getBoundingClientRect()
      return { x, y, width, height, page: document.documentElement.scrollHeight }
    })
    await target.evaluate((el) => {
      el.style.setProperty('filter', 'none', 'important')
    })
    const after = await target.evaluate((el) => {
      const { x, y, width, height } = el.getBoundingClientRect()
      return { x, y, width, height, page: document.documentElement.scrollHeight }
    })
    expect(after).toEqual(before)
  })

  test('the shadow stays on the still box while the picture drifts inside it', async ({ page }) => {
    const scope = section(page, 'Floating on a moving picture')
    const box = scope.locator('[data-framed-image]')
    expect(await box.evaluate((el) => getComputedStyle(el).filter)).toContain('0px 20px 28px')
    const mover = scope.locator("[style*='--parallax-amount']")
    // Nothing that moves, or is scaled to cover its travel, carries the filter.
    expect(await mover.evaluate((el) => getComputedStyle(el).filter)).toBe('none')
    expect(
      await scope
        .locator('[data-framed-image-picture]')
        .evaluate((el) => getComputedStyle(el).filter),
    ).toBe('none')

    const rects: { x: number; y: number; w: number; h: number }[] = []
    const offsets: number[] = []
    for (const before of [700, 500, 300, 100, -100]) {
      await box.scrollIntoViewIfNeeded()
      const top = await box.evaluate((el) => el.getBoundingClientRect().top + scrollY)
      await scrollTo(page, top - before)
      await scrollTo(page, top - before + 1)
      rects.push(
        await box.evaluate((el) => {
          const { x, width: w, height: h } = el.getBoundingClientRect()
          return { x, y: 0, w, h }
        }),
      )
      offsets.push(await mover.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42))
    }
    // The box keeps its size and column; only the picture inside it moves.
    for (const next of rects.slice(1)) {
      expect(next.w).toBeCloseTo(rects[0]?.w ?? 0, 1)
      expect(next.h).toBeCloseTo(rects[0]?.h ?? 0, 1)
      expect(next.x).toBeCloseTo(rects[0]?.x ?? 0, 1)
    }
    expect(new Set(offsets.map((offset) => Math.round(offset))).size).toBeGreaterThan(1)
    expect(await box.evaluate((el) => getComputedStyle(el).transform)).toBe('none')
  })

  test('under the section’s own parallax the filter is on the box, not the mover', async ({
    page,
  }) => {
    const scope = section(page, 'Floating under section parallax')
    const box = scope.locator('[data-framed-image]')
    expect(await box.evaluate((el) => getComputedStyle(el).filter)).toContain('0px 20px 28px')
    expect(
      await scope
        .locator("[style*='--parallax-amount']")
        .evaluate((el) => getComputedStyle(el).filter),
    ).toBe('none')
  })

  test('adds nothing the accessibility tree reads, and passes axe', async ({ page }) => {
    const scope = section(page, 'Floating with a soft glow')
    await expect(scope.getByRole('img', { name: 'Picture' })).toHaveCount(1)
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('keeps the shadow on a picture that no longer moves', async ({ page }) => {
    await page.goto(PAGE)
    const scope = section(page, 'Floating on a moving picture')
    expect(
      await scope.locator('[data-framed-image]').evaluate((el) => getComputedStyle(el).filter),
    ).toContain('0px 20px 28px')
    expect(
      await scope
        .locator('[data-framed-image-picture]')
        .evaluate((el) => getComputedStyle(el).scale),
    ).toBe('none')
  })
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('draws the shadow from the server’s markup alone', async ({ page }) => {
    await page.goto(PAGE)
    expect(await filterOf(section(page, 'Floating with a soft glow'))).toContain('0px 20px 28px')
  })
})
