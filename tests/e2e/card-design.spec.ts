import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * The shared card design and decorative marks in a browser (task 156), on /card-design at a phone and a
 * desktop width: what a unit test can't see, which is where a mark lands, what clips it, what sits over
 * it and whether it moved anything. Not in the section gallery, so it adds no visual baseline.
 */

const PAGE = '/card-design'
const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]
// A transparent picture, with a CORS header: a CSS mask won't draw a cross-origin image without one.
const PICTURE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#000"/></svg>`

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      headers: { 'access-control-allow-origin': '*' },
      body: PICTURE,
    }),
  )
})

const section = (page: Page, heading: string) =>
  page
    .locator('main section')
    .filter({ has: page.getByRole('heading', { name: heading, exact: true }) })

const heightOf = (locator: Locator) =>
  locator.evaluate((element) => element.getBoundingClientRect().height)

/** Every element of the mark stays inside the clipped box it was drawn in, as the browser computes it. */
async function expectClipped(mark: Locator) {
  const box = await mark.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      position: style.position,
      overflow: style.overflowX,
      pointer: style.pointerEvents,
      hidden: element.getAttribute('aria-hidden'),
      focusable: element.querySelectorAll('a, button, input, [tabindex]').length,
    }
  })
  expect(box).toEqual({
    position: 'absolute',
    overflow: 'hidden',
    pointer: 'none',
    hidden: 'true',
    focusable: 0,
  })
}

