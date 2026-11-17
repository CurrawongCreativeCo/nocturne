import { expect, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * A measurement, not a fix (task 151, stage B1, finding S4): does a hairline of the page's background ever
 * show along an edge's cut, where the section above is masked in two layers and the section below is pulled
 * up under it? The proposed remedy (pull the section below 1px further and pad it 1px more) is NOT applied.
 * If a case here fails, that is the reproduction: the message names the shape, width, pixel ratio and where
 * the page showed, and the fix is decided from it.
 *
 * `/edge-seams` puts an inverse section over an accent one for every shape, so the only way the page
 * background (`surface`) can appear in the cut band is a gap. The band is read from the browser's own pixels:
 * a screenshot of the strip from the section below's top to the frame's bottom, decoded in the page. It runs
 * at several device pixel ratios (including the fractional ones browser zoom produces) and at widths where
 * the fluid edge heights land on fractions of a pixel. A control at each ratio proves the detector can fail:
 * it must find a deliberate 1px gap where it was made, and nothing in the same band without it.
 */

const WIDTHS = [360, 390, 411, 768, 1000, 1280, 1440]
const RATIOS = [1, 1.25, 1.5, 2, 3]
const PAIRS = [
  'wave-medium',
  'curve-medium',
  'diagonal-medium',
  'arch-medium',
  'layered-medium',
  'wave-small',
  'curve-large',
  'tide-medium',
  'tide-large',
  'contour-medium',
  'still-water-medium',
  'still-water-large',
  'lagoon-medium',
  'lagoon-large',
  'reef-medium',
  'reef-large',
]

/** The control's pair, widths and gap: a 1px column of the section below made see-through. */
const CONTROL_PAIR = 'wave-medium'
const CONTROL_WIDTHS = [390, 1280]
/** In CSS px from the section's left. A multiple of 4, so it starts on a whole device pixel at every ratio. */
const GAP_X = 200

/** Stands in for every Sanity CDN image, so nothing depends on the network. */
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`

interface Measured {
  /** Pixels in the band that are the page's background colour. */
  pixels: number
  /** How many device-pixel columns hold at least one. */
  columns: number
  /** The first and last such column, and the top and bottom such row: device pixels from the band's corner. */
  first: number | null
  last: number | null
  top: number | null
  bottom: number | null
  /** The band, in CSS px from the window's corner, and the page's scroll position when it was read. */
  band: { x: number; y: number; width: number; height: number }
  scrollY: number
  /** The page's background as the screenshot holds it (sRGB). */
  background: number[]
}

/**
 * The cut band in the window, from just above the section below's top (the band starts there) to just under
 * the frame's bottom, and a key of where it sits on the page and how tall it is, which scrolling leaves alone.
 */
const bandBox = ({ upperQuery, lowerQuery }: { upperQuery: string; lowerQuery: string }) => {
  const upper = document.querySelector(upperQuery)?.parentElement?.getBoundingClientRect()
  const lower = document.querySelector(lowerQuery)?.parentElement?.getBoundingClientRect()
  if (!upper || !lower) return null
  return {
    clip: {
      x: 0,
      y: lower.top - 3,
      width: window.innerWidth,
      height: upper.bottom - lower.top + 6,
    },
    scrollY: window.scrollY,
    key: [window.innerWidth, lower.top + window.scrollY, upper.bottom - lower.top].join(' '),
  }
}

/**
 * The band once the layout holds still. Right after a resize Chromium can report the new width while the
 * layout (and the vw-based edge heights) is still the old one, so a box read at once can belong to a layout
 * the screenshot never shows. The box is read until three reads 100ms apart agree.
 */
async function settledBand(page: Page, query: { upperQuery: string; lowerQuery: string }) {
  let last = await page.evaluate(bandBox, query)
  for (let held = 0, reads = 0; held < 3; reads++) {
    if (!last) throw new Error(`No cut band for ${query.upperQuery}.`)
    if (reads > 50) throw new Error(`The layout around ${query.upperQuery} never held still.`)
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)))
    const next = await page.evaluate(bandBox, query)
    held = next?.key === last.key ? held + 1 : 0
    last = next
  }
  if (!last) throw new Error(`No cut band for ${query.upperQuery}.`)
  return last
}

/**
 * Counts the pixels in the cut band that are the page's background colour. A pixel counts when every
 * channel is within `tolerance` of it; the blend between the two sections' colours at a curve's anti-aliased
 * edge is nowhere near it, so only a real gap does. The background is the colour the browser paints behind
 * the page: the root's, or the body's when the root has none. It is an oklch() token, so the browser
 * converts it: painted onto a canvas and read back in sRGB, the space the screenshot is in. The band is read
 * again after the screenshot, and the screenshot taken again if it moved, so the pixels are the band's.
 */
async function hairlines(page: Page, id: string): Promise<Measured> {
  const query = { upperQuery: `section#seam-${id}`, lowerQuery: `section#seam-${id}--below` }
  let shot: { png: Buffer; band: NonNullable<ReturnType<typeof bandBox>> } | undefined
  for (let attempt = 0; attempt < 3 && !shot; attempt++) {
    const settled = await settledBand(page, query)
    // The band in the middle of the window, clear of the sticky header and wholly on screen.
    await page.evaluate((y) => {
      window.scrollBy(0, y - window.innerHeight / 2)
    }, settled.clip.y)
    const band = await page.evaluate(bandBox, query)
    if (!band) throw new Error(`No cut band for ${id}.`)
    const png = await page.screenshot({ clip: band.clip, type: 'png' })
    const after = await page.evaluate(bandBox, query)
    if (after?.key === band.key && after.clip.y === band.clip.y) shot = { png, band }
  }
  if (!shot) throw new Error(`The ${id} band kept moving while it was photographed.`)
  const { png, band } = shot
  const measured = await page.evaluate(async (base64) => {
    const image = new Image()
    image.src = `data:image/png;base64,${base64}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('No canvas.')
    const rgbaOf = (colour: string) => {
      const unset = '#010203'
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = unset
      context.fillStyle = colour
      if (context.fillStyle === unset) throw new Error(`The canvas can't paint ${colour}.`)
      context.fillRect(0, 0, 1, 1)
      return [...context.getImageData(0, 0, 1, 1).data]
    }
    const root = rgbaOf(getComputedStyle(document.documentElement).backgroundColor)
    const background =
      root[3] === 0 ? rgbaOf(getComputedStyle(document.body).backgroundColor) : root
    if (background[3] !== 255)
      throw new Error(`The page background is not opaque: ${background.join(', ')}.`)
    const [bgR = 0, bgG = 0, bgB = 0] = background
    context.clearRect(0, 0, 1, 1)
    context.drawImage(image, 0, 0)
    const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height)
    const tolerance = 10
    const seen = new Set<number>()
    let pixels = 0
    let first: number | null = null
    let last: number | null = null
    let top: number | null = null
    let bottom: number | null = null
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const at = (y * width + x) * 4
        if (
          Math.abs((data[at] ?? 0) - bgR) <= tolerance &&
          Math.abs((data[at + 1] ?? 0) - bgG) <= tolerance &&
          Math.abs((data[at + 2] ?? 0) - bgB) <= tolerance
        ) {
          pixels += 1
          seen.add(x)
          first = Math.min(first ?? x, x)
          last = Math.max(last ?? x, x)
          top ??= y
          bottom = y
        }
      }
    }
    return { pixels, columns: seen.size, first, last, top, bottom, background: [bgR, bgG, bgB] }
  }, png.toString('base64'))
  return { ...measured, band: band.clip, scrollY: band.scrollY }
}

