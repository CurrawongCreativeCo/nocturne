import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { galleryIds } from './fixtures/dataset.mjs'

/**
 * Statistics (README, "Statistics"): the Stats section's two layouts and the statistics bar. The
 * server renders every figure already formatted (`en-AU`), so the numbers are in the HTML without
 * JavaScript; the count-up is an enhancement that never changes the finished text, never moves the
 * layout and stays off under reduced motion or Animation "None".
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const GALLERY = '/section-gallery'
const BAR_GALLERY = '/section-gallery/stats-bar'
const STATS_PAGE = '/stats'

const statsIds = galleryIds.filter((id: string) => id.startsWith('stats-'))
// The formatted figures the fixtures write (see `statItems` in dataset.mjs).
const GALLERY_FIGURES = ['12,500+', '4.9/5', '$1.2m', '12']

const violationsOf = async (page: Page, include: string) => {
  const { violations } = await new AxeBuilder({ page }).include(include).withTags(WCAG).analyze()
  return violations.map(
    ({ id: rule, nodes }) => `${rule}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`,
  )
}

test('the gallery has both layouts of the Stats section', () => {
  expect(statsIds).toEqual(expect.arrayContaining(['stats-inline', 'stats-cards']))
})

for (const id of statsIds) {
  test(`${id} has no WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(GALLERY)
    expect(await violationsOf(page, `[data-gallery-section="${id}"]`)).toEqual([])
  })
}

test.describe('final values are in the server HTML', () => {
  test('the section gallery holds every formatted figure', async ({ request }) => {
    const html = await (await request.get(GALLERY)).text()
    for (const figure of GALLERY_FIGURES) expect(html).toContain(figure)
  })

  test('the statistics bar does too, in en-AU format', async ({ request }) => {
    const html = await (await request.get(BAR_GALLERY)).text()
    for (const figure of GALLERY_FIGURES) expect(html).toContain(figure)
    expect(html).not.toContain('12500')
  })

  test('an animated figure has its value in hidden text for screen readers, the counting text hidden from them', async ({
    request,
  }) => {
    const html = await (await request.get(STATS_PAGE)).text()
    expect(html).toMatch(
      /<span class="sr-only">12,500\+<\/span><span aria-hidden="true"><span[^>]*>12,500\+<\/span><\/span>/,
    )
    expect(html).toContain('$1.2m')
    expect(html).toContain('98,000')
  })
})

test.describe('the statistics bar', () => {
  test('has no WCAG 2.2 AA violations on any tone', async ({ page }) => {
    await page.goto(BAR_GALLERY)
    expect(await violationsOf(page, 'main')).toEqual([])
  })

  const rows = (page: Page, tone: string) =>
    page.locator(`[data-stats-bar-example="${tone}"] li`).evaluateAll((items) => {
      const tops = items.map((item) => Math.round(item.getBoundingClientRect().top))
      // Every figure has a divider before it, and the row is pulled left inside an overflow-hidden box,
      // so the first figure in each row has its divider cut off. A figure starting inside the bar shows one.
      const bar = items[0]?.closest('[data-stats-bar]')?.getBoundingClientRect().left ?? 0
      const starts = items.map((item) =>
        item.getBoundingClientRect().left > bar + 1
          ? parseFloat(getComputedStyle(item).borderInlineStartWidth)
          : 0,
      )
      return { rows: new Set(tops).size, starts }
    })

  test('sits in one row on a wide screen, with a divider before every figure but the first', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(BAR_GALLERY)
    const { rows: count, starts } = await rows(page, 'surface')
    expect(count).toBe(1)
    expect(starts[0]).toBe(0)
    expect(starts.slice(1).every((width) => width > 0)).toBe(true)
  })

  test('wraps to two by two on a phone, with a divider only inside a row', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto(BAR_GALLERY)
    const { rows: count, starts } = await rows(page, 'surface')
    expect(count).toBe(2)
    expect(starts.map((width) => width > 0)).toEqual([false, true, false, true])
    // Nothing spills sideways.
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  })

  test('takes its colours from the tone it sits in', async ({ page }) => {
    await page.goto(BAR_GALLERY)
    const colour = (tone: string) =>
      page
        .locator(`[data-stats-bar-example="${tone}"] [data-stats-bar] li p`)
        .first()
        .evaluate((element) => getComputedStyle(element).color)
    expect(await colour('inverse')).not.toBe(await colour('surface'))
  })
})

test.describe('count-up', () => {
  /**
   * Scrolls the first animated figure into view and records every text it shows (and the width of
   * its box) until it settles.
   */
  const watchFirstFigure = (page: Page, settleMs: number) =>
    page.evaluate(async (ms) => {
      const figure = [...document.querySelectorAll<HTMLElement>('span.tabular-nums')].find(
        (element) => element.querySelector('[aria-hidden="true"]'),
      )
      if (!figure) throw new Error('no animated figure on the page')
      const counting = figure.querySelector<HTMLElement>('[aria-hidden="true"]')
      if (!counting) throw new Error('no counting text in the figure')
      const texts: string[] = [counting.textContent]
      const widths: number[] = [figure.getBoundingClientRect().width]
      const observer = new MutationObserver(() => {
        texts.push(counting.textContent)
        widths.push(figure.getBoundingClientRect().width)
      })
      observer.observe(counting, { childList: true, characterData: true, subtree: true })
      figure.scrollIntoView({ block: 'center' })
      await new Promise((resolve) => setTimeout(resolve, ms))
      observer.disconnect()
      return { texts, widths }
    }, settleMs)

  test.describe('motion on', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('counts up from the start once in view, ends on the server text and moves nothing', async ({
      page,
    }) => {
      await page.goto(STATS_PAGE)
      await page.waitForLoadState('networkidle')
      const { texts, widths } = await watchFirstFigure(page, 3000)

      expect(texts.at(-1)).toBe('12,500+')
      expect(new Set(texts).size, `only ever showed ${texts.join(' ')}`).toBeGreaterThan(2)
      expect(texts.some((text) => text !== '12,500+')).toBe(true)
      // Same box from the first frame to the last: tabular-nums plus a fixed width.
      expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(0.5)
    })

    test('does not shift the page while counting', async ({ page }) => {
      await page.goto(STATS_PAGE)
      await page.waitForLoadState('networkidle')
      const heading = page.getByRole('heading', { name: 'Still figures' })
      await watchFirstFigure(page, 100)
      const before = await heading.evaluate((element) => element.getBoundingClientRect().top)
      await page.waitForTimeout(1500)
      const after = await heading.evaluate((element) => element.getBoundingClientRect().top)
      expect(Math.abs(after - before)).toBeLessThan(1)
    })

    test('a section with Animation none is plain text with nothing to count', async ({ page }) => {
      await page.goto(STATS_PAGE)
      const still = page.locator('section', { hasText: 'Still figures' })
      await expect(still).toContainText('98,000')
      expect(await still.locator('[aria-hidden="true"]').count()).toBe(0)
      expect(await still.locator('.sr-only').count()).toBe(0)
    })

    test('has no WCAG 2.2 AA violations, animated or still', async ({ page }) => {
      await page.goto(STATS_PAGE)
      await page.waitForLoadState('networkidle')
      await watchFirstFigure(page, 2500)
      expect(await violationsOf(page, 'main')).toEqual([])
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('shows the finished figure and never changes it', async ({ page }) => {
      await page.goto(STATS_PAGE)
      await page.waitForLoadState('networkidle')
      const { texts } = await watchFirstFigure(page, 2500)
      expect(texts).toEqual(['12,500+'])
    })
  })

  test.describe('no JavaScript', () => {
    test.use({ javaScriptEnabled: false })

    test('shows the finished figures', async ({ page }) => {
      await page.goto(STATS_PAGE)
      const animated = page.locator('section', { hasText: 'Animated figures' })
      // The visible (aria-hidden) text is the figure, not just the hidden copy for screen readers.
      await expect(animated.locator('[aria-hidden="true"]').first()).toHaveText('12,500+')
      await expect(animated).toContainText('$1.2m')
    })
  })
})

test('a page without statistics has none of the markup or the cost', async ({ request }) => {
  const html = await (await request.get('/')).text()
  expect(html).not.toContain('tabular-nums')
})
