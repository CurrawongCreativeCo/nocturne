import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'
import { hotspotObjectPosition } from '../../src/lib/sanity/image-focus'
import { servedRect, visibleArea, type Rect } from '../../src/lib/sanity/image-framing'
import { servedThumbnail } from '../../src/lib/sanity/link-thumbnail-framing'

/**
 * "Adjust picture" on the Link list (README, "Adjust picture (Studio)" and "Link list"):
 * `/link-framing` holds a profile picture and thumbnails with an adjustment, with only a hotspot and
 * with neither, on a landscape (3000 × 2000) and a portrait (1000 × 1600) upload, in Minimal, Cards,
 * Image-focused and Glass rows. The CDN is the fake one, so these read the URLs the page asks for.
 */

type FocusImage = NonNullable<Parameters<typeof hotspotObjectPosition>[0]>

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PAGE = '/link-framing'
const LANDSCAPE = { width: 3000, height: 2000 }
// What the fixture stores (tests/e2e/fixtures/dataset.mjs).
const ADJUSTED = {
  crop: { left: 0.2333, right: 0.4333, top: 0.35, bottom: 0.15 },
  hotspot: { x: 0.4, y: 0.6, width: 0.3333, height: 0.5 },
}
const HOTSPOT_ONLY = { x: 0.2, y: 0.3, width: 0.2, height: 0.2 }

test.skip(({ isMobile }) => isMobile, 'Sized explicitly below')

const section = (page: Page, name: string) =>
  page.locator(`section:has(h2:text-is("Framing: ${name}"))`)
const thumbnail = (scope: Locator, name: string) =>
  scope.getByRole('link', { name: new RegExp(`^${name}\\b`) }).locator('img')

/** What a picture asks the CDN for, from the URL the browser chose. */
async function served(image: Locator) {
  await expect(image).toBeVisible()
  // Pictures below the fold are lazy: the browser picks a source from `sizes` once they are near.
  await image.scrollIntoViewIfNeeded()
  await expect
    .poll(() => image.evaluate((img) => (img as HTMLImageElement).currentSrc))
    .not.toBe('')
  const { src, box, candidates } = await image.evaluate((element) => {
    const img = element as HTMLImageElement
    const { width, height } = img.getBoundingClientRect()
    return {
      src: img.currentSrc || img.src,
      box: { width, height },
      candidates: [...img.srcset.matchAll(/[?&]w=(\d+)[^ ]* \d+w/g)].map((match) =>
        Number(match[1]),
      ),
    }
  })
  const { searchParams } = new URL(src)
  const rect = searchParams.get('rect')
  return {
    src,
    candidates,
    box,
    rect: rect ?? undefined,
    width: Number(searchParams.get('w')),
    height: Number(searchParams.get('h')),
    fit: searchParams.get('fit'),
    auto: searchParams.get('auto'),
  }
}
const asRect = (rect: Rect) => `${rect.left},${rect.top},${rect.width},${rect.height}`
/** The rect the CDN is asked for when `aspect` is the shape's ratio. */
const rectFor = (
  asset: { width: number; height: number },
  aspect: number,
  framing: { crop?: object; hotspot?: object },
) => asRect(servedRect({ asset, aspect, ...framing }))

