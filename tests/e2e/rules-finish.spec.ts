import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'
import { pixelsAt } from './section-edge-pixels'

/**
 * Finish (Flat | Glow) and the Ornament centre in a real browser (task 151, Slice 7, second batch). `/rules-finish` is
 * one section header per case through the real queries, so a glowing divider is held against its flat twin. It
 * reads computed styles, boxes and pixels, not class names.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const section = (page: Page, name: string) => page.locator(`section#rf-${name}`)
const dividerIn = (page: Page, name: string) =>
  section(page, name).locator('[data-decorative-divider]')
const linesOf = (divider: Locator) => divider.locator(':scope > span[aria-hidden="true"]')
const line = (page: Page, name: string) => linesOf(dividerIn(page, name)).first()
const computed = (el: Locator, property: string) =>
  el.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property)
const distance = (a: number[] = [], b: number[] = []) =>
  Math.hypot(...[0, 1, 2].map((c) => (a[c] ?? 0) - (b[c] ?? 0)))
/**
 * Scrolls a line into view and measures it. During hydration the element can be replaced between the locator
 * resolving and the scroll ("Element is not attached to the DOM"), so that one operation, and only that, is retried:
 * the locator resolves again each time, within a bounded time. Any other error is thrown at once, and an element
 * that stays missing still fails when the time is up. Every assertion on the result stays outside the retry.
 */
const DETACHED_RETRY_MS = 5000
const box = async (el: Locator) => {
  const deadline = Date.now() + DETACHED_RETRY_MS
  for (;;) {
    try {
      await el.scrollIntoViewIfNeeded({ timeout: 2000 })
      const found = await el.boundingBox({ timeout: 2000 })
      if (!found) throw new Error('No box.')
      return found
    } catch (error) {
      const transient =
        error instanceof Error &&
        /not attached to the DOM|detached from the DOM/.test(error.message)
      if (!transient || Date.now() >= deadline) throw error
    }
  }
}
/** How far the page is from its own colour, at these points above and below a line, against the page left of it. */
async function haloAround(page: Page, el: Locator, x: number) {
  const b = await box(el)
  const offsets = [-2.5, -1.5, -0.5, b.height + 0.5, b.height + 1.5, b.height + 2.5]
  const points = [
    { x: b.x - 14, y: b.y + b.height / 2 },
    ...offsets.map((dy) => ({ x: b.x + x * b.width, y: b.y + dy })),
  ]
  const [bg, ...around] = await pixelsAt(page, await page.screenshot(), points)
  return Math.max(...around.map((pixel) => distance(pixel, bg)))
}
/**
 * Measured on Chromium, as the largest colour distance from the page beside the line over the pixels just above
 * and below it (the Flat twin of each is 0 in every case): Line 36, Bold Line 61, Double 65, Gradient 53 (bold 79),
 * and the nearest pixels give 30 and more. The halo is read as visible past GLOW_VISIBLE, and a Flat line as bare
 * under FLAT_BARE: a margin of at least 16 on either side.
 */
const GLOW_VISIBLE = 20
const FLAT_BARE = 1

test.beforeEach(async ({ page }) => {
  await page.goto('/rules-finish')
})

test.describe('Flat, unset and unsupported finishes', () => {
  test('draw Flat and unset the same, with no shadow', async ({ page }) => {
    for (const name of ['line-flat', 'line-unset', 'double-flat', 'gradient-flat']) {
      expect(await computed(line(page, name), 'box-shadow'), name).toBe('none')
    }
    const flat = await box(line(page, 'line-flat'))
    const unset = await box(line(page, 'line-unset'))
    expect(unset.width).toBeCloseTo(flat.width, 1)
    expect(unset.height).toBe(flat.height)
  })

  test('ignore a Glow stored for Fading line, Dotted line and Three dots', async ({ page }) => {
    for (const name of ['fade-stored', 'dotted-stored']) {
      expect(await computed(line(page, name), 'box-shadow'), name).toBe('none')
    }
    const dots = dividerIn(page, 'dots-stored').locator(':scope > span')
    await expect(dots).toHaveCount(3)
    for (let i = 0; i < 3; i++) expect(await computed(dots.nth(i), 'box-shadow')).toBe('none')
  })
})

