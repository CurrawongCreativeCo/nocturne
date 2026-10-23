import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

import { test } from './fixtures/test'

import { galleryIds } from './fixtures/dataset.mjs'

/**
 * Hero variants (README, "Section variants"): every layout in the section gallery passes axe, and
 * keeps its LCP candidate (the image, or the heading when there is none) in the server HTML, so it
 * paints without JavaScript.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const GALLERY = '/section-gallery'
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`

const heroIds = galleryIds.filter((id: string) => id.startsWith('hero-'))
// Highlighted-heading entries have their own words; heading-text.spec.ts checks their markup.
const plainTitleIds = heroIds.filter((id: string) => !id.startsWith('hero-heading-'))
// The first image is the LCP candidate; these layouts have one in the gallery.
const withImage = [
  'hero-overlay',
  'hero-split-right',
  'hero-split-left',
  'hero-split-text-wide',
  'hero-split-image-wide-left',
  'hero-split-square',
  'hero-split-circle',
  'hero-split-arch-left',
  'hero-split-hotspot',
  'hero-full-bleed',
  'hero-parallax',
  'hero-full-bleed-parallax',
  'hero-parts-overlay',
  'hero-parts-split',
  'hero-parts-split-circle',
  'hero-parts-split-parallax',
  'hero-parts-full-bleed',
]

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

test('the gallery has an entry for every hero variant', () => {
  for (const id of [
    'hero-overlay',
    'hero-split-right',
    'hero-split-left',
    'hero-editorial',
    'hero-full-bleed',
    // One per preset that is not a layout of its own, and the Split options.
    'hero-centred-text',
    'hero-split-text-wide',
    'hero-split-image-wide-left',
    'hero-split-square',
    'hero-split-circle',
    'hero-split-arch-left',
  ]) {
    expect(heroIds).toContain(id)
  }
})

for (const id of heroIds) {
  test(`${id} has no WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(GALLERY)
    const { violations } = await new AxeBuilder({ page })
      .include(`[data-gallery-section="${id}"]`)
      .withTags(WCAG)
      .analyze()
    expect(
      violations.map(
        ({ id: rule, nodes }) => `${rule}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`,
      ),
    ).toEqual([])
  })

  if (!plainTitleIds.includes(id)) continue

  test(`${id} renders its heading and image in the server HTML`, async ({ request }) => {
    // The first request to a cold page can stream the section in after a placeholder, so ask until
    // the section is in the HTML itself (the cache is warm from then on).
    let section = ''
    await expect(async () => {
      const html = await (await request.get(GALLERY)).text()
      const start = html.indexOf(`data-gallery-section="${id}"`)
      expect(start).toBeGreaterThan(-1)
      const next = html.indexOf('data-gallery-section=', start + 1)
      section = html.slice(start, next === -1 ? undefined : next)
      expect(section).toContain('<h1')
    }).toPass()

    const title =
      id === 'hero-eyebrow-labels'
        ? 'Move your way'
        : id === 'hero-eyebrow-labels-start'
          ? 'Find your practice'
          : 'Welcome to Test Co'
    expect(section).toMatch(new RegExp(`<h1[^>]*>${title}</h1>`))
    // The image is in the HTML and not lazy, so the browser requests it at once. Layouts without a
    // picture (editorial, split with no image) have none to wait for.
    if (withImage.includes(id)) {
      expect(section).toMatch(/<img[^>]*data-nimg/)
      expect(section).not.toContain('loading="lazy"')
    }
    expect(section).not.toMatch(/class="[^"]*\w(?:text|font)-[\w-]+/)
  })
}

/** A box, which Playwright returns as null for an element that is not on the page. */
function box(found: { x: number; y: number; width: number; height: number } | null) {
  if (!found) throw new Error('The element has no box: is it on the page?')
  return found
}

/** The picture's and the text's boxes in a gallery entry, at the desktop width (two columns). */
async function splitBoxes(page: Page, id: string) {
  await page.goto(GALLERY)
  const section = page.locator(`[data-gallery-section="${id}"]`)
  // Wait until both are drawn: a slow runner can measure before they are, which gives no box.
  await expect(section.locator('img')).toBeVisible()
  await expect(section.locator('h1')).toBeVisible()
  const image = box(await section.locator('img').boundingBox())
  const text = box(await section.locator('h1').boundingBox())
  const style = await section.locator('img').evaluate((img) => {
    const css = getComputedStyle(img)
    return {
      radius: css.borderTopLeftRadius,
      bottomRadius: css.borderBottomLeftRadius,
      position: css.objectPosition,
    }
  })
  const grid = await section.locator('h1').evaluate((h1) => {
    const columns = getComputedStyle(h1.closest('[class*="grid"]') ?? h1).gridTemplateColumns
    const [first = 0, second = 0] = columns.split(' ').map(parseFloat)
    return [first, second] as const
  })
  return { image, text, style, grid }
}

test.describe('split options', () => {
  test.skip(({ isMobile }) => isMobile, 'two columns start at the lg breakpoint')

  test('the columns share the width as the proportion says, on either side', async ({ page }) => {
    const wideText = await splitBoxes(page, 'hero-split-text-wide')
    expect(wideText.grid[0] / wideText.grid[1]).toBeCloseTo(3 / 2, 1)
    // The picture is on the right, in the narrower column.
    expect(wideText.image.x).toBeGreaterThan(wideText.text.x)

    const wideImage = await splitBoxes(page, 'hero-split-image-wide-left')
    // Picture left and wider: its (first) column is the 60 per cent one.
    expect(wideImage.grid[0] / wideImage.grid[1]).toBeCloseTo(3 / 2, 1)
    expect(wideImage.image.x).toBeLessThan(wideImage.text.x)
    expect(wideImage.image.width).toBeGreaterThan(wideImage.text.width)

    const even = await splitBoxes(page, 'hero-split-right')
    expect(even.grid[0]).toBeCloseTo(even.grid[1], 0)
  })

  test('the picture is rounded, square-cornered, a circle or an arch', async ({ page }) => {
    const rounded = await splitBoxes(page, 'hero-split-right')
    expect(parseFloat(rounded.style.radius)).toBeGreaterThan(0)
    expect(rounded.image.width / rounded.image.height).toBeCloseTo(4 / 3, 1)

    const square = await splitBoxes(page, 'hero-split-square')
    expect(parseFloat(square.style.radius)).toBe(0)

    const circle = await splitBoxes(page, 'hero-split-circle')
    // Forced to 1:1, and cut to a circle (a radius far past half its side is clamped to half).
    expect(circle.image.width).toBeCloseTo(circle.image.height, 0)
    expect(parseFloat(circle.style.radius)).toBeGreaterThanOrEqual(circle.image.width / 2)

    const arch = await splitBoxes(page, 'hero-split-arch-left')
    expect(parseFloat(arch.style.radius)).toBeGreaterThanOrEqual(arch.image.width / 2)
    expect(parseFloat(arch.style.bottomRadius)).toBe(0)
    expect(arch.image.height).toBeGreaterThan(arch.image.width)
  })

  test('keeps the hotspot in view through object-position', async ({ page }) => {
    const { style } = await splitBoxes(page, 'hero-split-hotspot')
    expect(style.position).toBe('20% 80%')
    const plain = await splitBoxes(page, 'hero-split-right')
    expect(plain.style.position).toBe('50% 50%')
  })
})
