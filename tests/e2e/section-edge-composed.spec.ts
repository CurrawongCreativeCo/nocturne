import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'
import {
  contourCut,
  contourGap,
  TIDE_TIGHT_SEPARATION,
  tideBack,
  tideFront,
} from '../../src/components/ui/edge-fixed'

/**
 * Tide and Contour drawn by the composition renderer in a real browser (task 151, Slice 2; Stage 3
 * section 5). `/edge-composed` puts each over a known section. Every colour is read the way the browser
 * paints it: a computed colour is converted to sRGB by the browser, and a pixel is read from a screenshot.
 * The expected geometry comes from the shapes' own functions (edge-fixed.ts), in band units: x across the
 * frame, y from the top of the band (0) to the section's bottom (1).
 *
 * Runs in Chromium in CI. `playwright.webkit.config.ts` runs it in WebKit locally (Playwright's WebKit, not
 * Safari or an iPhone).
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
/** Within this many steps per channel: a screenshot's rounding and colour conversion. */
const TOLERANCE = 4

const section = (page: Page, id: string) => page.locator(`section#${id}`)
const frameOf = (page: Page, id: string) => section(page, id).locator('xpath=..')

/**
 * A colour the browser computes for `property` (on `el`, or on a probe inside it that takes `role` as its
 * text colour), as the sRGB a screenshot holds: painted onto a canvas and read back.
 */
const computedSrgb = (el: Element, [property, role]: [string, string | null]) => {
  let target = el
  if (role) {
    target = document.createElement('span')
    ;(target as HTMLElement).style.color = `var(${role})`
    el.append(target)
  }
  const value = getComputedStyle(target)[property as 'color']
  if (role) target.remove()
  const context = document.createElement('canvas').getContext('2d')
  if (!context) throw new Error('No canvas.')
  context.fillStyle = '#010203'
  context.fillStyle = value
  if (context.fillStyle === '#010203') throw new Error(`The canvas can't paint ${value}.`)
  context.fillRect(0, 0, 1, 1)
  return [...context.getImageData(0, 0, 1, 1).data]
}

/** A colour the browser computes for an element, in sRGB (with alpha). */
const srgb = (locator: Locator, property: string) =>
  locator.evaluate(computedSrgb, [property, null] as [string, string | null])

/** A theme role as it resolves inside `within`, in sRGB: a probe there takes it as its text colour. */
const roleIn = (within: Locator, role: string) =>
  within.evaluate(computedSrgb, ['color', role] as [string, string | null])

/** What is painted under a section: its own background, or the page's where it has none. */
async function backgroundOf(page: Page, target: Locator): Promise<number[]> {
  const own = await srgb(target, 'backgroundColor')
  return own[3] === 0 ? srgb(page.locator('body'), 'backgroundColor') : own
}

/** `colour` at `opacity` over `under`, as a browser blends it (in sRGB). */
const over = (colour: number[], opacity: number, under: number[]) =>
  [0, 1, 2].map((i) => Math.round(opacity * (colour[i] ?? 0) + (1 - opacity) * (under[i] ?? 0)))

const near = (actual: number[] | undefined, expected: number[]) =>
  expected.slice(0, 3).every((value, i) => Math.abs((actual?.[i] ?? -99) - value) <= TOLERANCE)

/** That two colours are the same through a screenshot's rounding, naming both if they aren't. */
const expectNear = (actual: number[] | undefined, expected: number[], what: string) => {
  expect(
    near(actual, expected),
    `${what}: ${String(actual)} is not ${String(expected.slice(0, 3))}`,
  ).toBe(true)
}

/** The edge's height in px, as the page resolves it at this width. */
const bandHeight = (frame: Locator) =>
  frame.evaluate((el) => {
    const probe = document.createElement('div')
    probe.style.height = 'var(--edge-h)'
    el.append(probe)
    const height = probe.getBoundingClientRect().height
    probe.remove()
    return height
  })

/**
 * Scrolls a frame's band to the middle of the window and reads the colour at each point given in band
 * units, from a screenshot.
 */
async function readBand(page: Page, id: string, points: [x: number, y: number][]) {
  const frame = frameOf(page, id)
  const height = await bandHeight(frame)
  await frame.evaluate((el, h) => {
    const box = el.getBoundingClientRect()
    window.scrollBy(0, box.bottom - h / 2 - window.innerHeight / 2)
  }, height)
  const box = await frame.evaluate((el) => {
    const { left, width, bottom } = el.getBoundingClientRect()
    return { left, width, bottom }
  })
  const at = points.map(([x, y]) => ({
    x: box.left + x * box.width,
    y: box.bottom - height + y * height,
  }))
  const png = await page.screenshot()
  return page.evaluate(
    async ({ base64, at }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d')
      if (!context) throw new Error('No canvas.')
      context.drawImage(image, 0, 0)
      const scale = image.naturalWidth / window.innerWidth
      return at.map(({ x, y }) => [
        ...context
          .getImageData(Math.floor(x * scale), Math.floor(y * scale), 1, 1)
          .data.slice(0, 3),
      ])
    },
    { base64: png.toString('base64'), at },
  )
}

