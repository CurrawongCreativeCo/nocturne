import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * Shared picture framing on the Gallery (task 177; README, "Image design" and "Adjust picture"):
 * `/picture-framing-gallery`. Shape and frame are separate choices, a frame that draws past the picture keeps
 * its own room unless overlap is allowed, a saved Framed section draws as before, and a photo adjusted in the
 * Studio is served as exactly the area the editor shows. Every tile stays the Gallery's own button.
 */

const PAGE = '/picture-framing-gallery'
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
/** Within half a pixel: layout rounds to the device's pixel grid. */
const NEAR = 0.6

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE)
  // The page streams and hydrates: until the network is quiet a tile may still be replaced.
  await page.waitForLoadState('networkidle')
})

const section = (page: Page, heading: string) =>
  page
    .locator('#main-content section')
    .filter({ has: page.getByRole('heading', { name: heading, exact: true }) })
const boxes = (scope: Locator) => scope.locator('[data-framed-image]')
const buttons = (scope: Locator) => scope.locator('button[aria-haspopup="dialog"]')
/** Its box on screen, once it is on screen: a section below the fold may not be laid out until it is scrolled to. */
const rectOf = async (el: Locator) => {
  await expect(el).toBeVisible()
  await expect(async () => {
    await el.scrollIntoViewIfNeeded({ timeout: 2000 })
  }).toPass()
  // In page coordinates, so boxes measured at different scroll positions compare.
  return el.evaluate((node) => {
    const { left, right, top, bottom, width, height } = node.getBoundingClientRect()
    const x = window.scrollX
    const y = window.scrollY
    return { left: left + x, right: right + x, top: top + y, bottom: bottom + y, width, height }
  })
}
const srcOf = (scope: Locator) =>
  scope
    .locator('img')
    .evaluate(
      (img) => new URL((img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src),
    )

test('a photo with nothing stored keeps its URL; an adjusted one is served as the editor’s area', async ({
  page,
}) => {
  const scope = section(page, 'Gallery nothing chosen')
  const [adjusted, plain] = [boxes(scope).nth(0), boxes(scope).nth(1)]
  // ADJUSTED_TILE in the fixtures: what Adjust picture stores for a 4:3 tile at zoom 1.25 (image-framing's toCrop).
  expect((await srcOf(adjusted)).searchParams.get('rect')).toBe('60,63,672,504')
  expect(
    await adjusted.locator('img').evaluate((img) => (img as HTMLElement).style.objectPosition),
  ).toBe('')
  // No crop or hotspot: no rect, the whole upload, centred by CSS as before.
  expect((await srcOf(plain)).searchParams.get('rect')).toBeNull()
})

test('Masonry has no fixed tile to adjust, and keeps a crop saved in another layout', async ({
  page,
}) => {
  const scope = section(page, 'Gallery masonry with an adjusted photo')
  await expect(buttons(scope)).toHaveCount(3)
  await expect(boxes(scope)).toHaveCount(0)
  // The same stored crop as the Grid's adjusted photo: switching layouts keeps it, and Masonry still applies it,
  // cut to the photo's own proportions (1200 x 630) around its hotspot, so always inside the saved crop.
  const grid = (
    await srcOf(boxes(section(page, 'Gallery nothing chosen')).first())
  ).searchParams.get('rect')
  expect(grid).toBe('60,63,672,504')
  const masonry = (await srcOf(buttons(scope).first())).searchParams.get('rect')
  const [left = 0, top = 0, width = 0, height = 0] = (masonry ?? '').split(',').map(Number)
  expect(masonry).not.toBeNull()
  expect(left).toBeGreaterThanOrEqual(60)
  expect(top).toBeGreaterThanOrEqual(63)
  expect(left + width).toBeLessThanOrEqual(60 + 672)
  expect(top + height).toBeLessThanOrEqual(63 + 504)
  expect(width / height).toBeCloseTo(1200 / 630, 1)
  // A photo with nothing stored keeps its own proportions: the whole photo, give or take the pixel the CDN's
  // rounding of 900 x 473 trims.
  const whole = (await srcOf(buttons(scope).nth(1))).searchParams.get('rect')
  if (whole) {
    const [, , w = 0, h = 0] = whole.split(',').map(Number)
    expect(w).toBeGreaterThanOrEqual(1198)
    expect(h).toBeGreaterThanOrEqual(629)
  }
})

test('a saved Framed section draws as before: Standard corners and its offset border as artwork', async ({
  page,
}) => {
  const scope = section(page, 'Gallery saved as Framed with an offset border')
  await expect(boxes(scope).first()).toHaveAttribute('data-framed-image', 'framed')
  await expect(scope.locator('svg[data-image-frame="offset-border"]')).toHaveCount(3)
  await expect(scope.locator('[data-frame-outline]')).toHaveCount(0)
})

test('an offset border keeps its room: picture plus frame fill the tile, and the gap stays 16px', async ({
  page,
}) => {
  const scope = section(page, 'Gallery saved as Framed with an offset border')
  const all = await buttons(scope).all()
  expect(all).toHaveLength(3)
  const tiles = await Promise.all(all.map(rectOf))
  const pictures = await Promise.all((await boxes(scope).all()).map(rectOf))
  for (const [i, tile] of tiles.entries()) {
    const picture = pictures[i]
    if (!picture) throw new Error(`No picture in tile ${i + 1}`)
    // Default inset 5%: the frame reaches 5% of the picture's width (plus half its 2px stroke) right, and
    // 5% of its height plus 1px down.
    const reachRight = picture.width * 0.05 + 1
    const reachDown = picture.height * 0.05 + 1
    expect(Math.abs(picture.left - tile.left)).toBeLessThan(NEAR)
    expect(Math.abs(picture.right + reachRight - tile.right)).toBeLessThan(NEAR)
    expect(picture.bottom + reachDown).toBeLessThanOrEqual(tile.bottom + NEAR)
    // The next tile is beside it (desktop, three columns) or below it (a phone, one column).
    const next = tiles[i + 1]
    if (next && Math.abs(next.top - tile.top) < 1) {
      expect(next.left - (picture.right + reachRight)).toBeGreaterThan(16 - NEAR)
    } else if (next) {
      expect(next.top - (picture.bottom + reachDown)).toBeGreaterThan(16 - NEAR)
    }
  }
})

test('Allow frame overlap gives the room back: the picture fills its tile and the frame runs past it', async ({
  page,
}) => {
  const scope = section(page, 'Gallery offset border allowed to overlap')
  await expect(scope.locator('[data-frame-room]')).toHaveCount(0)
  const tile = await rectOf(buttons(scope).first())
  const picture = await rectOf(boxes(scope).first())
  expect(Math.abs(picture.width - tile.width)).toBeLessThan(NEAR)
})

test('Simple, Double and Offset lines follow Rounded, Circle and Arch; brackets keep their artwork', async ({
  page,
}) => {
  const rounded = section(page, 'Gallery rounded with an offset border')
  await expect(
    rounded.locator('[data-frame-outline="rounded"][data-image-frame="offset-border"]'),
  ).toHaveCount(3)
  // The offset outline sits under the picture, so only the part outside it shows.
  const order = await boxes(rounded)
    .first()
    .evaluate((box) =>
      Array.from(box.children).map((child) => child.hasAttribute('data-frame-outline')),
    )
  expect(order[0]).toBe(true)

  const circle = section(page, 'Gallery circle with a double line')
  const outline = circle.locator('[data-frame-outline="circle"]').first()
  await expect(outline.locator('div')).toHaveCount(2)
  expect(
    await outline
      .locator('div')
      .first()
      .evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
  ).toBe('50%')
  const disc = await rectOf(boxes(circle).first())
  expect(Math.abs(disc.width - disc.height)).toBeLessThan(NEAR)

  const brackets = section(page, 'Gallery rounded with brackets on the edge')
  await expect(brackets.locator('svg[data-image-frame="corner-brackets"]')).toHaveCount(3)
  await expect(brackets.locator('[data-frame-outline]')).toHaveCount(0)
  // On the edge (inset 0) brackets reach half their stroke on every side, and that room is kept too.
  await expect(brackets.locator('[data-frame-room]')).toHaveCount(3)
})

test('Arch takes its chosen ratio; Circle stays 1:1', async ({ page }) => {
  const arch = await rectOf(boxes(section(page, 'Gallery arch 2:3 with a simple line')).first())
  expect(arch.height / arch.width).toBeCloseTo(1.5, 2)
  const slider = await rectOf(
    boxes(section(page, 'Gallery slider arch with an offset border')).first(),
  )
  expect(slider.height / slider.width).toBeCloseTo(1.25, 2)
})

test('an older frame left on another shape stays ignored', async ({ page }) => {
  const scope = section(page, 'Gallery circle with an older frame left over')
  await expect(scope.locator('[data-image-frame]')).toHaveCount(0)
  await expect(scope.locator('[data-frame-room]')).toHaveCount(0)
})

test('framed tiles stay the Gallery’s buttons: the frame never takes the click, focus shows, the lightbox opens', async ({
  page,
}) => {
  const scope = section(page, 'Gallery saved as Framed with an offset border')
  const second = buttons(scope).nth(1)
  await expect(async () => {
    await second.scrollIntoViewIfNeeded({ timeout: 2000 })
  }).toPass()
  // A click on the offset border's own line, outside the picture, still lands on the tile's button.
  const hit = await second.evaluate((button) => {
    const tile = button.getBoundingClientRect()
    const picture = button.querySelector('[data-framed-image]')?.getBoundingClientRect()
    if (!picture) return null
    const target = document.elementFromPoint(
      (picture.right + tile.right) / 2,
      picture.top + picture.height / 2,
    )
    return target?.closest('button')?.getAttribute('aria-label') ?? null
  })
  expect(hit).toMatch(/^Open image 2 of 3/)

  await second.focus()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(second).toBeFocused()
  const ring = await second.evaluate((el) => {
    const style = getComputedStyle(el)
    return { outline: style.outlineStyle, width: style.outlineWidth, shadow: style.boxShadow }
  })
  expect(ring.outline !== 'none' || ring.shadow !== 'none').toBe(true)

  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('2 of 3')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(second).toBeFocused()
})

test('no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).include('#main-content').withTags(WCAG).analyze()
  expect(results.violations).toEqual([])
})
