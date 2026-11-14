import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

import { test } from './fixtures/test'
import {
  backgroundOf,
  bandHeight,
  expectNear,
  frameOf,
  near,
  over,
  paintedShare,
  part,
  readBand,
  roleIn,
  section,
  settled,
  srgb,
  TOLERANCE,
} from './section-edge-pixels'
import { LAB_STILL_WATER, labFamily } from '../../src/components/ui/edge-geometry.test-utils'
import { layeredGeometry } from '../../src/components/ui/edge-layered'
import {
  BELOW_OPACITY,
  LAYERED_PRESETS,
  opacityOf,
  separationOf,
} from '../../src/components/ui/edge-presets'

/**
 * Still water, drawn by the layered-edge generator, in a real browser (task 151, Slice 3). `/edge-layered`
 * puts it over sections of a known colour, with layers chosen to contrast with them, so a pixel can tell a
 * layer from the section it is on. Geometry is checked in unit tests (edge-layered.test.ts); this reads what
 * the browser actually paints: paint order, clipping at the cut, the 3 px floor after the mask has clipped,
 * the heights the resolver holds, and the fallbacks.
 *
 * Runs in Chromium in CI. `playwright.webkit.config.ts` runs it in WebKit locally (Playwright's WebKit, not
 * Safari or an iPhone).
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const STILL = LAYERED_PRESETS['still-water']
/** The share of the width a layer must clear 3 px over (Slice 3 decision). */
const MIN_SHARE = 0.1

/** The geometry of the default crest and depth, with or without the layer below. */
const geometry = (below: boolean, flip = false) =>
  layeredGeometry({
    shape: STILL.shape,
    crest: STILL.crests.standard,
    separation: separationOf(STILL, 'standard'),
    below,
    flip,
  })

test.beforeEach(async ({ page }) => {
  await page.goto('/edge-layered')
})

