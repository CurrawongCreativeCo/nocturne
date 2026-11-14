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
import { layeredGeometry, type LayeredGeometry } from '../../src/components/ui/edge-layered'
import {
  BELOW_OPACITY,
  LAYERED_PRESETS,
  SECOND_OPACITY,
  opacityOf,
  separationOf,
  type EdgeStrength,
} from '../../src/components/ui/edge-presets'

/**
 * Lagoon and Reef in a real browser (task 151, Slice 4). `/edge-lagoon-reef` puts each over sections of a known
 * colour, with the layers chosen to contrast with them. Geometry is checked in unit tests
 * (edge-lagoon-reef.test.ts); this reads what the browser actually paints, which a presence number cannot:
 *
 * - paint order: the second upper layer over the first, both under the section's content;
 * - clipping: nothing of an upper layer below the cut, where its fill would otherwise run to the band's bottom;
 * - that EACH fill makes a visible contribution after the mask has clipped it and the other has overlapped it:
 *   the colour where the first alone shows, where the second alone shows and where both do are three different
 *   colours, each the browser's own blend of the layers' colours, and each is painted at least 3 px deep over a
 *   tenth of the width. Passing "3 px from the cut" is not enough: two nested fills pass it.
 *
 * Runs in Chromium in CI. `playwright.webkit.config.ts` runs it in WebKit locally (Playwright's WebKit, not
 * Safari or an iPhone).
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const MIN_SHARE = 0.1
type Name = 'lagoon' | 'reef'

const geometryOf = (name: Name, flip = false): LayeredGeometry => {
  const preset = LAYERED_PRESETS[name]
  return layeredGeometry({
    shape: preset.shape,
    crest: preset.crests.standard,
    separation: separationOf(preset, 'standard'),
    uppers: 2,
    below: preset.layerBelow === 'always',
    flip,
  })
}

/** How far a layer shows from the cut, in band units, clipped to the band, as it paints. */
const depthOf = (g: LayeredGeometry, index: number, x: number) => {
  const layer = g.layers[index]
  if (!layer) return 0
  return layer.side === 'over'
    ? Math.max(0, g.cut(x) - Math.max(0, layer.line(x)))
    : Math.max(0, Math.min(1, layer.line(x)) - g.cut(x))
}

/** Up to three columns (first, middle, last) where `zone` is at least `minPx` deep, with its depth range. */
function columns(
  g: LayeredGeometry,
  height: number,
  zone: 'first' | 'second' | 'both',
  minPx = 8,
): number[] {
  const found = Array.from({ length: 199 }, (_, i) => (i + 1) / 200).filter((x) => {
    const a = depthOf(g, 0, x)
    const b = depthOf(g, 1, x)
    const room = zone === 'first' ? a - b : zone === 'second' ? b - a : Math.min(a, b)
    return room * height >= minPx
  })
  return [found[0], found[Math.floor(found.length / 2)], found[found.length - 1]].filter(
    (x): x is number => x !== undefined,
  )
}

/** The y, in band units, in the middle of `zone` at column x. */
function middle(g: LayeredGeometry, zone: 'first' | 'second' | 'both', x: number) {
  const a = depthOf(g, 0, x)
  const b = depthOf(g, 1, x)
  const [near, far] = zone === 'both' ? [0, Math.min(a, b)] : zone === 'first' ? [b, a] : [a, b]
  return g.cut(x) - (near + far) / 2
}

/** What each zone of the band is painted, from the layers' own colours and opacities. */
async function zonesOf(page: Page, id: string, below: string, name: Name, strength: EdgeStrength) {
  const preset = LAYERED_PRESETS[name]
  const bg = await backgroundOf(page, section(page, id))
  const belowBg = await backgroundOf(page, section(page, below))
  const first = await srgb(part(page, id, 'over-1'), 'fill')
  const second = await srgb(part(page, id, 'over-2'), 'fill')
  const a1 = opacityOf(preset, strength)
  const a2 = a1 * SECOND_OPACITY
  const firstOver = over(first, a1, bg)
  return {
    bg,
    belowBg,
    first,
    second,
    a1,
    a2,
    only1: firstOver,
    only2: over(second, a2, bg),
    both: over(second, a2, firstOver),
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/edge-lagoon-reef')
})