test.describe('Glow', () => {
  test('paints a halo outside a Line’s own 1px box, without moving anything', async ({
    page,
    isMobile,
  }) => {
    const glowing = line(page, 'line-glow')
    expect(await computed(glowing, 'box-shadow')).not.toBe('none')
    expect(await computed(glowing, 'box-shadow')).toContain('8px 1px')
    expect((await box(glowing)).height).toBe(1)
    // The same header, flat: its box, and the whole section, are the same size.
    const flatBox = await box(line(page, 'line-flat'))
    const glowBox = await box(glowing)
    expect(glowBox.height).toBe(flatBox.height)
    expect(glowBox.width).toBeCloseTo(flatBox.width, 1)
    const heights = await Promise.all(
      ['line-flat', 'line-glow'].map(async (name) => (await box(section(page, name))).height),
    )
    expect(heights[1]).toBe(heights[0])
    if (isMobile) return
    expect(await haloAround(page, glowing, 0.5)).toBeGreaterThan(GLOW_VISIBLE)
    expect(await haloAround(page, line(page, 'line-flat'), 0.5)).toBeLessThan(FLAT_BARE)
  })

  test('is larger on a bold Line, by the Lab’s sizes', async ({ page }) => {
    const shadow = await computed(line(page, 'line-glow-bold'), 'box-shadow')
    expect(shadow).toContain('10px 2px')
    expect((await box(line(page, 'line-glow-bold'))).height).toBe(2)
  })

  test('paints a halo around a Double without changing its 5px box', async ({ page, isMobile }) => {
    const glowing = line(page, 'double-glow')
    expect(await computed(glowing, 'box-shadow')).not.toBe('none')
    expect((await box(glowing)).height).toBe(5)
    expect(await computed(glowing, 'border-top-width')).toBe('1px')
    if (isMobile) return
    expect(await haloAround(page, glowing, 0.5)).toBeGreaterThan(GLOW_VISIBLE)
  })

  test('paints a masked halo around a Gradient: outside the line’s box, faded at its ends, nothing clipped', async ({
    page,
    isMobile,
  }) => {
    const wrapper = line(page, 'gradient-glow')
    const flatWrapper = line(page, 'gradient-flat')
    // The wrapper is the line's own size; the glow layer inside it is taller and masked, and painted over nothing.
    const wrapperBox = await box(wrapper)
    expect(wrapperBox.height).toBe((await box(flatWrapper)).height)
    const layer = wrapper.locator(':scope > span').first()
    const layerBox = await box(layer)
    expect(layerBox.height).toBeGreaterThan(wrapperBox.height + 12)
    expect(await computed(layer, 'mask-image')).toContain('linear-gradient')
    expect(await computed(wrapper, 'overflow')).toBe('visible')
    const heights = await Promise.all(
      ['gradient-flat', 'gradient-glow'].map(
        async (name) => (await box(section(page, name))).height,
      ),
    )
    expect(heights[1]).toBe(heights[0])
    // No horizontal or vertical overflow made by the halo.
    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    }))
    expect(overflow.x).toBeLessThanOrEqual(0)
    expect(await computed(page.locator('section#rf-gradient-glow'), 'overflow-y')).not.toBe(
      'hidden',
    )
    if (isMobile) return
    // Pixels: a halo above and below the middle, none beside the flat twin, and much less at the faded end.
    const middle = await haloAround(page, wrapper, 0.5)
    expect(middle, 'halo at the middle').toBeGreaterThan(GLOW_VISIBLE)
    expect(await haloAround(page, flatWrapper, 0.5)).toBeLessThan(FLAT_BARE)
    expect(await haloAround(page, wrapper, 0.005), 'halo at the faded end').toBeLessThan(middle / 2)
  })

  test('lets a Gradient’s halo run past its inner end beside a centre, and not past its faded outer end', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Reads pixels at desktop widths')
    const first = linesOf(dividerIn(page, 'gradient-glow-centre')).first()
    const b = await box(first)
    const at = (dx: number) => ({ x: b.x + dx, y: b.y + 1 })
    const [bg, innerNear, innerFar, outerNear, outerFar] = await pixelsAt(
      page,
      await page.screenshot(),
      [{ x: b.x - 24, y: b.y + 1 }, at(b.width + 1), at(b.width + 5), at(-1), at(-6)],
    )
    // Measured: 23 at 1px past the end and 2 at 6px; nothing past the outer end.
    expect(distance(innerNear, bg), 'halo 1px past the inner end').toBeGreaterThan(GLOW_VISIBLE / 2)
    expect(distance(innerFar, bg), 'halo has fallen away 5px on').toBeLessThan(
      distance(innerNear, bg),
    )
    expect(distance(outerNear, bg), 'nothing past the outer end').toBeLessThan(FLAT_BARE)
    expect(distance(outerFar, bg), 'nothing past the outer end').toBeLessThan(FLAT_BARE)
  })

  test('is larger on a bold Gradient, and keeps its 3px line', async ({ page }) => {
    const wrapper = line(page, 'gradient-glow-bold')
    expect((await box(wrapper)).height).toBe(3)
    const layer = wrapper.locator(':scope > span').first()
    expect((await box(layer)).height).toBeGreaterThan(30)
    expect(await computed(layer.locator(':scope > span'), 'filter')).toContain('blur(5px)')
  })

  test('draws a full-width Gradient halo without a horizontal scrollbar', async ({ page }) => {
    await box(line(page, 'gradient-glow-full'))
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  /**
   * A full-width section keeps no gutters of its own (section-style.ts), so on a phone a Full width divider in its
   * header runs from one edge of the screen to the other: the one place a glow could pass the viewport.
   */
  test.describe('in a full-width section on a phone, with no gutter', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    for (const name of ['gutterless-thin', 'gutterless-bold', 'gutterless-centre']) {
      test(`keeps the ${name} halo inside the screen, with no horizontal scroll`, async ({
        page,
      }) => {
        const wrapper = line(page, name)
        const b = await box(wrapper)
        // The line really does run edge to edge (or, beside a centre, from the edge to the centre).
        expect(b.x, 'line starts at the screen edge').toBeLessThanOrEqual(1)
        // And its own halo layer, taken alone, stays inside the screen on the outer side.
        const layer = await wrapper
          .locator(':scope > span')
          .first()
          .evaluate((node) => {
            const r = node.getBoundingClientRect()
            return { left: r.left, right: r.right, width: window.innerWidth }
          })
        expect(layer.left, 'halo layer past the left edge').toBeGreaterThanOrEqual(0)
        if (name !== 'gutterless-centre')
          expect(layer.right, 'halo layer past the right edge').toBeLessThanOrEqual(layer.width)
        const overflow = await page.evaluate(() => ({
          x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          body: document.body.scrollWidth - document.body.clientWidth,
          pageX: window.scrollX,
        }))
        expect(overflow.x, 'page scrolls sideways').toBeLessThanOrEqual(0)
        expect(overflow.body).toBeLessThanOrEqual(0)
        // Scrolling right goes nowhere.
        await page.evaluate(() => {
          window.scrollTo(40, window.scrollY)
        })
        expect(await page.evaluate(() => window.scrollX)).toBe(0)
      })
    }

    test('still paints the halo above and below the line, and nothing at the faded edge', async ({
      page,
    }) => {
      for (const name of ['gutterless-thin', 'gutterless-bold']) {
        const b = await box(line(page, name))
        // The line starts at the screen's edge, so the page's own colour is read above it, where no halo reaches.
        const at = (fraction: number, dy: number) => ({ x: b.x + fraction * b.width, y: b.y + dy })
        const [bg, middle, edge] = await pixelsAt(page, await page.screenshot(), [
          at(0.5, -16),
          at(0.5, -1.5),
          at(0.003, -1.5),
        ])
        expect(distance(middle, bg), `${name} halo`).toBeGreaterThan(GLOW_VISIBLE)
        // At the screen edge the line is faded out, and so is its halo.
        expect(distance(edge, bg), `${name} edge`).toBeLessThan(GLOW_VISIBLE / 2)
      }
    })
  })

  test('fades a Gradient’s halo at the outer ends beside a centre, and keeps the centre', async ({
    page,
  }) => {
    const divider = dividerIn(page, 'gradient-glow-centre')
    await expect(divider).toHaveAttribute('data-divider-centre', 'diamond')
    const lines = linesOf(divider)
    await expect(lines).toHaveCount(2)
    for (let i = 0; i < 2; i++)
      expect(await computed(lines.nth(i).locator(':scope > span').first(), 'mask-image')).toContain(
        'linear-gradient',
      )
  })
})