test.describe('Still water in the browser', () => {
  test.skip(({ isMobile }) => isMobile, 'Reads pixels at desktop widths, where the bands are tall')

  test('cuts along its line, paints its layer above inside the section and its layer below over the section below, and clips each at the cut', async ({
    page,
  }) => {
    const upper = await backgroundOf(page, section(page, 'ls-ink'))
    const below = await backgroundOf(page, section(page, 'ls-ink-below'))
    const ink = await srgb(part(page, 'ls-ink', 'over-1'), 'fill')
    const lower = await srgb(part(page, 'ls-ink', 'under-1'), 'fill')
    // The layer below follows the section below's own Primary, which the page's does not.
    expectNear(
      lower,
      await roleIn(section(page, 'ls-ink-below'), '--color-accent'),
      'the lower layer',
    )
    // Contrast: each layer can be told from what it is drawn on.
    expect(near(over(ink, 0.2, upper), upper, 2 * TOLERANCE), 'the upper layer contrasts').toBe(
      false,
    )

    const g = geometry(true)
    const height = await bandHeight(frameOf(page, 'ls-ink'))
    const top = opacityOf(STILL, 'strong')
    const bottom = top * BELOW_OPACITY
    // Columns where both layers are deep enough (10 px) to read their middle from a pixel.
    const columns = Array.from({ length: 99 }, (_, i) => (i + 1) / 100).filter((x) => {
      const cut = g.cut(x)
      return (
        (cut - (g.layers[0]?.line(x) ?? cut)) * height >= 10 &&
        ((g.layers[1]?.line(x) ?? cut) - cut) * height >= 10
      )
    })
    expect(columns.length, 'columns where both layers are readable').toBeGreaterThanOrEqual(3)
    const picks = [
      columns[0],
      columns[Math.floor(columns.length / 2)],
      columns[columns.length - 1],
    ].filter((x): x is number => x !== undefined)
    for (const x of picks) {
      const cut = g.cut(x)
      const layerAbove = g.layers[0]?.line(x) ?? cut
      const layerBelow = g.layers[1]?.line(x) ?? cut
      const [above, inUpper, inLower, beneath] = await readBand(page, 'ls-ink', [
        // Above the layer's line: the section itself.
        [x, Math.max(0.01, layerAbove - 6 / height)],
        // Between the layer's line and the cut: the layer over the section.
        [x, (layerAbove + cut) / 2],
        // Between the cut and the lower layer's line: the lower layer over the section below.
        [x, (cut + layerBelow) / 2],
        // Beyond the lower layer, under the cut: the section below alone. The upper layer's fill runs to the
        // band's bottom, so this is where an unclipped layer would show.
        [x, Math.min(0.99, layerBelow + 6 / height)],
      ])
      expectNear(above, upper, `above the layer at x=${String(x)}`)
      expectNear(inUpper, over(ink, top, upper), `in the upper layer at x=${String(x)}`)
      expectNear(inLower, over(lower, bottom, below), `in the lower layer at x=${String(x)}`)
      expectNear(
        beneath,
        below,
        `under the lower layer at x=${String(x)}, where an unclipped layer would show`,
      )
    }
  })

  test('draws a layer above that clears 3 px over at least 10% of the width, after the mask has clipped it, at Large on a desktop', async ({
    page,
  }) => {
    const upper = await backgroundOf(page, section(page, 'ls-ink'))
    const below = await backgroundOf(page, section(page, 'ls-ink-below'))
    const ink = await srgb(part(page, 'ls-ink', 'over-1'), 'fill')
    const lower = await srgb(part(page, 'ls-ink', 'under-1'), 'fill')
    const top = over(ink, opacityOf(STILL, 'strong'), upper)
    const bottom = over(lower, opacityOf(STILL, 'strong') * BELOW_OPACITY, below)
    expect(await paintedShare(page, 'ls-ink', top)).toBeGreaterThanOrEqual(MIN_SHARE)
    expect(await paintedShare(page, 'ls-ink', bottom)).toBeGreaterThanOrEqual(MIN_SHARE)
    // The detector can fail: a colour nothing is painted in finds nothing.
    expect(await paintedShare(page, 'ls-ink', [1, 2, 3])).toBe(0)
  })

  test('draws no layer below at Shallow, though one is stored, and the detector finds none', async ({
    page,
  }) => {
    await expect(frameOf(page, 'ls-shallow').locator('[data-edge-part^="under"]')).toHaveCount(0)
    await expect(frameOf(page, 'ls-shallow').locator('[data-edge-part^="over"]')).toHaveCount(1)
    // The same section with the layer below on, at Standard, paints it (ls-ink); at Shallow its colour is absent.
    const below = await backgroundOf(page, section(page, 'ls-shallow-below'))
    const accent = await roleIn(section(page, 'ls-shallow-below'), '--color-accent')
    const wouldBe = over(accent, opacityOf(STILL, 'strong') * BELOW_OPACITY, below)
    expect(await paintedShare(page, 'ls-shallow', wouldBe)).toBe(0)
  })

  test('draws a stored Small at Medium, and holds stored custom heights to 40-64, 40-120 and 40-160 px', async ({
    page,
  }) => {
    const medium = await bandHeight(frameOf(page, 'ls-default'))
    expect(await bandHeight(frameOf(page, 'ls-small'))).toBeCloseTo(medium, 3)
    // 20, 300 and 999 are stored; the desktop window here is 1280 wide, so the desktop height shows.
    expect(await bandHeight(frameOf(page, 'ls-custom'))).toBe(160)
    for (const [width, expected] of [
      [360, 40],
      [767, 40],
      [768, 120],
      [1023, 120],
      [1024, 160],
      [2560, 160],
    ] as const) {
      await page.setViewportSize({ width, height: 900 })
      await settled(frameOf(page, 'ls-custom'))
      expect(await bandHeight(frameOf(page, 'ls-custom')), `at ${String(width)} px`).toBe(expected)
    }
  })

  test('draws the layer above the section’s mark, a gradient and a picture, and under its content', async ({
    page,
  }) => {
    for (const id of ['ls-mark', 'ls-gradient', 'ls-picture']) {
      const frame = frameOf(page, id)
      await settled(frame)
      const height = await bandHeight(frame)
      const g = geometry(false)
      // The middle of the layer at the column where it is deepest.
      let x = 0.5
      let deepest = 0
      for (let i = 1; i < 100; i++) {
        const depth = g.cut(i / 100) - (g.layers[0]?.line(i / 100) ?? 0)
        if (depth > deepest) {
          deepest = depth
          x = i / 100
        }
      }
      const y = (g.cut(x) + (g.layers[0]?.line(x) ?? 0)) / 2
      expect(deepest * height, `${id}: the layer is deep enough to read`).toBeGreaterThan(8)
      const [withLayer] = await readBand(page, id, [[x, y]])
      const content = section(page, id).locator(':scope > div').last()
      const contentShot = await content.screenshot()
      await page.addStyleTag({ content: '[data-edge-part] { display: none !important; }' })
      const [withoutLayer] = await readBand(page, id, [[x, y]])
      // Paint order: with the layer drawn the pixel differs, so it is over the mark, gradient or picture.
      expect(
        near(withLayer, withoutLayer ?? [], TOLERANCE),
        `${id}: the layer paints over its background`,
      ).toBe(false)
      // The layer never reaches the content: the content looks the same with it drawn or hidden.
      expect(
        (await content.screenshot()).equals(contentShot),
        `${id}: the content is unchanged`,
      ).toBe(true)
      await page.reload()
    }
  })

  test('mirrors with Flip: the flipped layer is where the unflipped one is not', async ({
    page,
  }) => {
    const upper = await backgroundOf(page, section(page, 'ls-flip'))
    const ink = await srgb(part(page, 'ls-flip', 'over-1'), 'fill')
    const flipped = geometry(true, true)
    const plain = geometry(true, false)
    const height = await bandHeight(frameOf(page, 'ls-flip'))
    const depthOf = (g: ReturnType<typeof geometry>, x: number) =>
      (g.cut(x) - (g.layers[0]?.line(x) ?? g.cut(x))) * height
    // The column where the flipped layer is deepest and the unflipped one is least there.
    let x = 0.5
    let best = -Infinity
    for (let i = 1; i < 100; i++) {
      const gain = depthOf(flipped, i / 100) - depthOf(plain, i / 100)
      if (gain > best) {
        best = gain
        x = i / 100
      }
    }
    expect(depthOf(flipped, x)).toBeGreaterThan(8)
    expect(depthOf(plain, x)).toBeLessThan(3)
    const [inLayer] = await readBand(page, 'ls-flip', [
      [x, (flipped.cut(x) + (flipped.layers[0]?.line(x) ?? 0)) / 2],
    ])
    expectNear(inLayer, over(ink, opacityOf(STILL, 'strong'), upper), 'in the flipped layer')
  })

  test('stays under the sticky header: the header looks the same with the layers drawn or hidden', async ({
    page,
  }) => {
    await page.addStyleTag({
      content:
        '[data-site-chrome] header { background: rgb(240, 200, 10) !important; backdrop-filter: none !important; }',
    })
    const header = page.locator('[data-site-chrome] header').first()
    const frame = frameOf(page, 'ls-ink')
    const height = await bandHeight(frame)
    const headerBox = await header.boundingBox()
    if (!headerBox) throw new Error('No header.')
    await frame.evaluate(
      (el, { h, y }) => {
        window.scrollBy(0, el.getBoundingClientRect().bottom - h / 2 - y)
      },
      { h: height, y: headerBox.y + headerBox.height / 2 },
    )
    const drawn = await header.screenshot()
    await page.addStyleTag({ content: '[data-edge-part] { display: none !important; }' })
    expect((await header.screenshot()).equals(drawn)).toBe(true)
  })
})

