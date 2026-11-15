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
  test('draws Double as two lines 3px apart: 5px tall, a 1px border above and below', async ({
    page,
  }) => {
    const double = dividerIn(page, 'rs-links', 'double')
    await expect(double).toHaveCount(1)
    const line = first(double)
    expect(await computed(line, 'height')).toBe('5px')
    // Two 1px borders with the 3px between them (the box is border-box), not a background.
    expect(await computed(line, 'border-top-width')).toBe('1px')
    expect(await computed(line, 'border-bottom-width')).toBe('1px')
    expect(await computed(line, 'border-top-style')).toBe('solid')
    expect(await computed(line, 'border-bottom-style')).toBe('solid')
    expect(await computed(line, 'background-image')).toBe('none')
  })

  test('paints Double as it always looked: a 1px line, a 3px gap, a 1px line, in the line colour', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Reads pixels at desktop widths')
    const line = first(dividerIn(page, 'rs-links', 'double'))
    await line.scrollIntoViewIfNeeded()
    const box = await line.boundingBox()
    if (!box) throw new Error('No line box.')
    const x = box.x + box.width / 2
    const [bg, row0, row1, row2, row3, row4] = await pixelsAt(page, await page.screenshot(), [
      { x: box.x - 12, y: box.y + 2.5 },
      ...[0.5, 1.5, 2.5, 3.5, 4.5].map((dy) => ({ x, y: box.y + dy })),
    ])
    const away = (a: number[] = [], b: number[] = []) =>
      Math.hypot(...[0, 1, 2].map((c) => (a[c] ?? 0) - (b[c] ?? 0)))
    // Painted on the first and fifth rows, the page's own colour between them: two bars and the gap.
    expect(away(row0, bg), `row 0 ${String(row0)}`).toBeGreaterThan(40)
    expect(away(row4, bg), `row 4 ${String(row4)}`).toBeGreaterThan(40)
    for (const gap of [row1, row2, row3])
      expect(away(gap, bg), `gap ${String(gap)}`).toBeLessThan(12)
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

test.describe('in forced colours', () => {
  /** Turns forced colours on, or skips where the browser cannot emulate them. */
  async function force(page: Page, browserName: string) {
    await page.emulateMedia({ forcedColors: 'active' })
    const supported = await page.evaluate(() => matchMedia('(forced-colors: active)').matches)
    test.skip(!supported, `${browserName} can't emulate forced colours`)
  }
  /** The system text colour, as this browser resolves it. Only Chromium forces the colours it paints with. */
  const systemText = (page: Page) =>
    page.evaluate(() => {
      const probe = document.createElement('span')
      probe.style.color = 'CanvasText'
      document.body.append(probe)
      const colour = getComputedStyle(probe).color
      probe.remove()
      return colour
    })
  const distance = (a: number[] = [], b: number[] = []) =>
    Math.hypot(...[0, 1, 2].map((c) => (a[c] ?? 0) - (b[c] ?? 0)))
  const PAINTED = 40

  test('falls back to a plain system-text line for Gradient', async ({ page, browserName }) => {
    await force(page, browserName)
    const gradient = first(dividerIn(page, 'rs-header-gradient', 'gradient'))
    expect(await computed(gradient, 'background-image')).toBe('none')
    expect(await computed(gradient, 'background-color')).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('paints Double as two system-colour lines with the gap between them', async ({
    page,
    browserName,
    isMobile,
  }) => {
    await force(page, browserName)
    const line = first(dividerIn(page, 'rs-header-double', 'double'))
    // Two borders: still there when a background would be removed.
    expect(await computed(line, 'border-top-width')).toBe('1px')
    expect(await computed(line, 'border-bottom-width')).toBe('1px')
    expect(await computed(line, 'border-top-style')).toBe('solid')
    if (browserName === 'chromium') {
      // Where colours are really forced, both borders are the system text colour.
      const system = await systemText(page)
      expect(await computed(line, 'border-top-color')).toBe(system)
      expect(await computed(line, 'border-bottom-color')).toBe(system)
    }
    if (isMobile) return
    // And pixels: a painted row above, a gap, a painted row below, none of it the page's own colour.
    await line.scrollIntoViewIfNeeded()
    const box = await line.boundingBox()
    if (!box) throw new Error('No line box.')
    const x = box.x + box.width / 2
    const [bg, top, gap, bottom] = await pixelsAt(page, await page.screenshot(), [
      { x: box.x - 12, y: box.y + 2.5 },
      { x, y: box.y + 0.5 },
      { x, y: box.y + 2.5 },
      { x, y: box.y + 4.5 },
    ])
    expect(distance(top, bg), `top row ${String(top)} against ${String(bg)}`).toBeGreaterThan(
      PAINTED,
    )
    expect(distance(bottom, bg), `bottom row ${String(bottom)}`).toBeGreaterThan(PAINTED)
    expect(distance(gap, bg), `the gap ${String(gap)} is the page`).toBeLessThan(PAINTED / 2)
  })

  test('paints Dotted line as a dotted line of system colour, neither empty nor solid', async ({
    page,
    browserName,
    isMobile,
  }) => {
    await force(page, browserName)
    const line = first(dividerIn(page, 'rs-header-dotted', 'dotted'))
    // The dots are a background, removed here: a dotted top border as thick as a (bold) dot is wide stands in.
    expect(await computed(line, 'border-top-width')).toBe('4px')
    expect(await computed(line, 'border-top-style')).toBe('dotted')
    if (browserName === 'chromium')
      expect(await computed(line, 'border-top-color')).toBe(await systemText(page))
    if (isMobile) return
    await line.scrollIntoViewIfNeeded()
    const box = await line.boundingBox()
    if (!box) throw new Error('No line box.')
    const columns = Array.from({ length: Math.floor(box.width) - 8 }, (_, i) => box.x + 4 + i)
    const points = [
      { x: box.x - 12, y: box.y + 2 },
      ...columns.flatMap((x) => [
        { x, y: box.y + 1.5 },
        { x, y: box.y + 2.5 },
      ]),
    ]
    const [bg, ...rest] = await pixelsAt(page, await page.screenshot(), points)
    let painted = 0
    for (let i = 0; i < columns.length; i++)
      if (distance(rest[2 * i], bg) > PAINTED || distance(rest[2 * i + 1], bg) > PAINTED) painted++
    const share = painted / columns.length
    // Dots with gaps between them: some of the line is painted and some of it is not.
    expect(share, `painted share of the line: ${share.toFixed(2)}`).toBeGreaterThan(0.2)
    expect(share, `painted share of the line: ${share.toFixed(2)}`).toBeLessThan(0.85)
  })
})

test('has no WCAG 2.2 AA violations', async ({ page }) => {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(violations.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([])
})
