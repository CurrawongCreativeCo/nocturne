import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * "Adjust picture" on the other placements (task 177; README, "Adjust picture (Studio)", the picture inventory):
 * `/picture-framing-placements`. Each consumer draws a picture whose crop and hotspot the editor stored (ADJUSTED_TILE
 * in the fixtures, for a 1200 x 630 upload) as exactly the area the editor shows, at the ratio the section draws it
 * in; a sibling with nothing stored keeps today's URL. The ratios are the resolvers' (src/lib/sanity/image-frame-geometry.ts).
 */

const PAGE = '/picture-framing-placements'

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE)
  // The page streams and hydrates: until the network is quiet a picture may still be replaced.
  await page.waitForLoadState('networkidle')
})

const section = (page: Page, heading: string) =>
  page
    .locator('#main-content section')
    .filter({ has: page.getByRole('heading', { name: heading, exact: true }) })

/** What the CDN is asked for, and the ratio of the box the picture is drawn in (its framing box, or the picture). */
async function served(scope: Locator, alt: string) {
  const img = scope.locator(`img[alt="${alt}"]`).first()
  await expect(img).toBeVisible()
  await img.scrollIntoViewIfNeeded()
  return img.evaluate((node) => {
    const el = node as HTMLImageElement
    const box = (el.closest('[data-framed-image]') ?? el).getBoundingClientRect()
    return {
      rect: new URL(el.currentSrc || el.src).searchParams.get('rect'),
      ratio: box.width / box.height,
      objectPosition: el.style.objectPosition,
    }
  })
}

// Zoomed in on the left of the 1200 x 630 fixture picture, cut at each placement's own ratio.
const AT_4_3 = '60,63,672,504'
const AT_16_9 = '60,126,672,378'
const AT_1_1 = '144,63,504,504'

test('Hero Split: the picture is the editor’s area at 4:3; one with nothing stored keeps its URL', async ({
  page,
}) => {
  const adjusted = await served(section(page, 'Placement hero adjusted'), 'Hero picture')
  expect(adjusted.rect).toBe(AT_4_3)
  expect(adjusted.ratio).toBeCloseTo(4 / 3, 2)
  // The CDN cut it, so nothing is left for CSS to position.
  expect(adjusted.objectPosition).toBe('')
  const plain = section(page, 'Placement hero plain').locator('img').first()
  expect(
    await plain.evaluate((n) => new URL((n as HTMLImageElement).src).searchParams.get('rect')),
  ).toBeNull()
})

test('Image + text: Side is 4:3 and Stacked 16:9, for the slot picture and the older picture field', async ({
  page,
}) => {
  const side = await served(section(page, 'Placement side adjusted'), 'Picture')
  expect([side.rect, side.ratio.toFixed(2)]).toEqual([AT_4_3, (4 / 3).toFixed(2)])
  const stacked = await served(section(page, 'Placement stacked adjusted'), 'Picture')
  expect([stacked.rect, stacked.ratio.toFixed(2)]).toEqual([AT_16_9, (16 / 9).toFixed(2)])
  const legacy = await served(section(page, 'Placement older picture adjusted'), 'Picture')
  expect([legacy.rect, legacy.ratio.toFixed(2)]).toEqual([AT_4_3, (4 / 3).toFixed(2)])
  const plain = await served(section(page, 'Placement side plain'), 'Picture')
  expect(plain.rect).toBeNull()
})

test('Video poster: the area the editor shows, at the frame’s 16:9', async ({ page }) => {
  const poster = await served(section(page, 'Placement video adjusted'), 'Poster')
  expect([poster.rect, poster.ratio.toFixed(2)]).toEqual([AT_16_9, (16 / 9).toFixed(2)])
})

test('Team portrait: square, and only the member with a stored crop is served that area', async ({
  page,
}) => {
  const scope = section(page, 'Placement team')
  const framed = await served(scope, 'Portrait of Dev Patel')
  expect([framed.rect, framed.ratio.toFixed(2)]).toEqual([AT_1_1, '1.00'])
  // A member with nothing stored is the centred square cut (the whole width of a 1200 x 630 upload is not used).
  const other = await served(scope, 'Portrait of Ann Lee')
  expect(other.rect).not.toBe(AT_1_1)
  expect(other.ratio).toBeCloseTo(1, 2)
})

test('Team portrait in an Arch 2:3 card: a narrower cut of the same crop, at 2:3, in an arch', async ({
  page,
}) => {
  const scope = section(page, 'Placement team arch')
  // The stored crop spans x 60-732, y 63-567; the 2:3 cut of it that keeps the hotspot (x 396) inside it is 336 wide.
  // The square card serves the whole 504 square instead (AT_1_1): the arch shows less of the sides, as the editor says.
  const adjusted = await served(scope, 'Portrait of Dev Patel')
  expect([adjusted.rect, adjusted.ratio.toFixed(2)]).toEqual(['228,63,336,504', (2 / 3).toFixed(2)])
  // The CDN is asked for the same ratio it is drawn at, so it cuts nothing more.
  const asked = await scope.locator('img[alt="Portrait of Dev Patel"]').evaluate((node) => {
    const img = node as HTMLImageElement
    const query = new URL(img.currentSrc || img.src).searchParams
    return Number(query.get('w')) / Number(query.get('h'))
  })
  expect(asked).toBeCloseTo(2 / 3, 2)
  // An arch: a half-height radius on top, square corners below.
  const corners = await scope.locator('img[alt="Portrait of Dev Patel"]').evaluate((node) => {
    const clip = (node.closest('[data-framed-image]') ?? node) as HTMLElement
    const style = getComputedStyle(clip)
    return [parseFloat(style.borderTopLeftRadius), parseFloat(style.borderBottomLeftRadius)]
  })
  expect(corners[0]).toBeGreaterThan(100)
  expect(corners[1]).toBe(0)
  // A portrait with nothing stored keeps today's URL: the square cut, which the 2:3 box then centres.
  const plain = await served(scope, 'Portrait of Ann Lee')
  expect(plain.rect).toBe('285,0,630,630')
  expect(plain.ratio).toBeCloseTo(2 / 3, 2)
})

test('Testimonials avatar: a circle, 1:1, served as the stored area', async ({ page }) => {
  const scope = section(page, 'Placement testimonials')
  const avatar = await served(scope, 'Avatar')
  expect([avatar.rect, avatar.ratio.toFixed(2)]).toEqual([AT_1_1, '1.00'])
  const img = scope.locator('img[alt="Avatar"]').first()
  const corner = await img.evaluate((node) => {
    const clip = (node.closest('[data-framed-image]') ?? node) as HTMLElement
    return getComputedStyle(clip).borderTopLeftRadius
  })
  expect(corner === '50%' || parseFloat(corner) >= 24).toBe(true)
})