for (const viewport of WIDTHS) {
  test.describe(`at ${String(viewport.width)} px`, () => {
    test.use({ viewport })

    test('nothing leaves the window, and axe finds no violations', async ({ page }) => {
      await page.goto(PAGE)
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
      const results = await new AxeBuilder({ page }).include('main').analyze()
      expect(
        results.violations.flatMap(({ id, nodes }) => nodes.map((node) => `${id}: ${node.html}`)),
      ).toEqual([])
    })

    test('a section mark sits behind its content, clipped to its section, with no layout shift', async ({
      page,
    }) => {
      await page.goto(PAGE)
      const marked = section(page, 'Section mark')
      const mark = marked.locator('[data-decorative-mark="section"]')
      await expect(mark).toHaveCount(1)
      await expectClipped(mark)
      // The mark fills its section exactly, so what it draws past that is cut off at the section's edge.
      const [markBox, sectionBox] = await Promise.all([mark.boundingBox(), marked.boundingBox()])
      expect(markBox).toEqual(sectionBox)
      // Drawn before the content, which is positioned, so the content paints over it.
      const order = await marked.evaluate((element) => {
        const children = [...element.children]
        const at = children.findIndex((child) => child.hasAttribute('data-decorative-mark'))
        const after = children[at + 1]
        return {
          contentFollows: after?.querySelector('h2') !== null,
          positioned: after ? getComputedStyle(after).position : '',
        }
      })
      expect(order).toEqual({ contentFollows: true, positioned: 'relative' })
      expect(await heightOf(marked)).toBeCloseTo(await heightOf(section(page, 'No mark')), 0)
    })

    test('a card mark sits behind its text, clipped to its card, with no layout shift', async ({
      page,
    }) => {
      await page.goto(PAGE)
      const marked = section(page, 'Card mark')
      const card = marked.locator('figure').first()
      const mark = card.locator('[data-decorative-mark="card"]')
      await expect(mark).toHaveCount(1)
      await expectClipped(mark)
      const [markBox, cardBox] = await Promise.all([mark.boundingBox(), card.boundingBox()])
      expect(markBox).toEqual(cardBox)
      // Below the card's content, above its own fill.
      const stacking = await mark.evaluate((element) => ({
        z: getComputedStyle(element).zIndex,
        isolation: element.parentElement ? getComputedStyle(element.parentElement).isolation : '',
      }))
      expect(stacking).toEqual({ z: '-10', isolation: 'isolate' })
      expect(await heightOf(card)).toBeCloseTo(
        await heightOf(section(page, 'No mark').locator('figure').first()),
        0,
      )
    })

    test('draws words, a picture and an icon, and a picture takes the theme colour unless it keeps its own', async ({
      page,
    }) => {
      await page.goto(PAGE)
      await expect(section(page, 'Section mark').locator('[data-mark-kind="text"]')).toHaveCount(1)
      await expect(
        section(page, 'Card mark').locator('[data-mark-kind="icon"] svg').first(),
      ).toBeVisible()
      const tinted = section(page, 'A picture in the theme colour').locator(
        '[data-mark-kind="picture"] > span',
      )
      const look = await tinted.evaluate((element) => {
        const style = getComputedStyle(element)
        return { mask: style.maskImage, color: style.backgroundColor }
      })
      expect(look.mask).toContain('cdn.sanity.io')
      expect(look.color).not.toBe('rgba(0, 0, 0, 0)')
      const own = section(page, 'A picture in its own colours')
        .locator('[data-mark-kind="picture"] > span')
        .first()
      expect(await own.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain(
        'cdn.sanity.io',
      )
      expect(await own.evaluate((element) => getComputedStyle(element).maskImage)).toBe('none')
    })

    test('a mark on a panel is inside it by default, and goes behind it when asked', async ({
      page,
    }) => {
      await page.goto(PAGE)
      await expect(
        section(page, 'A mark on a panel').locator(
          '[data-panel] > [data-decorative-mark="section"]',
        ),
      ).toHaveCount(1)
      const behind = section(page, 'A mark behind a panel')
      await expect(behind.locator('> [data-decorative-mark="section"]')).toHaveCount(1)
      await expect(behind.locator('[data-panel] [data-decorative-mark]')).toHaveCount(0)
    })

    test('a mark too strong for its text is drawn fainter, not refused', async ({ page }) => {
      await page.goto(PAGE)
      const opacity = await section(page, 'A mark too strong for its text')
        .locator('[data-decorative-mark] svg')
        .evaluate((element) => Number(getComputedStyle(element).opacity))
      // Asked for 40%, which an icon's bound caps at 20%; the contrast check may take it lower.
      expect(opacity).toBeGreaterThan(0)
      expect(opacity).toBeLessThanOrEqual(0.2)
    })

    test('the tint, border, text and highlight reach their own elements', async ({ page }) => {
      await page.goto(PAGE)
      const tinted = section(page, 'A tint and a highlight')
      await expect(tinted.locator('figure mark').first()).toHaveText('changed how we work')
      await expect(tinted.locator('[data-text-role="quote"]').first()).toHaveCSS(
        'font-style',
        'italic',
      )
      const outlined = section(page, 'A border and a text change')
      await expect(outlined.locator('[data-text-role="eyebrow"]')).toHaveText('What people say')
      await expect(outlined.locator('[data-text-role="intro"]')).toBeVisible()
      await expect(outlined.locator('[data-text-role="label"]').first()).toHaveCSS(
        'text-transform',
        'uppercase',
      )
    })
  })
}

test('a tinted picture mark paints, whether or not the image CDN sends a CORS header', async ({
  page,
}) => {
  // Measured, not assumed: Chromium paints a CSS mask from a cross-origin image either way (WebKit was
  // checked by hand on 7 November 2026, Firefox not at all). Painting means pixels, not a computed style:
  // the section is drawn with and without the mark, and the two must differ.
  await page.setViewportSize({ width: 1440, height: 900 })
  const paints = async (cors: boolean) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await page.route('https://cdn.sanity.io/**', (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        headers: {
          'cache-control': 'no-store',
          ...(cors ? { 'access-control-allow-origin': '*' } : {}),
        },
        body: PICTURE,
      }),
    )
    await page.goto(PAGE)
    const marked = section(page, 'A picture in the theme colour')
    await marked.scrollIntoViewIfNeeded()
    await page.waitForLoadState('networkidle')
    const height = await heightOf(marked)
    const drawn = await marked.screenshot()
    await marked.locator('[data-decorative-mark]').evaluate((element) => {
      ;(element as HTMLElement).style.display = 'none'
    })
    return { painted: !drawn.equals(await marked.screenshot()), height }
  }
  const allowed = await paints(true)
  const bare = await paints(false)
  expect(allowed.painted).toBe(true)
  expect(bare.painted).toBe(true)
  // The mark never takes part in layout.
  expect(bare.height).toBe(allowed.height)
})

test('a mark set to Hidden on phones shows only from the tablet up', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(PAGE)
  const mark = section(page, 'A mark hidden on phones').locator('[data-decorative-mark]')
  await expect(mark).toBeHidden()
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(mark).toHaveCount(1)
  await expect(mark.locator('svg')).toBeVisible()
})
