import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

import { test } from './fixtures/test'
import {
  backgroundOf,
  bandHeight,
  frameOf,
  near,
  over,
  readBand,
  roleIn,
  section,
  settled,
} from './section-edge-pixels'

/**
 * An authored composition (composable section edges, Task 1) through the real renderer, at a wide and a narrow
 * width. `/edge-composed-authored` stores it (tests/e2e/fixtures/dataset.mjs, AUTHORED_EDGE): straight
 * segments, so every line below is worked out here, in band units (x across the frame, y from the top of the
 * band to the section's bottom). Runs in Chromium in CI; the widths are set here, so the phone project skips it.
 */

/** The stored contours (x and y from 0 to 1) and the line through them at x. */
const CUT: [number, number][] = [
  [0, 0.7],
  [0.3, 0.3],
  [0.6, 0.75],
  [1, 0.4],
]
const TINT: [number, number][] = [
  [0, 0.3],
  [0.5, 0.55],
  [1, 0.2],
]
const lineAt = (points: [number, number][], x: number) => {
  const end = points.findIndex(([px]) => px >= x)
  const [x1, y1] = points[end] ?? [1, 0]
  const [x0, y0] = points[Math.max(0, end - 1)] ?? [0, 0]
  return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
}
const cutAt = (x: number) => lineAt(CUT, x)
const tintAt = (x: number) => lineAt(TINT, x)
/** The artwork spans 80% of the width, centred (0.1 to 0.9); its opening is 0.42 to 0.58. */

const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]

