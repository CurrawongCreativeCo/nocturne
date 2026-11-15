import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'
import { pixelsAt, roleIn } from './section-edge-pixels'

/**
 * Double, Dotted line and Gradient in a real browser (task 151, Slice 7, first batch). `/rules-styles` reaches the
 * renderer through the real queries: a Link list (all four divider positions) and three section headers, a Part A
 * surface, one per style. It reads computed styles and pixels, not class names. The Gradient stores a line colour,
 * which it must ignore; Three dots is the unchanged control.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const section = (page: Page, id: string) => page.locator(`section#${id}`)
const dividerIn = (page: Page, id: string, style: string) =>
  section(page, id).locator(`[data-decorative-divider="${style}"]`)
/** The divider's drawn lines: the spans that are not its middle. */
const linesOf = (divider: Locator) => divider.locator(':scope > span[aria-hidden="true"]')
const first = (divider: Locator) => linesOf(divider).first()
const computed = (el: Locator, property: string) =>
  el.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property)

test.beforeEach(async ({ page }) => {
  await page.goto('/rules-styles')
})

test.describe('through the Link list', () => {
  test('draws Double as two lines 3px apart: 5px tall, two 1px bars', async ({ page }) => {
    const double = dividerIn(page, 'rs-links', 'double')
    await expect(double).toHaveCount(1)
    const line = first(double)
    expect(await computed(line, 'height')).toBe('5px')
    const image = await computed(line, 'background-image')
    expect(image.match(/linear-gradient/g)).toHaveLength(2)
    expect(await computed(line, 'background-size')).toBe('100% 1px, 100% 1px')
  })

  test('draws Dotted line as dots every 8px, and holds a middle between two lines', async ({
    page,
  }) => {
    const dotted = dividerIn(page, 'rs-links', 'dotted')
    await expect(dotted).toHaveCount(1)
    await expect(dotted).toHaveAttribute('data-divider-centre', 'diamond')
    // Two lines with the diamond between them, as a Line has.
    expect(await linesOf(dotted).count()).toBeGreaterThanOrEqual(2)
    const line = first(dotted)
    expect(await computed(line, 'height')).toBe('5px')
    expect(await computed(line, 'background-image')).toContain('radial-gradient')
    expect(await computed(line, 'background-size')).toBe('8px 100%')
    expect(await computed(line, 'background-repeat')).toBe('repeat-x')
  })

  test('draws Gradient between two lines around words, with no line colour of its own', async ({
    page,
  }) => {
    const gradient = dividerIn(page, 'rs-links', 'gradient')
    await expect(gradient).toHaveCount(1)
    await expect(gradient).toContainText('Stay connected')
    await expect(gradient).toHaveAttribute('data-divider-centre', 'text')
    // The stored custom line colour is not drawn: no inline colour on the divider.
    expect(await gradient.getAttribute('style')).toBeNull()
    expect(await computed(first(gradient), 'background-image')).toContain('linear-gradient')
  })
})

