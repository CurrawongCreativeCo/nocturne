import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * Highlighted heading words (README, "Highlighting words in a heading"): the hero renders one
 * heading with plain spans, the words are the accessible name, and each treatment is drawn with the
 * styles that make it work (a gradient that survives wrapping, a solid colour under forced colours).
 * The hero on /highlights has both a `heading` and a stale `title`: the heading must win.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PAGE = '/highlights'

test('the hero is the page’s one h1, named by its words, and the old title is ignored', async ({
  page,
}) => {
  await page.goto(PAGE)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Build something people remember' }),
  ).toBeVisible()
  await expect(page.getByText('Old plain title')).toHaveCount(0)
  expect(await page.locator('h1').textContent()).toBe('Build something people remember')
})

test('a hero further down is an h2 with its highlights', async ({ page }) => {
  await page.goto(PAGE)
  const later = page.getByRole('heading', { level: 2, name: 'A second hero is an h2' })
  await expect(later).toBeVisible()
  await expect(later.locator('[data-emphasis="highlight"]')).toHaveText('second')
  await expect(later.locator('[data-emphasis="brand"]')).toHaveText('h2')
})

test('highlights are plain spans in the server HTML, with no semantic emphasis elements', async ({
  request,
}) => {
  const html = await (await request.get(PAGE)).text()
  const h1 = /<h1[^>]*>(.*?)<\/h1>/s.exec(html)?.[1] ?? ''
  expect(h1).toContain('<span data-emphasis="gradient"')
  expect(h1).toContain('<span data-emphasis="underline">remember</span>')
  expect(h1).not.toMatch(/<(em|strong|mark|b|i)[ >]/)
})

test('the gradient is clipped to the text and repeats on every wrapped line', async ({ page }) => {
  await page.goto(PAGE)
  const span = page.locator('h1 [data-emphasis="gradient"]')
  const style = await span.evaluate((element) => {
    const computed = getComputedStyle(element)
    return {
      image: computed.backgroundImage,
      clip: computed.backgroundClip,
      fill: computed.getPropertyValue('-webkit-text-fill-color'),
      decorationBreak: computed.getPropertyValue('box-decoration-break'),
    }
  })
  expect(style.image).toContain('linear-gradient')
  expect(style.clip).toBe('text')
  expect(style.fill).toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
  expect(style.decorationBreak).toBe('clone')
})

test('underline uses the thickness and offset tokens', async ({ page }) => {
  await page.goto(PAGE)
  const decoration = await page.locator('h1 [data-emphasis="underline"]').evaluate((element) => {
    const computed = getComputedStyle(element)
    const size = Number.parseFloat(computed.fontSize)
    return {
      line: computed.textDecorationLine,
      thickness: Number.parseFloat(computed.textDecorationThickness) / size,
      offset: Number.parseFloat(computed.textUnderlineOffset) / size,
    }
  })
  expect(decoration.line).toBe('underline')
  expect(decoration.thickness).toBeCloseTo(0.08, 2)
  expect(decoration.offset).toBeCloseTo(0.14, 2)
})

test('under forced colours the gradient gives way to a solid system colour', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto(PAGE)
  const style = await page.locator('h1 [data-emphasis="gradient"]').evaluate((element) => {
    const computed = getComputedStyle(element)
    return {
      image: computed.backgroundImage,
      fill: computed.getPropertyValue('-webkit-text-fill-color'),
    }
  })
  expect(style.image).toBe('none')
  expect(style.fill).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
})

test('a long gradient heading wraps without losing words', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'wrapping is the phone case')
  await page.goto('/section-gallery')
  const span = page.locator(
    '[data-gallery-section="hero-heading-gradient"] [data-emphasis="gradient"]',
  )
  await span.scrollIntoViewIfNeeded()
  const lines = await span.evaluate((element) => element.getClientRects().length)
  expect(lines).toBeGreaterThan(1)
  await expect(span).toHaveText('grow with your business')
})

test(`${PAGE} has no WCAG 2.2 AA violations`, async ({ page }) => {
  await page.goto(PAGE)
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(
    violations.map(({ id, nodes }) => `${id}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([])
})