test.describe('the Link list profile picture', () => {
  test('is served from the editor’s adjustment in a circle', async ({ page }) => {
    await page.goto(PAGE)
    const picture = await served(
      section(page, 'circle').locator('[data-profile-image="circle"] img'),
    )
    expect(picture.rect).toBe(rectFor(LANDSCAPE, 1, ADJUSTED))
    expect(picture.fit).toBe('crop')
    expect(picture.auto).toBe('format')
    expect(picture.width).toBe(picture.height)
  })

  test('shows Logo, uncropped whole, and applies the same adjustment again in a circle', async ({
    page,
  }) => {
    await page.goto(PAGE)
    const logo = await served(section(page, 'logo').locator('[data-profile-image="natural"] img'))
    // The whole picture: no rect, no crop, its own proportions.
    expect(logo.rect).toBeUndefined()
    expect(logo.fit).not.toBe('crop')
    expect(logo.src).toContain('dddddddddddddddddddddddddddddddddddddddd-3000x2000.jpg')
    const back = await served(
      section(page, 'logo-back').locator('[data-profile-image="circle"] img'),
    )
    expect(back.rect).toBe(rectFor(LANDSCAPE, 1, ADJUSTED))
  })

  test('is unchanged when another section reuses the same upload without framing', async ({
    page,
  }) => {
    await page.goto(PAGE)
    const reuse = section(page, 'reuse')
    const profile = await served(reuse.locator('[data-profile-image="circle"] img'))
    // The middle of the upload, as it always was.
    expect(profile.rect).toBe('500,0,2000,2000')
    const link = await served(thumbnail(reuse, 'reuse plain'))
    expect(link.rect).toBe('501,0,2000,2000')
  })
})

test.describe('Link list thumbnails', () => {
  test('Minimal: adjusted, hotspot-only and unadjusted pictures follow the rules', async ({
    page,
  }) => {
    await page.goto(PAGE)
    const scope = section(page, 'circle')
    // Rule 1: the adjustment decides.
    expect((await served(thumbnail(scope, 'minimal adjusted'))).rect).toBe(
      rectFor(LANDSCAPE, 1, ADJUSTED),
    )
    // Rule 2: cut to the drawn shape around the hotspot.
    expect((await served(thumbnail(scope, 'minimal hotspot'))).rect).toBe('0,0,2000,2000')
    // Rule 3: what the 600 × 450 request and CSS showed.
    expect((await served(thumbnail(scope, 'minimal landscape'))).rect).toBe('501,0,2000,2000')
    expect((await served(thumbnail(scope, 'minimal portrait'))).rect).toBe('125,425,750,750')
  })

  test('Cards: a square tile', async ({ page }) => {
    await page.goto(PAGE)
    const scope = section(page, 'cards')
    expect((await served(thumbnail(scope, 'cards adjusted'))).rect).toBe(
      rectFor(LANDSCAPE, 1, ADJUSTED),
    )
    expect((await served(thumbnail(scope, 'cards landscape'))).rect).toBe('501,0,2000,2000')
    expect((await served(thumbnail(scope, 'cards portrait'))).rect).toBe('125,425,750,750')
  })

  test('Image-focused: 4:3 across the card and 16:9 for the featured link', async ({ page }) => {
    await page.goto(PAGE)
    const scope = section(page, 'image')
    const featured = await served(thumbnail(scope, 'image featured'))
    // The middle 16:9 of the 4:3 cut thumbnails always had.
    expect(featured.rect).toBe('167,250,2667,1500')
    expect(Math.abs(featured.width / featured.height - 16 / 9)).toBeLessThan(0.02)
    const adjusted = await served(thumbnail(scope, 'image adjusted'))
    expect(adjusted.rect).toBe(rectFor(LANDSCAPE, 4 / 3, ADJUSTED))
    expect(Math.abs(adjusted.width / adjusted.height - 4 / 3)).toBeLessThan(0.02)
    expect((await served(thumbnail(scope, 'image hotspot'))).rect).toBe(
      rectFor(LANDSCAPE, 4 / 3, { hotspot: HOTSPOT_ONLY }),
    )
    expect((await served(thumbnail(scope, 'image portrait'))).rect).toBe('0,425,1000,750')
  })

  test('Glass rows: the old 4:3 cut when unframed, the shortest row’s area when framed', async ({
    page,
  }) => {
    await page.goto(PAGE)
    const scope = section(page, 'glass')
    const plain = await served(thumbnail(scope, 'glass landscape'))
    expect(plain.rect).toBe('167,0,2667,2000')
    expect(Math.abs(plain.width / plain.height - 4 / 3)).toBeLessThan(0.02)
    // No hotspot: the strip is centred in it.
    await expect(thumbnail(scope, 'glass landscape')).toHaveCSS('object-position', '50% 50%')

    const strip = servedThumbnail({ layout: 'stacked', rowStyle: 'glass', framed: true })
    for (const [name, framing] of [
      ['glass adjusted', ADJUSTED],
      ['glass hotspot', { hotspot: HOTSPOT_ONLY }],
    ] as const) {
      const framed = await served(thumbnail(scope, name))
      expect(framed.rect).toBe(rectFor(LANDSCAPE, strip.aspect, framing))
      expect(Math.abs(framed.width / framed.height - strip.aspect)).toBeLessThan(0.05)
      // CSS places the served area on the hotspot.
      const area = visibleArea(strip, { asset: LANDSCAPE, ...framing })
      const expected = area
        ? hotspotObjectPosition(framing as FocusImage, { asset: LANDSCAPE, area })
        : undefined
      await expect(thumbnail(scope, name)).toHaveCSS('object-position', expected ?? '50% 50%')
    }
    expect((await served(thumbnail(scope, 'glass portrait'))).rect).toBe('0,425,1000,750')
  })

  test('are never served at more than twice the size they are drawn', async ({ page }) => {
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(PAGE)
      const links = page.locator('#main-content li[data-track-event] img')
      const count = await links.count()
      // Every link in the fixture has a thumbnail.
      expect(count).toBe(17)
      for (let index = 0; index < count; index += 1) {
        const picture = await served(links.nth(index))
        expect(picture.rect, `${width}px, ${picture.src}`).toBeDefined()
        // The browser may reuse a larger copy it already has, so check what the page offers: the
        // smallest width that covers the drawn size is at most twice that size.
        const covering = Math.min(...picture.candidates.filter((w) => w >= picture.box.width))
        expect(covering, `${width}px, ${picture.src}`).toBeLessThanOrEqual(
          Math.ceil(picture.box.width * 2),
        )
      }
    }
  })
})