const part = (page: Page, id: string, name: string) =>
  frameOf(page, id).locator(`[data-edge-part="${name}"] path`)

test.beforeEach(async ({ page }) => {
  await page.goto('/edge-composed')
})

test.describe('Tide in the browser', () => {
  test.skip(({ isMobile }) => isMobile, 'Reads pixels at desktop widths, where the bands are tall')

  test('cuts the section along Tide’s line and paints its crest under it, over the section below', async ({
    page,
  }) => {
    const upper = await backgroundOf(page, section(page, 'ct-tide'))
    const below = await backgroundOf(page, section(page, 'ct-tide-below'))
    const crest = await srgb(part(page, 'ct-tide', 'under-1'), 'fill')
    for (const x of [0.45, 0.6, 0.7]) {
      const front = tideFront(x)
      const back = tideBack(x)
      const [above, inCrest, under] = await readBand(page, 'ct-tide', [
        [x, front - 0.08],
        [x, (front + back) / 2],
        [x, back + (1 - back) / 2],
      ])
      // The crest fills up to the band's top, so this proves it is drawn under the section above.
      expectNear(above, upper, `above the cut at x=${String(x)}`)
      expectNear(inCrest, over(crest, 0.25, below), `in the crest at x=${String(x)}`)
      expectNear(under, below, `under the crest at x=${String(x)}`)
    }
  })

  test('draws Large’s crest at 60% of its separation, in the Primary of the inverse section below', async ({
    page,
  }) => {
    const below = section(page, 'ct-tide-large-below')
    const crest = await srgb(part(page, 'ct-tide-large', 'under-1'), 'fill')
    // The section below's own Primary, which differs from the page's: the crest follows its tone.
    expectNear(crest, await roleIn(below, '--color-accent'), 'the crest’s colour')
    expect(near(crest, await roleIn(page.locator('body'), '--color-accent'))).toBe(false)
    const belowColour = await backgroundOf(page, below)
    const x = 0.6
    const front = tideFront(x)
    const tight = front + (tideBack(x) - front) * TIDE_TIGHT_SEPARATION
    const [inCrest, betweenBacks] = await readBand(page, 'ct-tide-large', [
      [x, (front + tight) / 2],
      [x, (tight + tideBack(x)) / 2],
    ])
    expectNear(inCrest, over(crest, 0.25, belowColour), 'in the crest')
    // Where the original back crest would have reached, there is only the section below.
    expectNear(betweenBacks, belowColour, 'between the 60% and the original back crest')
  })

  test('paints Echo in the colour of the section above, at 40%, over the section actually below', async ({
    page,
  }) => {
    const upper = await backgroundOf(page, section(page, 'ct-echo'))
    const below = await backgroundOf(page, section(page, 'ct-echo-below'))
    const echo = await srgb(part(page, 'ct-echo', 'under-1'), 'fill')
    expectNear(echo, upper, 'Echo’s colour')
    const x = 0.6
    const front = tideFront(x)
    const tight = front + (tideBack(x) - front) * TIDE_TIGHT_SEPARATION
    const [inCrest] = await readBand(page, 'ct-echo', [[x, (front + tight) / 2]])
    expectNear(inCrest, over(upper, 0.4, below), 'in the echo crest')
  })

  test('stays under the sticky header: the header looks the same with the edge’s parts drawn or hidden', async ({
    page,
  }) => {
    await page.addStyleTag({
      content:
        '[data-site-chrome] header { background: rgb(240, 200, 10) !important; backdrop-filter: none !important; }',
    })
    const header = page.locator('[data-site-chrome] header').first()
    const frame = frameOf(page, 'ct-tide')
    const height = await bandHeight(frame)
    // The band's middle under the header's middle.
    const headerBox = await header.boundingBox()
    if (!headerBox) throw new Error('No header.')
    await frame.evaluate(
      (el, { h, y }) => {
        window.scrollBy(0, el.getBoundingClientRect().bottom - h / 2 - y)
      },
      { h: height, y: headerBox.y + headerBox.height / 2 },
    )
    const shot = () => header.screenshot()
    const drawn = await shot()
    await page.addStyleTag({ content: '[data-edge-part] { display: none !important; }' })
    expect((await shot()).equals(drawn)).toBe(true)
  })
})