/** Where a measurement found the page, in device px within the band and in CSS px on the page. */
function located(measured: Measured, ratio: number): string {
  const { pixels, columns, first, last, top, bottom, band, scrollY } = measured
  if (first === null || last === null || top === null || bottom === null) return 'none'
  const pageY = (row: number) => (scrollY + band.y + row / ratio).toFixed(2)
  return (
    `${pixels} pixel(s) in ${columns} column(s): device x ${first}–${last}, y ${top}–${bottom} in the band; ` +
    `CSS x ${(first / ratio).toFixed(2)}–${((last + 1) / ratio).toFixed(2)}, page y ${pageY(top)}–${pageY(bottom + 1)}`
  )
}

/** Makes a 1px column of the section below see-through, GAP_X from its left, or takes it away again. */
const setGap = (page: Page, id: string, on: boolean) =>
  page.evaluate(
    ({ query, on, x }) => {
      const lower = document.querySelector<HTMLElement>(query)
      if (!lower) throw new Error(`No ${query}.`)
      const mask = on
        ? `linear-gradient(to right, #000 ${x}px, transparent ${x}px, transparent ${x + 1}px, #000 ${x + 1}px)`
        : ''
      lower.style.setProperty('mask-image', mask)
      lower.style.setProperty('-webkit-mask-image', mask)
      return lower.getBoundingClientRect().left
    },
    { query: `section#seam-${id}--below`, on, x: GAP_X },
  )