test.describe('through a section header', () => {
  test('leaves Three dots as it was: no middle, three dots', async ({ page }) => {
    const dots = dividerIn(page, 'rs-header-dots', 'dots')
    await expect(dots).toHaveCount(1)
    await expect(dots).not.toHaveAttribute('data-divider-centre', /.+/)
    expect(await dots.locator(':scope > span').count()).toBe(3)
  })

  test('draws each of the three between the title and the intro, in the section', async ({
    page,
  }) => {
    for (const style of ['double', 'dotted', 'gradient']) {
      const divider = dividerIn(page, `rs-header-${style}`, style)
      await expect(divider, style).toHaveCount(1)
      const heading = section(page, `rs-header-${style}`).getByRole('heading', { level: 2 }).first()
      const intro = section(page, `rs-header-${style}`).getByText(
        'An introduction under the divider.',
      )
      const [h, d, i] = await Promise.all([
        heading.boundingBox(),
        divider.boundingBox(),
        intro.boundingBox(),
      ])
      if (!h || !d || !i) throw new Error(`${style}: missing boxes`)
      expect(d.y, `${style}: after the title`).toBeGreaterThanOrEqual(h.y + h.height - 1)
      expect(d.y + d.height, `${style}: before the intro`).toBeLessThanOrEqual(i.y + 1)
    }
  })

  test('measures a Dotted line bold as 8px tall, dots every 13px', async ({ page }) => {
    const line = first(dividerIn(page, 'rs-header-dotted', 'dotted'))
    expect(await computed(line, 'height')).toBe('8px')
    expect(await computed(line, 'background-size')).toBe('13px 100%')
  })

  test('runs the Gradient from Primary on the left to Secondary on the right, ignoring the stored colour', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Reads pixels at desktop widths')
    const divider = dividerIn(page, 'rs-header-gradient', 'gradient')
    expect(await divider.getAttribute('style')).toBeNull()
    const primary = await roleIn(section(page, 'rs-header-gradient'), '--color-accent')
    const secondary = await roleIn(section(page, 'rs-header-gradient'), '--color-accent-2')
    const line = first(divider)
    await line.scrollIntoViewIfNeeded()
    const box = await line.boundingBox()
    if (!box) throw new Error('No line box.')
    const [left, right] = await pixelsAt(page, await page.screenshot(), [
      { x: box.x + box.width * 0.2, y: box.y + box.height / 2 },
      { x: box.x + box.width * 0.8, y: box.y + box.height / 2 },
    ])
    const distance = (a: number[] = [], b: number[] = []) =>
      Math.hypot(...[0, 1, 2].map((c) => (a[c] ?? 0) - (b[c] ?? 0)))
    // Primary and Secondary are far apart in this theme, so which a pixel is nearer to is clear.
    expect(distance(primary, secondary)).toBeGreaterThan(100)
    expect(distance(left, primary), `left ${String(left)}`).toBeLessThan(distance(left, secondary))
    expect(distance(right, secondary), `right ${String(right)}`).toBeLessThan(
      distance(right, primary),
    )
    // Neither is the stored orange.
    for (const pixel of [left, right]) expect(distance(pixel, [170, 85, 0])).toBeGreaterThan(60)
  })
})

test.describe('fallbacks', () => {
  test('falls back to a plain system-text line for Gradient, and to the system text colour for the others, in forced colours', async ({
    page,
    browserName,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    const supported = await page.evaluate(() => matchMedia('(forced-colors: active)').matches)
    test.skip(!supported, `${browserName} can't emulate forced colours`)
    const gradient = first(dividerIn(page, 'rs-header-gradient', 'gradient'))
    expect(await computed(gradient, 'background-image')).toBe('none')
    expect(await computed(gradient, 'background-color')).not.toBe('rgba(0, 0, 0, 0)')
    // Double and Dotted line are still drawn, from the text colour.
    for (const [id, style] of [
      ['rs-header-double', 'double'],
      ['rs-header-dotted', 'dotted'],
    ] as const)
      expect(await computed(first(dividerIn(page, id, style)), 'background-image'), style).not.toBe(
        'none',
      )
    // Where the browser really forces colours (Chromium; Playwright's WebKit only matches the media query, as
    // Safari has no forced-colours mode), that text colour is the system's, so they need no fallback of their own.
    if (browserName === 'chromium') {
      const system = await page.evaluate(() => {
        const probe = document.createElement('span')
        probe.style.color = 'CanvasText'
        document.body.append(probe)
        const colour = getComputedStyle(probe).color
        probe.remove()
        return colour
      })
      for (const [id, style] of [
        ['rs-header-double', 'double'],
        ['rs-header-dotted', 'dotted'],
      ] as const)
        expect(await computed(dividerIn(page, id, style), 'color'), style).toBe(system)
    }
  })
})

test('has no WCAG 2.2 AA violations', async ({ page }) => {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(violations.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([])
})