test.describe('Contour in the browser', () => {
  test.skip(({ isMobile }) => isMobile, 'Reads pixels at desktop widths, where the bands are tall')

  test('draws three lines over the section below, which has an edge of its own, in that section’s Primary', async ({
    page,
  }) => {
    const below = section(page, 'ct-contour-below')
    const belowColour = await backgroundOf(page, below)
    const upper = await backgroundOf(page, section(page, 'ct-contour'))
    const primary = await roleIn(below, '--color-accent')
    for (const name of ['line-1', 'line-2', 'line-3'])
      expectNear(await srgb(part(page, 'ct-contour', name), 'stroke'), primary, name)
    const x = 0.5
    const cut = contourCut(x)
    const gap = contourGap(x)
    const [above, betweenLines, onLine] = await readBand(page, 'ct-contour', [
      [x, cut - 0.03],
      [x, cut + 1.5 * gap],
      [x, cut + gap],
    ])
    expectNear(above, upper, 'above the cut')
    // Between the lines is the section below itself: the lines are strokes, not fills.
    expectNear(betweenLines, belowColour, 'between the second and third lines')
    // On the second line (65%), the section below is tinted towards its Primary.
    expect(near(onLine, belowColour), `on the second line: ${String(onLine)}`).toBe(false)
  })

  test('keeps the page’s colours over the footer’s band, where no section follows', async ({
    page,
  }) => {
    await expect(page.locator('[data-edge-backdrop]')).toHaveCount(1)
    const muted = await srgb(part(page, 'ct-last', 'line-1'), 'stroke')
    expectNear(muted, await roleIn(page.locator('body'), '--color-ink-muted'), 'the lines’ colour')
  })
})

test.describe('Classic beside them', () => {
  test('keeps the page’s colours over an inverse section: the new rules never reach it', async ({
    page,
  }) => {
    const frame = frameOf(page, 'ct-classic')
    const body = page.locator('body')
    const line = await srgb(frame.locator('[data-edge-layer="line"] path'), 'stroke')
    expectNear(line, await roleIn(body, '--color-accent'), 'the accent line')
    expectNear(
      await srgb(frame.locator('[data-edge-layer="back"] path'), 'fill'),
      await roleIn(body, '--color-accent-2'),
      'the back wave',
    )
    // The inverse section below has a different Primary, which Classic does not take.
    expect(near(line, await roleIn(section(page, 'ct-classic-below'), '--color-accent'))).toBe(
      false,
    )
  })
})

test.describe('fallbacks', () => {
  test('hides the composed parts in forced colours, and leaves Classic’s back wave and line as they were', async ({
    page,
    browserName,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    const supported = await page.evaluate(() => matchMedia('(forced-colors: active)').matches)
    test.skip(!supported, `${browserName} can't emulate forced colours`)
    const parts = page.locator('[data-edge-part]')
    expect(await parts.count()).toBeGreaterThan(0)
    for (const display of await parts.evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).display),
    ))
      expect(display).toBe('none')
    for (const display of await page
      .locator('[data-edge-layer]')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).display)))
      expect(display).not.toBe('none')
  })

  test('keeps the no-mask rule for the parts, which hides every part, beside today’s unchanged one', async ({
    page,
  }) => {
    // Both browsers support masks, so the condition can't be met here. What can be proved: the browser
    // parsed and kept the rule, and its rules, applied, hide exactly what they should.
    // The build may merge the block's rules into one, so its selectors are read, not its text.
    const block = await page.evaluate(() => {
      for (const sheet of document.styleSheets)
        for (const rule of sheet.cssRules)
          if (
            rule instanceof CSSSupportsRule &&
            rule.conditionText.trim().startsWith('not') &&
            rule.conditionText.includes('mask-image')
          )
            return {
              selectors: [...rule.cssRules].flatMap((inside) =>
                inside instanceof CSSStyleRule ? inside.selectorText.split(/\s*,\s*/) : [],
              ),
              texts: [...rule.cssRules].map((inside) => inside.cssText),
            }
      return { selectors: [], texts: [] }
    })
    expect(block.selectors).toContain('[data-edge-part]')
    expect(block.selectors).toContain('[data-section-edge-frame] > svg')
    const inner = block.texts
    await page.addStyleTag({ content: inner.join('\n') })
    for (const display of await page
      .locator('[data-edge-part]')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).display)))
      expect(display).toBe('none')
  })
})

test('has no WCAG 2.2 AA violations', async ({ page }) => {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(violations.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([])
})