test.describe('on a 40 px band, a phone', () => {
  test.skip(({ isMobile }) => isMobile, 'Sets its own viewport')
  test.use({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 })

  test('shows both layers at Medium, the shortest band, with the layer below on at Standard depth, each over 10% of the width', async ({
    page,
  }, testInfo) => {
    const frame = frameOf(page, 'ls-default')
    await settled(frame)
    expect(await bandHeight(frame)).toBe(40)
    const upper = await backgroundOf(page, section(page, 'ls-default'))
    const below = await backgroundOf(page, section(page, 'ls-default-below'))
    const ink = await srgb(part(page, 'ls-default', 'over-1'), 'fill')
    const lower = await srgb(part(page, 'ls-default', 'under-1'), 'fill')
    const top = over(ink, opacityOf(STILL, 'strong'), upper)
    const bottom = over(lower, opacityOf(STILL, 'strong') * BELOW_OPACITY, below)
    expect(near(top, upper, 2 * TOLERANCE), 'the upper layer contrasts').toBe(false)
    expect(near(bottom, below, 2 * TOLERANCE), 'the lower layer contrasts').toBe(false)
    const upperShare = await paintedShare(page, 'ls-default', top)
    const lowerShare = await paintedShare(page, 'ls-default', bottom)
    expect(upperShare).toBeGreaterThanOrEqual(MIN_SHARE)
    expect(lowerShare).toBeGreaterThanOrEqual(MIN_SHARE)
    await testInfo.attach('40 px band, both layers', {
      body: await page.screenshot({
        clip: await clipAround(page, 'ls-default'),
        type: 'png',
      }),
      contentType: 'image/png',
    })
    testInfo.annotations.push({
      type: 'painted share (>= 2 solid CSS px)',
      description: `upper ${upperShare.toFixed(3)}, lower ${lowerShare.toFixed(3)}`,
    })
  })
})