test.describe('the Ornament centre', () => {
  const svg = (page: Page, name: string) => dividerIn(page, name).locator('svg')

  test('draws the flourish at the Lab’s 90 by 18, and larger on request', async ({ page }) => {
    const medium = await box(svg(page, 'ornament'))
    expect(medium.width).toBeCloseTo(90, 0)
    expect(medium.height).toBeCloseTo(18, 0)
    const large = await box(svg(page, 'ornament-own'))
    expect(large.width).toBeCloseTo(110, 0)
    expect(large.height).toBeCloseTo(22, 0)
    // Every size keeps the flourish's own 120 by 24 proportions (5 to 1), small included.
    const small = await box(svg(page, 'ornament-small'))
    expect(small.width).toBeCloseTo(70, 0)
    expect(small.height).toBeCloseTo(14, 0)
    for (const size of [small, medium, large]) expect(size.width / size.height).toBeCloseTo(5, 1)
    await expect(svg(page, 'ornament').locator('path')).toHaveCount(2)
    await expect(svg(page, 'ornament').locator('rect')).toHaveCount(1)
  })

  test('is decoration: hidden from assistive technology, not focusable, with nothing to read', async ({
    page,
  }) => {
    const mark = svg(page, 'ornament')
    await expect(mark).toHaveAttribute('aria-hidden', 'true')
    await expect(mark).toHaveAttribute('focusable', 'false')
    await expect(mark).not.toHaveAttribute('tabindex', /.*/)
    await expect(dividerIn(page, 'ornament')).toHaveAttribute('aria-hidden', 'true')
    expect(await mark.evaluate((node) => node.textContent.trim())).toBe('')
    // Keyboard: tabbing never lands inside the divider.
    await page.keyboard.press('Tab')
    expect(
      await page.evaluate(() => !!document.activeElement?.closest('[data-decorative-divider]')),
    ).toBe(false)
  })

  test('takes the centre colour when one is chosen, and the lines’ colour otherwise', async ({
    page,
  }) => {
    const stroke = (name: string) =>
      svg(page, name)
        .locator('path')
        .first()
        .evaluate((node) => getComputedStyle(node).stroke)
    const colourOf = (name: string) => computed(dividerIn(page, name), 'color')
    // Unset: the flourish follows the line colour.
    expect(await stroke('ornament')).toBe(await colourOf('ornament'))
    // Highlight: its own colour, which is not the line's.
    const highlight = await page.evaluate(() => {
      const probe = document.createElement('span')
      probe.style.color = 'var(--color-highlight)'
      document.body.append(probe)
      const colour = getComputedStyle(probe).color
      probe.remove()
      return colour
    })
    expect(await stroke('ornament-own')).toBe(highlight)
    expect(await stroke('ornament-own')).not.toBe(await colourOf('ornament-own'))
  })

  test('is painted: strokes and a diamond, not an empty box', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Reads pixels at desktop widths')
    const b = await box(svg(page, 'ornament'))
    const points = [{ x: b.x - 16, y: b.y + b.height / 2 }]
    for (let x = 0; x < b.width; x += 1)
      for (let y = 0; y < b.height; y += 1) points.push({ x: b.x + x, y: b.y + y })
    const [bg, ...rest] = await pixelsAt(page, await page.screenshot(), points)
    expect(rest.filter((pixel) => distance(pixel, bg) > 40).length).toBeGreaterThan(40)
  })

  test('sits between Glow lines without changing the flourish', async ({ page }) => {
    const divider = dividerIn(page, 'ornament-glow')
    await expect(divider.locator('svg')).toHaveCount(1)
    expect(await computed(linesOf(divider).first(), 'box-shadow')).not.toBe('none')
    expect(await computed(divider.locator('svg'), 'filter')).toBe('none')
    expect(await computed(divider.locator('svg'), 'box-shadow')).toBe('none')
  })

  test('is never drawn for Three dots', async ({ page }) => {
    await expect(dividerIn(page, 'dots-ornament').locator('svg')).toHaveCount(0)
    await expect(dividerIn(page, 'dots-ornament')).not.toHaveAttribute('data-divider-centre', /.*/)
  })
})