for (const name of ['lagoon', 'reef'] as const) {
  const id = name === 'lagoon' ? 'lr-lagoon' : 'lr-reef'
  const below = `${id}-below`
  const preset = LAYERED_PRESETS[name]

  test.describe(`${name} in the browser`, () => {
    test.skip(
      ({ isMobile }) => isMobile,
      'Reads pixels at desktop widths, where the bands are tall',
    )

    test('paints the second upper layer over the first, each fill’s own blend where it alone shows and both where they overlap, and nothing below the cut', async ({
      page,
    }) => {
      const zones = await zonesOf(page, id, below, name, 'strong')
      const g = geometryOf(name)
      const height = await bandHeight(frameOf(page, id))
      // Lagoon's layers overlap in islands. Reef's trade places and touch: at Standard depth they never overlap
      // by 3 px (measured in the unit tests, and the same in the Lab), so there is no third zone to read.
      const overlaps = columns(g, height, 'both', 3).length > 0
      expect(overlaps, `${name} has an overlap island`).toBe(name === 'lagoon')
      // Each zone is a colour of its own: the fills are told apart from the section and from each other.
      const all = overlaps
        ? [zones.bg, zones.only1, zones.only2, zones.both]
        : [zones.bg, zones.only1, zones.only2]
      for (let i = 0; i < all.length; i++)
        for (let j = i + 1; j < all.length; j++)
          expect(
            near(all[i], all[j] ?? [], 2 * TOLERANCE),
            `zones ${String(i)} and ${String(j)} are different colours`,
          ).toBe(false)

      const zoneList = overlaps
        ? ([
            ['first', zones.only1],
            ['second', zones.only2],
            ['both', zones.both],
          ] as const)
        : ([
            ['first', zones.only1],
            ['second', zones.only2],
          ] as const)
      for (const [zone, expected] of zoneList) {
        const xs = columns(g, height, zone)
        expect(xs.length, `columns where the ${zone} zone is readable`).toBeGreaterThanOrEqual(3)
        const read = await readBand(
          page,
          id,
          xs.map((x) => [x, middle(g, zone, x)]),
        )
        read.forEach((rgb, i) => {
          expectNear(rgb, expected, `the ${zone} zone at x=${String(xs[i])}`)
        })
      }
      // Above both layers, the section itself.
      for (const x of columns(g, height, 'first')) {
        const top = g.cut(x) - Math.max(depthOf(g, 0, x), depthOf(g, 1, x)) - 6 / height
        if (top < 0.01) continue
        const [rgb] = await readBand(page, id, [[x, top]])
        expectNear(rgb, zones.bg, `above the layers at x=${String(x)}`)
      }
      // Below the cut an upper layer's fill runs to the bottom of the band unless the mask clips it: only the
      // section below shows (and Reef's own layer below, which is read in the next test).
      const xs = columns(g, height, 'first')
      const beneath = await readBand(
        page,
        id,
        xs.map((x) => [x, 0.995]),
      )
      beneath.forEach((rgb, i) => {
        expectNear(rgb, zones.belowBg, `under the cut at x=${String(xs[i])}`)
      })
    })

    test('makes each fill visible after clipping and overlap: painted at least 3 px deep over a tenth of the width, where it alone shows', async ({
      page,
    }) => {
      const zones = await zonesOf(page, id, below, name, 'strong')
      const only1 = await paintedShare(page, id, zones.only1)
      const only2 = await paintedShare(page, id, zones.only2)
      const both = await paintedShare(page, id, zones.both)
      test.info().annotations.push({
        type: 'painted share (>= 2 solid CSS px) at Large',
        description: `first alone ${only1.toFixed(3)}, second alone ${only2.toFixed(3)}, both ${both.toFixed(3)}`,
      })
      expect(only1, 'the first fill alone').toBeGreaterThanOrEqual(MIN_SHARE)
      expect(only2, 'the second fill alone').toBeGreaterThanOrEqual(MIN_SHARE)
      if (name === 'lagoon') expect(both, 'the overlap').toBeGreaterThan(0)
      // The detector can fail: a colour nothing is painted in finds nothing.
      expect(await paintedShare(page, id, [1, 2, 3])).toBe(0)
    })

    test('paints the second upper layer over the first: with both opaque, the overlap and the cut-side of each is the one on top', async ({
      page,
    }) => {
      // Blends of two translucent layers differ little with their order, so the order is read with the layers
      // made opaque: the first red, the second blue. Where they overlap the browser shows the later one.
      await page.addStyleTag({
        content:
          '[data-edge-part="over-1"] path { fill: rgb(255, 0, 0) !important; fill-opacity: 1 !important; } [data-edge-part="over-2"] path { fill: rgb(0, 0, 255) !important; fill-opacity: 1 !important; }',
      })
      const g = geometryOf(name)
      const height = await bandHeight(frameOf(page, id))
      // Columns where the first is the deeper layer and the second, inside it, is at least 8 px deep: in the
      // inner stretch both are painted, and the second must be on top.
      const xs = Array.from({ length: 199 }, (_, i) => (i + 1) / 200).filter(
        (x) => Math.min(depthOf(g, 0, x), depthOf(g, 1, x)) * height >= 8,
      )
      if (name === 'reef') {
        expect(
          xs.length,
          'Reef’s layers have no readable overlap, so there is no order to read',
        ).toBe(0)
        // The order is then the DOM's: the second part is the later sibling, at the same stacking level.
        const order = await frameOf(page, id)
          .locator('[data-edge-part^="over"]')
          .evaluateAll((els) => els.map((el) => el.getAttribute('data-edge-part')))
        expect(order).toEqual(['over-1', 'over-2'])
        return
      }
      expect(xs.length).toBeGreaterThanOrEqual(3)
      const picks = [xs[0], xs[Math.floor(xs.length / 2)], xs[xs.length - 1]].filter(
        (x): x is number => x !== undefined,
      )
      const read = await readBand(
        page,
        id,
        picks.map((x) => [x, g.cut(x) - Math.min(depthOf(g, 0, x), depthOf(g, 1, x)) / 2]),
      )
      read.forEach((rgb, i) => {
        expectNear(rgb, [0, 0, 255], `the overlap at x=${String(picks[i])} is the second layer's`)
      })
    })

    test('draws the layer below, over the section below and clipped at its own line, where the shape has one', async ({
      page,
    }) => {
      const hasBelow = preset.layerBelow === 'always'
      await expect(frameOf(page, id).locator('[data-edge-part^="under"]')).toHaveCount(
        hasBelow ? 1 : 0,
      )
      await expect(frameOf(page, id).locator('[data-edge-part^="over"]')).toHaveCount(2)
      if (!hasBelow) return
      const g = geometryOf(name)
      const height = await bandHeight(frameOf(page, id))
      const belowBg = await backgroundOf(page, section(page, below))
      const lower = await srgb(part(page, id, 'under-1'), 'fill')
      // The layer below follows the section below's own Primary.
      expectNear(lower, await roleIn(section(page, below), '--color-accent'), 'the lower layer')
      const opacity = opacityOf(preset, 'strong') * BELOW_OPACITY
      const xs = Array.from({ length: 99 }, (_, i) => (i + 1) / 100).filter(
        (x) => depthOf(g, 2, x) * height >= 10,
      )
      expect(xs.length).toBeGreaterThanOrEqual(3)
      const picks = [xs[0], xs[Math.floor(xs.length / 2)], xs[xs.length - 1]].filter(
        (x): x is number => x !== undefined,
      )
      const read = await readBand(
        page,
        id,
        picks.flatMap((x) => [
          [x, g.cut(x) + depthOf(g, 2, x) / 2],
          [x, Math.min(0.99, g.cut(x) + depthOf(g, 2, x) + 6 / height)],
        ]),
      )
      picks.forEach((x, i) => {
        expectNear(
          read[2 * i],
          over(lower, opacity, belowBg),
          `in the layer below at x=${String(x)}`,
        )
        expectNear(read[2 * i + 1], belowBg, `under the layer below at x=${String(x)}`)
      })
    })

    test('draws a stored crest, depth and layer-below switch the shape does not offer as its defaults', async ({
      page,
    }) => {
      const stale = name === 'lagoon' ? 'lr-lagoon-stale' : 'lr-reef-stale'
      const plain = name === 'lagoon' ? 'lr-lagoon-default' : 'lr-reef-default'
      const paths = (id: string) =>
        frameOf(page, id)
          .locator('[data-edge-part] path')
          .evaluateAll((els) => els.map((el) => el.getAttribute('d')))
      expect((await paths(stale)).length).toBe(preset.layerBelow === 'always' ? 3 : 2)
      expect(await paths(stale)).toEqual(await paths(plain))
    })

    test('holds stored custom heights to 40-64, 40-120 and 40-160 px', async ({ page }) => {
      const custom = `lr-${name}-custom`
      expect(await bandHeight(frameOf(page, custom))).toBe(160)
      for (const [width, expected] of [
        [360, 40],
        [767, 40],
        [768, 120],
        [1023, 120],
        [1024, 160],
        [2560, 160],
      ] as const) {
        await page.setViewportSize({ width, height: 900 })
        await settled(frameOf(page, custom))
        expect(await bandHeight(frameOf(page, custom)), `at ${String(width)} px`).toBe(expected)
      }
    })

    test('mirrors with Flip', async ({ page }) => {
      test.skip(name !== 'lagoon', 'Lagoon carries the Flip fixture; Reef is the same generator')
      const flipId = 'lr-lagoon-flip'
      const zones = await zonesOf(page, flipId, `${flipId}-below`, 'lagoon', 'strong')
      const flipped = geometryOf('lagoon', true)
      const plain = geometryOf('lagoon', false)
      const height = await bandHeight(frameOf(page, flipId))
      // A column where the flipped second fill is alone and the unflipped one is not.
      const x = Array.from({ length: 199 }, (_, i) => (i + 1) / 200).find(
        (c) =>
          (depthOf(flipped, 1, c) - depthOf(flipped, 0, c)) * height >= 8 &&
          depthOf(plain, 1, c) - depthOf(plain, 0, c) <= 0,
      )
      expect(x, 'a column that tells the flip').toBeDefined()
      if (x === undefined) return
      const [rgb] = await readBand(page, flipId, [[x, middle(flipped, 'second', x)]])
      expectNear(rgb, zones.only2, `the flipped second fill at x=${String(x)}`)
    })

    test('stays under the section’s content: hiding the layers leaves the content unchanged', async ({
      page,
    }) => {
      const markId = name === 'lagoon' ? 'lr-lagoon-mark' : 'lr-reef-picture'
      const g = geometryOf(name)
      const frame = frameOf(page, markId)
      await settled(frame)
      const height = await bandHeight(frame)
      // The section's text, in a colour nothing else on the page is: the pixels of exactly that colour are
      // the text the layers lie under. Painted over, the layers would tint them and the count would fall.
      await page.addStyleTag({
        content: `section#${markId} h2, section#${markId} p { color: rgb(255, 0, 255) !important; }`,
      })
      const content = section(page, markId).locator(':scope > div').last()
      const magenta = async () =>
        page.evaluate(
          async (base64) => {
            const image = new Image()
            image.src = `data:image/png;base64,${base64}`
            await image.decode()
            const canvas = document.createElement('canvas')
            canvas.width = image.naturalWidth
            canvas.height = image.naturalHeight
            const context = canvas.getContext('2d', { willReadFrequently: true })
            if (!context) throw new Error('No canvas.')
            context.drawImage(image, 0, 0)
            const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
            let count = 0
            for (let i = 0; i < data.length; i += 4)
              if (data[i] === 255 && data[i + 1] === 0 && data[i + 2] === 255) count++
            return count
          },
          (await content.screenshot()).toString('base64'),
        )
      const withText = await magenta()
      expect(withText, 'the text is painted').toBeGreaterThan(100)
      // The middle of each fill where it alone shows: it must differ from the background with the layers hidden.
      const picks = (['first', 'second'] as const).map((zone) => {
        const x = need(columns(g, height, zone)[1], `a ${zone} column`)
        return [x, middle(g, zone, x)] as [number, number]
      })
      const withLayers = await readBand(page, markId, picks)
      await page.addStyleTag({ content: '[data-edge-part] { display: none !important; }' })
      const without = await readBand(page, markId, picks)
      withLayers.forEach((rgb, i) => {
        expect(near(rgb, without[i] ?? [], TOLERANCE), `fill ${String(i + 1)} paints`).toBe(false)
      })
      expect(await magenta(), 'the text is untouched by the layers').toBe(withText)
    })

    test('stays under the sticky header: the header looks the same with the layers drawn or hidden', async ({
      page,
    }) => {
      await page.addStyleTag({
        content:
          '[data-site-chrome] header { background: rgb(240, 200, 10) !important; backdrop-filter: none !important; }',
      })
      const header = page.locator('[data-site-chrome] header').first()
      const frame = frameOf(page, id)
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
}

function need<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Missing ${what}`)
  return value
}

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

for (const [width, label] of [
  [320, '320 px'],
  [1280, 'desktop'],
] as const)
  test.describe(`the defaults at ${label}`, () => {
    test.skip(({ isMobile }) => isMobile, 'Sets its own viewport')
    test.use({ viewport: { width, height: 800 }, deviceScaleFactor: 2 })

    for (const name of ['lagoon', 'reef'] as const) {
      const id = `lr-${name}-default`

      test(`${name}: each fill is a distinct colour and painted over a tenth of the width, on the shortest band`, async ({
        page,
      }, testInfo) => {
        const frame = frameOf(page, id)
        await settled(frame)
        const band = await bandHeight(frame)
        // Medium is 40 px up to 400 px wide (24 + 0.04 x width, held to 40) and grows from there.
        if (width === 320) expect(band).toBe(40)
        const zones = await zonesOf(page, id, `${id}-below`, name, 'standard')
        const all = [zones.bg, zones.only1, zones.only2, zones.both]
        for (let i = 0; i < all.length; i++)
          for (let j = i + 1; j < all.length; j++)
            expect(
              near(all[i], all[j] ?? [], 2 * TOLERANCE),
              `zones ${String(i)} and ${String(j)} are different colours`,
            ).toBe(false)
        const only1 = await paintedShare(page, id, zones.only1)
        const only2 = await paintedShare(page, id, zones.only2)
        testInfo.annotations.push({
          type: `painted share at ${label}, ${String(band)} px`,
          description: `first alone ${only1.toFixed(3)}, second alone ${only2.toFixed(3)}`,
        })
        expect(only1).toBeGreaterThanOrEqual(MIN_SHARE)
        expect(only2).toBeGreaterThanOrEqual(MIN_SHARE)
        await testInfo.attach(`${name} defaults, ${label}`, {
          body: await page.screenshot({ clip: await clipAround(page, id), type: 'png' }),
          contentType: 'image/png',
        })
      })
    }
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
