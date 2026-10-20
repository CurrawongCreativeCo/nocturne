import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Card design and overrides, the gradient overlay, icon containers and social buttons (README,
 * "Link list"). `/link-overrides` has a long Glass rows list over a photo with a gradient overlay, the
 * list tinting its glass and edging it in gold, one card customised, one turning its border, shadow
 * and arrow off, one with stored overrides but set back to the list's design; then tinted Cards with
 * no border, one card putting a border back.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const GOLD = 'rgb(138, 109, 29)'

const section = (page: Page, name: string) =>
  page.locator('#main-content section').filter({ has: page.getByRole('heading', { name }) })
const link = (page: Page, name: string | RegExp, list = 'Tinted glass') =>
  section(page, list).getByRole('link', { name })
const css = (locator: Locator, property: string) =>
  locator.evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property)

/** The alpha of a computed colour (1 for rgb()). */
const alphaOf = (colour: string) => {
  const match = /\/\s*([\d.]+)\)|rgba\([^)]*,\s*([\d.]+)\)/.exec(colour)
  return match ? Number(match[1] ?? match[2]) : 1
}

test.describe('Link list card design and overrides', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/link-overrides')
  })

  test('a tinted glass card is still glass: see-through and blurred, with the gold border', async ({
    page,
  }) => {
    const row = link(page, /Book a session/)
    expect(await css(row, 'backdrop-filter')).toContain('blur')
    expect(alphaOf(await css(row, 'background-color'))).toBeLessThan(1)
    expect(await css(row, 'border-top-width')).toBe('1px')
    expect(await css(row, 'border-top-color')).toBe(GOLD)
  })

  test('a customised card changes only what it overrides', async ({ page }) => {
    const plain = link(page, /Book a session/)
    const featured = link(page, /Gift vouchers/)
    // Thicker border, same gold; stronger tint, still glass.
    expect(await css(featured, 'border-top-width')).toBe('3px')
    expect(await css(featured, 'border-top-color')).toBe(GOLD)
    expect(await css(featured, 'backdrop-filter')).toContain('blur')
    expect(alphaOf(await css(featured, 'background-color'))).toBeGreaterThan(
      alphaOf(await css(plain, 'background-color')),
    )
    // A larger label in its own colour; the plain card keeps the list's.
    const label = (row: Locator, text: string) => row.getByText(text, { exact: true })
    const plainSize = parseFloat(await css(label(plain, 'Book a session'), 'font-size'))
    const featuredSize = parseFloat(await css(label(featured, 'Gift vouchers'), 'font-size'))
    expect(featuredSize).toBeGreaterThan(plainSize)
    expect(await css(label(featured, 'Gift vouchers'), 'color')).toBe('rgb(74, 58, 12)')
    // Its icon container is filled; the others stay transparent circles edged in gold.
    const filled = featured.locator('[data-icon-shape="circle"]')
    expect(await css(filled, 'background-color')).toBe('rgb(232, 217, 168)')
    const outlined = plain.locator('[data-icon-shape="circle"]')
    expect(alphaOf(await css(outlined, 'background-color'))).toBe(0)
    expect(await css(outlined, 'box-shadow')).toContain(GOLD)
    expect(await css(outlined, 'border-radius')).not.toBe('0px')
  })

  test('explicit off values stay off: no border, no shadow, no arrow, no container', async ({
    page,
  }) => {
    const quiet = link(page, 'Quiet link')
    expect(await css(quiet, 'border-top-width')).toBe('0px')
    expect(await css(quiet, 'box-shadow')).not.toContain('32px')
    // Plain: the icon keeps its place in the row, with no circle around it.
    expect(await quiet.locator('[data-icon-shape="circle"]').count()).toBe(0)
    expect(await quiet.locator('[data-icon-shape="plain"]').count()).toBe(1)
    // The plain card next to it keeps the list's arrow badge; this one draws none.
    const svgs = async (row: Locator) => row.locator('svg').count()
    expect(await svgs(quiet)).toBe(1)
    expect(await svgs(link(page, /Book a session/))).toBe(2)
  })

  test('overrides stored on a card set back to the list’s design are ignored', async ({ page }) => {
    const back = link(page, 'Back to the list design')
    expect(await css(back, 'border-top-width')).toBe('1px')
    expect(await back.locator('svg').count()).toBe(1)
  })

  test('the eyebrow sits above the label, is read first, and leaves no space when empty', async ({
    page,
  }) => {
    // Eyebrow, label, description, each ending in a (visually hidden) full stop.
    await expect(
      link(page, /^New\s?\. Book a session\s?\. Sixty minutes in the studio$/),
    ).toHaveCount(1)
    const row = link(page, /Book a session/)
    const eyebrow = row.locator('[data-link-eyebrow]')
    expect(await css(eyebrow, 'text-transform')).toBe('uppercase')
    const eyebrowBox = await eyebrow.boundingBox()
    const labelBox = await row.getByText('Book a session', { exact: true }).boundingBox()
    expect(eyebrowBox && labelBox && eyebrowBox.y < labelBox.y).toBe(true)
    await expect(link(page, 'Quiet link').locator('[data-link-eyebrow]')).toHaveCount(0)
  })

  test('the gradient overlay covers the whole long section, behind fully opaque content', async ({
    page,
  }) => {
    const glass = section(page, 'Tinted glass')
    const overlay = glass.locator('[data-overlay-colour="gradient"]')
    expect(await css(overlay, 'background-image')).toContain('linear-gradient')
    const [overlayBox, sectionBox] = await Promise.all([overlay.boundingBox(), glass.boundingBox()])
    const viewport = page.viewportSize()
    expect(sectionBox && viewport && sectionBox.height > viewport.height).toBe(true)
    expect(overlayBox?.height).toBeCloseTo(sectionBox?.height ?? 0, 0)
    // The layer is decoration: nothing on it is faded or covered.
    expect(await css(glass.getByRole('heading', { name: 'Tinted glass' }), 'opacity')).toBe('1')
    const last = link(page, 'Contact')
    await last.scrollIntoViewIfNeeded()
    const box = await last.boundingBox()
    const hit = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest('a')?.textContent ?? '',
      { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 },
    )
    expect(hit).toContain('Contact')
  })

  test('glass social buttons take the border and tint and stay frosted', async ({ page }) => {
    const button = section(page, 'Tinted glass').getByRole('link', { name: 'Instagram' })
    expect(await css(button, 'border-top-width')).toBe('2px')
    expect(await css(button, 'border-top-color')).toBe(GOLD)
    expect(await css(button, 'backdrop-filter')).toContain('blur')
    expect(await css(button, 'border-radius')).not.toBe('0px')
  })

  test('solid cards tint, drop their border, and one card puts it back', async ({ page }) => {
    const none = link(page, 'No border card', 'Tinted cards')
    const bordered = link(page, 'Bordered card', 'Tinted cards')
    expect(alphaOf(await css(none, 'background-color'))).toBeLessThan(1)
    expect(await css(none, 'box-shadow')).not.toContain('inset')
    expect(await css(bordered, 'box-shadow')).toMatch(/0px 0px 0px 2px inset/)
  })

  test('the page passes axe', async ({ page }) => {
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })
})