test.describe('hairlines along an edge’s cut (S4: measured, not fixed)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://cdn.sanity.io/**', (route) =>
      route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
    )
  })
  // The pixel ratio is a context option, so each ratio is its own group of tests.
  for (const ratio of RATIOS) {
    test.describe(`at a pixel ratio of ${ratio}`, () => {
      test.use({ deviceScaleFactor: ratio })
      test.skip(({ isMobile }) => isMobile, 'Desktop only: it sets its own widths and ratios')

      test(`control: finds a deliberate 1px gap where it was made in the ${CONTROL_PAIR} cut, and none without it`, async ({
        page,
      }) => {
        await page.goto('/edge-seams')
        for (const width of CONTROL_WIDTHS) {
          await page.setViewportSize({ width, height: 900 })
          await page.evaluate(() => document.fonts.ready)
          const intact = await hairlines(page, CONTROL_PAIR)
          expect(intact.pixels, `${width}px, intact: ${located(intact, ratio)}`).toBe(0)
          const left = await setGap(page, CONTROL_PAIR, true)
          const gap = await hairlines(page, CONTROL_PAIR)
          await setGap(page, CONTROL_PAIR, false)
          const where = `${width}px, with the gap: ${located(gap, ratio)}`
          // The see-through column, in device px: it starts on a whole pixel, and only whole pixels count.
          expect(gap.pixels, where).toBeGreaterThan(0)
          expect(gap.first, where).toBe((left + GAP_X) * ratio)
          expect(gap.last ?? Infinity, where).toBeLessThan((left + GAP_X + 1) * ratio)
          // The page showed through it, in the cut band and the rows under the frame.
          expect(gap.bottom ?? 0, where).toBeGreaterThan(gap.top ?? Infinity)
        }
      })

      for (const id of PAIRS) {
        test(`${id} shows no gap of the page background at any width`, async ({ page }, info) => {
          await page.goto('/edge-seams')
          const found: string[] = []
          for (const width of WIDTHS) {
            await page.setViewportSize({ width, height: 900 })
            // Let the fluid edge height and the layout settle at this width.
            await page.evaluate(() => document.fonts.ready)
            const measured = await hairlines(page, id)
            if (measured.pixels > 0) found.push(`${width}px: ${located(measured, ratio)}`)
          }
          // Recorded either way, so a pass is evidence too.
          info.annotations.push({
            type: 'hairline-measurement',
            description: `${id} at ${ratio}x: ${found.length === 0 ? 'none' : found.join('; ')}`,
          })
          expect(found, `page background showing in the ${id} cut at ${ratio}x`).toEqual([])
        })
      }
    })
  }
})