test.describe('the Link page with framed pictures', () => {
  for (const width of [375, 768, 1280]) {
    test(`draws a circle, rounded square, ring and frame at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(PAGE)
      const square = async (image: Locator) => {
        const box = await image.boundingBox()
        expect(box?.width).toBeGreaterThan(40)
        expect(Math.abs((box?.width ?? 0) - (box?.height ?? 1))).toBeLessThan(1)
      }
      const circle = section(page, 'circle').locator('[data-profile-image="circle"] img')
      await square(circle)
      await expect(circle).toHaveClass(/rounded-full/)
      const rounded = section(page, 'rounded').locator('[data-profile-image="rounded"] img')
      await square(rounded)
      await expect(rounded).toHaveClass(/rounded-card/)
      const ring = section(page, 'ring').locator('[data-profile-border="line"]')
      await expect(ring.locator('.image-ring')).toHaveCount(1)
      await square(ring.locator('img'))
      const frame = section(page, 'frame').locator('[data-profile-border="frame"]')
      await expect(frame.locator('[data-image-frame]')).toHaveCount(1)
      await square(frame.locator('img'))
      // The picture sits 14% in from the frame's edges.
      const [outer, inner] = await Promise.all([
        frame.boundingBox(),
        frame.locator('img').boundingBox(),
      ])
      expect(Math.abs((inner?.width ?? 0) / (outer?.width ?? 1) - 0.72)).toBeLessThan(0.01)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }

  test('has no accessibility violations and one Tab stop per link', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.locator('#main-content li[data-track-event]').first()).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
    const stops = await page
      .locator('#main-content li[data-track-event]')
      .evaluateAll((items) =>
        items.map(
          (item) =>
            item.querySelectorAll('a[href], button, input, [tabindex]:not([tabindex="-1"])').length,
        ),
      )
    expect(stops).toHaveLength(17)
    expect(new Set(stops)).toEqual(new Set([1]))
  })
})