/** The band's strip of the window, a little above and below, for a picture. */
async function clipAround(page: Page, id: string) {
  const frame = frameOf(page, id)
  const height = await bandHeight(frame)
  await frame.evaluate((el, h) => {
    window.scrollBy(0, el.getBoundingClientRect().bottom - h / 2 - window.innerHeight / 2)
  }, height)
  const box = await frame.evaluate((el) => {
    const { left, width, bottom } = el.getBoundingClientRect()
    return { left, width, bottom }
  })
  return { x: box.left, y: box.bottom - height - 12, width: box.width, height: height + 24 }
}

test.describe('against the Lab at 390 px', () => {
  test.skip(({ isMobile }) => isMobile, 'Sets its own viewport')
  test.use({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 })

  test('draws the layers the Lab’s own phone-band output loses, and attaches both for review', async ({
    page,
  }, testInfo) => {
    const frame = frameOf(page, 'ls-default')
    await settled(frame)
    const band = await bandHeight(frame)
    // Medium at 390 px is 24 + 0.04 x 390 = 39.6, held to its 40 px floor.
    expect(band).toBe(40)
    const upper = await backgroundOf(page, section(page, 'ls-default'))
    const below = await backgroundOf(page, section(page, 'ls-default-below'))
    const ink = await srgb(part(page, 'ls-default', 'over-1'), 'fill')
    const lower = await srgb(part(page, 'ls-default', 'under-1'), 'fill')
    const strength = opacityOf(STILL, 'strong')

    const ours = geometry(true)
    const lab = labFamily(
      { ...LAB_STILL_WATER, crest: STILL.crests.standard, sep: 0.2, under: true },
      band,
      false,
    )
    const WIDTH = 390
    const sampleLines = (cut: (x: number) => number, lines: ((x: number) => number)[]) => ({
      cut: Array.from({ length: WIDTH }, (_, i) => cut((i + 0.5) / WIDTH)),
      lines: lines.map((line) => Array.from({ length: WIDTH }, (_, i) => line((i + 0.5) / WIDTH))),
    })
    const draw = await page.evaluate(
      ({ ours, lab, colours, band, strength, belowStrength }) => {
        const scale = 4
        const paint = (
          shape: { cut: number[]; lines: number[][] },
          top: number,
          canvas: CanvasRenderingContext2D,
        ) => {
          const rgb = (c: number[]) => `rgb(${c[0] ?? 0} ${c[1] ?? 0} ${c[2] ?? 0})`
          const cols = shape.cut.length
          for (let x = 0; x < cols; x++) {
            const cut = (shape.cut[x] ?? 0) * band
            canvas.fillStyle = rgb(colours.upper)
            canvas.fillRect(x * scale, top, scale, cut * scale)
            canvas.fillStyle = rgb(colours.below)
            canvas.fillRect(x * scale, top + cut * scale, scale, (band - cut) * scale)
            const above = (shape.lines[0]?.[x] ?? cut / band) * band
            canvas.globalAlpha = strength
            canvas.fillStyle = rgb(colours.ink)
            canvas.fillRect(x * scale, top + above * scale, scale, Math.max(0, cut - above) * scale)
            const beneath = (shape.lines[1]?.[x] ?? cut / band) * band
            canvas.globalAlpha = belowStrength
            canvas.fillStyle = rgb(colours.lower)
            canvas.fillRect(x * scale, top + cut * scale, scale, Math.max(0, beneath - cut) * scale)
            canvas.globalAlpha = 1
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = ours.cut.length * scale
        canvas.height = (band * 2 + 8) * scale
        const context = canvas.getContext('2d')
        if (!context) throw new Error('No canvas.')
        context.fillStyle = '#888'
        context.fillRect(0, 0, canvas.width, canvas.height)
        paint(lab, 0, context)
        paint(ours, (band + 8) * scale, context)
        // How much of the width each draws a layer at least 3 px deep.
        const share = (shape: { cut: number[]; lines: number[][] }, index: number, sign: number) =>
          shape.cut.filter((cut, x) => sign * (cut - (shape.lines[index]?.[x] ?? cut)) * band >= 3)
            .length / shape.cut.length
        return {
          url: canvas.toDataURL('image/png'),
          shares: {
            labUpper: share(lab, 0, 1),
            labLower: share(lab, 1, -1),
            oursUpper: share(ours, 0, 1),
            oursLower: share(ours, 1, -1),
          },
        }
      },
      {
        ours: sampleLines(
          ours.cut,
          ours.layers.map((l) => l.line),
        ),
        lab: sampleLines(
          lab.cut,
          lab.layers.map((l) => l.f),
        ),
        colours: { upper, below, ink, lower },
        band,
        strength,
        belowStrength: strength * BELOW_OPACITY,
      },
    )
    await testInfo.attach('Lab (top) and production (bottom), 390 px, 40 px band, x4', {
      body: Buffer.from(draw.url.split(',')[1] ?? '', 'base64'),
      contentType: 'image/png',
    })
    await testInfo.attach('production, as the browser paints it', {
      body: await page.screenshot({ clip: await clipAround(page, 'ls-default'), type: 'png' }),
      contentType: 'image/png',
    })
    testInfo.annotations.push({
      type: 'share of the width at least 3 px',
      description: JSON.stringify(draw.shares),
    })
    // The Lab's own output at this band draws neither layer; production draws both.
    expect(draw.shares.labUpper).toBe(0)
    expect(draw.shares.oursUpper).toBeGreaterThanOrEqual(MIN_SHARE)
    expect(draw.shares.oursLower).toBeGreaterThanOrEqual(MIN_SHARE)
  })
})

test.describe('fallbacks', () => {
  test('hides the layers in forced colours', async ({ page, browserName }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    const supported = await page.evaluate(() => matchMedia('(forced-colors: active)').matches)
    test.skip(!supported, `${browserName} can't emulate forced colours`)
    const parts = page.locator('[data-edge-part]')
    expect(await parts.count()).toBeGreaterThan(0)
    for (const display of await parts.evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).display),
    ))
      expect(display).toBe('none')
  })

  test('hides the layers where the mask is unsupported: the rule is kept and, applied, hides every part', async ({
    page,
  }) => {
    const texts = await page.evaluate(() => {
      for (const sheet of document.styleSheets)
        for (const rule of sheet.cssRules)
          if (
            rule instanceof CSSSupportsRule &&
            rule.conditionText.trim().startsWith('not') &&
            rule.conditionText.includes('mask-image')
          )
            return [...rule.cssRules].map((inside) => inside.cssText)
      return []
    })
    expect(texts.length).toBeGreaterThan(0)
    await page.addStyleTag({ content: texts.join('\n') })
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