test.describe('in forced colours', () => {
  async function force(page: Page, browserName: string) {
    await page.emulateMedia({ forcedColors: 'active' })
    const supported = await page.evaluate(() => matchMedia('(forced-colors: active)').matches)
    test.skip(!supported, `${browserName} can't emulate forced colours`)
  }
  const systemText = (page: Page) =>
    page.evaluate(() => {
      const probe = document.createElement('span')
      probe.style.color = 'CanvasText'
      document.body.append(probe)
      const colour = getComputedStyle(probe).color
      probe.remove()
      return colour
    })

  test('suppresses Glow on Line, Double and Gradient and keeps the lines visible', async ({
    page,
    browserName,
    isMobile,
  }) => {
    await force(page, browserName)
    for (const name of ['line-glow', 'line-glow-bold', 'double-glow']) {
      expect(await computed(line(page, name), 'box-shadow'), name).toBe('none')
    }
    // The Gradient's glow layer is not drawn at all, and its line is the plain system-text line.
    const wrapper = line(page, 'gradient-glow')
    expect(await computed(wrapper.locator(':scope > span').first(), 'display')).toBe('none')
    const painted = wrapper.locator(':scope > span').nth(1)
    expect(await computed(painted, 'background-image')).toBe('none')
    expect(await computed(painted, 'background-color')).not.toBe('rgba(0, 0, 0, 0)')
    if (browserName === 'chromium') {
      expect(await computed(painted, 'background-color')).toBe(await systemText(page))
      expect(await computed(line(page, 'line-glow'), 'background-color')).toBe(
        await systemText(page),
      )
      expect(await computed(line(page, 'double-glow'), 'border-top-color')).toBe(
        await systemText(page),
      )
    }
    if (isMobile) return
    // The lines still paint, and nothing paints beside them.
    for (const name of ['line-glow', 'gradient-glow']) {
      const target = name === 'line-glow' ? line(page, name) : painted
      const b = await box(target)
      const [bg, on, above] = await pixelsAt(page, await page.screenshot(), [
        { x: b.x - 14, y: b.y },
        { x: b.x + b.width / 2, y: b.y + b.height / 2 },
        { x: b.x + b.width / 2, y: b.y - 5 },
      ])
      expect(distance(on, bg), `${name} line`).toBeGreaterThan(40)
      expect(distance(above, bg), `${name} no halo`).toBeLessThan(FLAT_BARE)
    }
  })

  test('keeps the Ornament visible in system colours', async ({ page, browserName, isMobile }) => {
    await force(page, browserName)
    const mark = dividerIn(page, 'ornament-own').locator('svg')
    const stroke = await mark
      .locator('path')
      .first()
      .evaluate((node) => getComputedStyle(node).stroke)
    expect(stroke).not.toBe('none')
    if (browserName === 'chromium') expect(stroke).toBe(await systemText(page))
    if (isMobile) return
    const b = await box(mark)
    const points = [{ x: b.x - 16, y: b.y + b.height / 2 }]
    for (let x = 0; x < b.width; x += 1)
      for (let y = 0; y < b.height; y += 1) points.push({ x: b.x + x, y: b.y + y })
    const [bg, ...rest] = await pixelsAt(page, await page.screenshot(), points)
    expect(rest.filter((pixel) => distance(pixel, bg) > 40).length).toBeGreaterThan(40)
  })
})

test('has no WCAG 2.2 AA violations', async ({ page }) => {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(violations.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([])
})