const luminance = ([r = 0, g = 0, b = 0]: number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b

async function atWidth(page: Page, size: { width: number; height: number }) {
  await page.setViewportSize(size)
  await settled(frameOf(page, 'ca-upper'))
}

test.skip(({ isMobile }) => isMobile, 'Sets its own wide and narrow widths')

test.beforeEach(async ({ page }) => {
  await page.goto('/edge-composed-authored')
})

test('draws the composition, not the shape stored beside it', async ({ page }) => {
  await expect(frameOf(page, 'ca-upper')).toHaveAttribute('data-section-edge-frame', 'composed')
  // The wave it also stores draws nothing: no back wave or line of a saved shape in its frame.
  await expect(frameOf(page, 'ca-upper').locator('[data-edge-layer]')).toHaveCount(0)
})

for (const size of WIDTHS) {
  test.describe(`at ${String(size.width)} px`, () => {
    test.beforeEach(async ({ page }) => {
      await atWidth(page, size)
    })

    test('cuts the Surface section along its contour and casts the shadow only below the cut', async ({
      page,
    }) => {
      // The composed rule gives the Surface section a colour of its own, so the cut is what shows the section below.
      const surface = await page
        .locator('section#ca-upper')
        .evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(surface).not.toBe('rgba(0, 0, 0, 0)')
      const upper = await backgroundOf(page, section(page, 'ca-upper'))
      const lower = await backgroundOf(page, section(page, 'ca-lower'))
      // Outside the artwork's width only the cut and the shadow are drawn.
      const x = 0.05
      const [overBand, above, nearAbove, shaded, beyond] = await readBand(page, 'ca-upper', [
        // The shadow's blur spreads above the band too; the Surface section's own colour covers it there.
        [x, -0.04],
        [x, cutAt(x) - 0.15],
        [x, cutAt(x) - 0.05],
        [x, cutAt(x) + 0.12],
        [x, 1.15],
      ])
      expect(near(overBand, upper), `above the band: ${String(overBand)}`).toBe(true)
      expect(near(above, upper), `above the cut: ${String(above)}`).toBe(true)
      expect(near(nearAbove, upper), `just above the cut: ${String(nearAbove)}`).toBe(true)
      expect(luminance(shaded ?? []), `the shadow below the cut: ${String(shaded)}`).toBeLessThan(
        luminance(lower) - 6,
      )
      expect(near(beyond, lower), `past the shadow: ${String(beyond)}`).toBe(true)
    })

    test('clips every layer to the artwork’s width and opens it around the centre icon', async ({
      page,
    }) => {
      const upper = await backgroundOf(page, section(page, 'ca-upper'))
      const accent = await roleIn(section(page, 'ca-upper'), '--color-accent')
      const tinted = over(accent, 0.45, upper)
      const between = (x: number) => (tintAt(x) + cutAt(x)) / 2
      const height = await bandHeight(frameOf(page, 'ca-upper'))
      const [inTint, pastWidth, inOpening, onLine] = await readBand(page, 'ca-upper', [
        [0.75, between(0.75)],
        // Where the tint would be without the artwork's width.
        [0.95, (tintAt(0.95) + cutAt(0.95)) / 2],
        [0.565, between(0.565)],
        // The 6 px gradient line along the cut, 1 px above it.
        [0.75, cutAt(0.75) - 1 / height],
      ])
      expect(near(inTint, tinted), `in the tint: ${String(inTint)} is not ${String(tinted)}`).toBe(
        true,
      )
      expect(near(pastWidth, upper), `past the width: ${String(pastWidth)}`).toBe(true)
      expect(near(inOpening, upper), `in the opening: ${String(inOpening)}`).toBe(true)
      expect(near(onLine, upper) || near(onLine, tinted), `on the line: ${String(onLine)}`).toBe(
        false,
      )

      // The icon sits on the cut, at the middle of the artwork.
      const frame = await frameOf(page, 'ca-upper').boundingBox()
      const icon = await frameOf(page, 'ca-upper')
        .locator(':scope > [data-composed-edge-centre] svg')
        .boundingBox()
      if (!frame || !icon) throw new Error('No frame or icon box.')
      expect(Math.abs(icon.x + icon.width / 2 - (frame.x + frame.width / 2))).toBeLessThan(2)
      const cutY = frame.y + frame.height - height + cutAt(0.5) * height
      expect(Math.abs(icon.y + icon.height / 2 - cutY)).toBeLessThan(2)
      await expect(
        frameOf(page, 'ca-upper').locator(':scope > [data-composed-edge-centre]'),
      ).toHaveAttribute('aria-hidden', 'true')
    })

    test('paints the tint over the background and under the Decorative mark and the content', async ({
      page,
    }) => {
      // Hit testing follows paint order. The decoration ignores the pointer, so the test lets it be hit, and
      // stretches the content box down through the band (the section's height is unchanged) so content is there too.
      await page.addStyleTag({
        content: `
          section#ca-upper [data-composed-edge-artwork], section#ca-upper [data-decorative-mark],
          section#ca-upper [data-section-background] { pointer-events: auto !important; }
          section#ca-upper > :last-child {
            padding-bottom: 600px !important; margin-bottom: -600px !important;
          }`,
      })
      const frame = frameOf(page, 'ca-upper')
      const height = await bandHeight(frame)
      // The band in the middle of the window, then the point in the tint, in viewport px.
      await frame.evaluate((el, h) => {
        const { bottom } = el.getBoundingClientRect()
        window.scrollBy(0, bottom - h / 2 - window.innerHeight / 2)
      }, height)
      const order = await frame.evaluate(
        (el, { h, x, y }) => {
          const box = el.getBoundingClientRect()
          const hits = document.elementsFromPoint(box.left + x * box.width, box.bottom - h + y * h)
          const upper = el.querySelector('section#ca-upper')
          const index = (selector: string) =>
            hits.findIndex((hit) => hit.closest(selector) && upper?.contains(hit))
          return {
            tint: index('[data-composed-edge-artwork="above"]'),
            mark: index('[data-decorative-mark]'),
            content: hits.findIndex((hit) => hit === upper?.lastElementChild),
            background: index('[data-section-background]'),
          }
        },
        // Inside the tint, the artwork's width and the content column, at both widths.
        { h: height, x: 0.65, y: (tintAt(0.65) + cutAt(0.65)) / 2 },
      )
      expect(order.tint, JSON.stringify(order)).toBeGreaterThanOrEqual(0)
      expect(order.mark, JSON.stringify(order)).toBeGreaterThanOrEqual(0)
      expect(order.content, JSON.stringify(order)).toBeGreaterThanOrEqual(0)
      // First in the list is painted on top.
      expect(order.mark, JSON.stringify(order)).toBeLessThan(order.tint)
      expect(order.content, JSON.stringify(order)).toBeLessThan(order.tint)
      if (order.background >= 0) expect(order.tint).toBeLessThan(order.background)
    })

    test('keeps a rule inside its section, with the next section in the page’s flow', async ({
      page,
    }) => {
      const rule = section(page, 'ca-rule')
      await expect(rule).toHaveAttribute('data-composed-edge-rule', '')
      await expect(frameOf(page, 'ca-rule')).not.toHaveAttribute('data-section-edge-frame', /.*/)
      await expect(page.locator('#ca-after-rule').locator('xpath=..')).not.toHaveAttribute(
        'data-edge-above',
        /.*/,
      )
      await expect(rule.locator('[data-composed-edge-shadow]')).toHaveCount(0)
      const ruleBox = await rule.boundingBox()
      const art = await rule.locator('[data-composed-edge-artwork="all"]').boundingBox()
      const next = await section(page, 'ca-after-rule').boundingBox()
      if (!ruleBox || !art || !next) throw new Error('Missing a box.')
      expect(Math.abs(art.y + art.height - (ruleBox.y + ruleBox.height))).toBeLessThan(1)
      expect(next.y).toBeGreaterThanOrEqual(ruleBox.y + ruleBox.height - 1)
    })
  })
}

test('leaves a saved shape on a Surface section see-through, as before', async ({ page }) => {
  await expect(frameOf(page, 'ca-legacy-surface')).toHaveAttribute(
    'data-section-edge-frame',
    'wave',
  )
  expect(
    await section(page, 'ca-legacy-surface').evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe('rgba(0, 0, 0, 0)')
})

test('hides the artwork, shadow and centre in forced colours, and keeps the cut', async ({
  page,
  browserName,
}) => {
  await page.emulateMedia({ forcedColors: 'active' })
  const supported = await page.evaluate(() => matchMedia('(forced-colors: active)').matches)
  test.skip(!supported, `${browserName} can't emulate forced colours`)
  const hidden = page.locator(
    '[data-composed-edge-artwork], [data-composed-edge-shadow], [data-composed-edge-centre]',
  )
  expect(await hidden.count()).toBeGreaterThanOrEqual(5)
  for (const display of await hidden.evaluateAll((els) =>
    els.map((el) => getComputedStyle(el).display),
  ))
    expect(display).toBe('none')
  const mask = await section(page, 'ca-upper').evaluate((el) => getComputedStyle(el).maskImage)
  expect(mask).toContain('url(')
})

test('has no WCAG 2.2 AA violations', async ({ page }) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(violations.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([])
})
