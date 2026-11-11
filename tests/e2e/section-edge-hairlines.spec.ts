import { expect, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * A measurement, not a fix (task 151, stage B1, finding S4): does a hairline of the page's background ever
 * show along an edge's cut, where the section above is masked in two layers and the section below is pulled
 * up under it? The proposed remedy (pull the section below 1px further and pad it 1px more) is NOT applied.
 * If a case here fails, that is the reproduction: the message names the shape, width, pixel ratio and the
 * first offending column, and the fix is decided from it.
 *
 * `/edge-seams` puts an inverse section over an accent one for every shape, so the only way the page
 * background (`surface`) can appear in the cut band is a gap. The band is read from the browser's own pixels:
 * a screenshot of the strip from the section below's top to the frame's bottom, decoded in the page. It runs
 * at several device pixel ratios (including the fractional ones browser zoom produces) and at widths where
 * the fluid edge heights land on fractions of a pixel.
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
]

/** Stands in for every Sanity CDN image, so nothing depends on the network. */
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`

interface Measured {
  pixels: number
  columns: number
  first: number | null
  band: { x: number; y: number; width: number; height: number }
}

/**
 * Counts the pixels in the cut band that are the page's background colour. A pixel counts when every
 * channel is within `tolerance` of it; the blend between the two sections' colours at a curve's anti-aliased
 * edge is nowhere near it, so only a real gap does.
 */
async function hairlines(page: Page, id: string): Promise<Measured> {
  const upperSelector = `section#seam-${id}`
  const lowerSelector = `section#seam-${id}--below`
  await page.locator(upperSelector).scrollIntoViewIfNeeded()
  const band = await page.evaluate(
    ({ upperQuery, lowerQuery }) => {
      const upper = document.querySelector(upperQuery)?.parentElement?.getBoundingClientRect()
      const lower = document.querySelector(lowerQuery)?.parentElement?.getBoundingClientRect()
      if (!upper || !lower) return null
      // From just above the section below's top (the cut band starts there) to just under the frame's bottom.
      return {
        x: 0,
        y: lower.top - 3,
        width: window.innerWidth,
        height: upper.bottom - lower.top + 6,
      }
    },
    { upperQuery: upperSelector, lowerQuery: lowerSelector },
  )
  if (!band) throw new Error(`No cut band for ${id}.`)
  const png = await page.screenshot({ clip: band, type: 'png' })
  return page.evaluate(
    async ({ base64, clip }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d')
      if (!context) throw new Error('No canvas.')
      context.drawImage(image, 0, 0)
      const bg = getComputedStyle(document.body)
        .backgroundColor.match(/\d+(\.\d+)?/g)
        ?.map(Number) ?? [255, 255, 255]
      const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height)
      const tolerance = 10
      const seen = new Set<number>()
      let pixels = 0
      let first: number | null = null
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const at = (y * width + x) * 4
          if (
            Math.abs((data[at] ?? 0) - (bg[0] ?? 255)) <= tolerance &&
            Math.abs((data[at + 1] ?? 0) - (bg[1] ?? 255)) <= tolerance &&
            Math.abs((data[at + 2] ?? 0) - (bg[2] ?? 255)) <= tolerance
          ) {
            pixels += 1
            seen.add(x)
            first ??= x
          }
        }
      }
      return { pixels, columns: seen.size, first, band: clip }
    },
    { base64: png.toString('base64'), clip: band },
  )
}

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

      for (const id of PAIRS) {
        test(`${id} shows no gap of the page background at any width`, async ({ page }, info) => {
          await page.goto('/edge-seams')
          const found: string[] = []
          for (const width of WIDTHS) {
            await page.setViewportSize({ width, height: 900 })
            // Let the fluid edge height and the layout settle at this width.
            await page.evaluate(() => document.fonts.ready)
            const measured = await hairlines(page, id)
            if (measured.pixels > 0) {
              found.push(
                `${width}px: ${measured.pixels} pixel(s) in ${measured.columns} column(s), first at x=${measured.first}`,
              )
            }
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
