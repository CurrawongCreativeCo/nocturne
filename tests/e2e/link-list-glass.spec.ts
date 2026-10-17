import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * Glass rows, the Link list's sixth preset (README, "Link list"): frosted rows over a background photo.
 * `/link-glass` is a minimal page with one Glass rows section over a picture; the section gallery has
 * `link-list-glass-rows`. The Light and Dark Brand colours screenshots are in design-settings-visual.spec.ts.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PAGE = '/link-glass'
const ROW = '#main-content li[data-track-event] > a'

/** Stands in for every Sanity CDN image, so the screenshots never depend on the network. */
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#ec4899"/>
  </linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
</svg>`

const rows = (page: Page) => page.locator(ROW)

test.describe('Glass rows', () => {
  test('draw each link as one row with its picture, icon, text and arrow', async ({ page }) => {
    await page.goto(PAGE)
    await expect(rows(page)).toHaveCount(5)
    const care = rows(page).filter({ hasText: 'Our care services' })
    // Picture, icon badge and arrow badge: a picture and two round badges, no more.
    await expect(care.locator('img')).toHaveCount(1)
    await expect(care.locator('svg')).toHaveCount(2)
    await expect(care).toContainText('Home help, respite and support')
    // A row with neither picture nor icon still holds its text, and the arrow.
    const plain = rows(page).filter({ hasText: 'Call us on 1300 000 000' })
    await expect(plain.locator('img')).toHaveCount(0)
    await expect(plain.locator('svg')).toHaveCount(1)
  })

  test('are frosted: a blurred, see-through surface with a light edge', async ({ page }) => {
    await page.goto(PAGE)
    const style = await rows(page)
      .first()
      .evaluate((row) => {
        const computed = getComputedStyle(row)
        return {
          blur: computed.backdropFilter,
          background: computed.backgroundColor,
          border: computed.borderTopWidth,
        }
      })
    expect(style.blur).toMatch(/^blur\((1[2-6])px\)$/)
    expect(style.background).not.toBe('rgba(0, 0, 0, 0)')
    expect(style.border).toBe('1px')
  })

  test('fall back to a nearly solid surface where the browser cannot blur or the visitor asks for less transparency', async ({
    page,
  }) => {
    await page.goto(PAGE)
    const rules = await page.evaluate(() =>
      [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)),
    )
    const sheet = rules.join('\n')
    expect(sheet).toMatch(/@supports not[^{]*backdrop-filter/)
    expect(sheet).toContain('prefers-reduced-transparency')
  })

  test('are one Tab stop per row, in order, each with a visible focus', async ({ page }) => {
    await page.goto(PAGE)
    const labels = [
      'Our care services',
      'Join the community',
      'Book a visit',
      'Call us on 1300 000 000',
      'Find us',
    ]
    for (const label of labels) {
      // The first Tab may land on the skip link: move on until a row has the focus.
      let info = { isRow: false, text: '', outline: false, focusable: 0 }
      for (let attempt = 0; attempt < 3 && !info.isRow; attempt++) {
        await page.keyboard.press('Tab')
        info = await page.evaluate(() => {
          const element = document.activeElement
          const row = element?.closest('li[data-track-event]')
          return {
            isRow: element?.matches('li[data-track-event] > a') ?? false,
            text: element?.textContent ?? '',
            outline: element ? getComputedStyle(element).outlineStyle !== 'none' : false,
            focusable: row ? row.querySelectorAll('a, button, [tabindex]').length : 0,
          }
        })
      }
      expect(info.isRow, label).toBe(true)
      expect(info.text, label).toContain(label)
      expect(info.outline, `focus outline on ${label}`).toBe(true)
      expect(info.focusable, `${label} has one focusable element`).toBe(1)
    }
  })

  test('change their edge on hover', async ({ page }) => {
    await page.goto(PAGE)
    const row = rows(page).first()
    const before = await row.evaluate((element) => getComputedStyle(element).borderTopColor)
    await row.hover()
    await expect
      .poll(() => row.evaluate((element) => getComputedStyle(element).borderTopColor))
      .not.toBe(before)
  })

  test('have no accessibility violations', async ({ page }) => {
    await page.goto(PAGE)
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })

  test('render fully without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    const page = await context.newPage()
    await page.goto(PAGE)
    await expect(rows(page)).toHaveCount(5)
    await expect(rows(page).first()).toBeVisible()
    await expect(rows(page).first().locator('img')).toHaveCount(1)
    await context.close()
  })
})

test.describe('Glass rows at 375 px', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('fit the screen, with a thumbnail about 30% of the row and rows easy to tap', async ({
    page,
  }) => {
    await page.goto(PAGE)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
    const boxes = await rows(page).evaluateAll((items) =>
      items.map((item) => {
        const row = item.getBoundingClientRect()
        const picture = item.querySelector('img')?.parentElement?.getBoundingClientRect()
        return { height: row.height, share: picture ? picture.width / row.width : 0 }
      }),
    )
    expect(boxes).toHaveLength(5)
    for (const box of boxes) expect(box.height).toBeGreaterThanOrEqual(44)
    // The three rows with pictures: about 30% of the row (the row's own border and the rounding aside).
    for (const { share } of boxes.filter((box) => box.share > 0)) {
      expect(share).toBeGreaterThan(0.27)
      expect(share).toBeLessThan(0.33)
    }
    expect(boxes.filter((box) => box.share > 0)).toHaveLength(3)
  })

  test('wrap long text inside the row', async ({ page }) => {
    await page.goto(PAGE)
    const overflow = await rows(page).evaluateAll((items) =>
      items.some((item) => item.scrollWidth > item.clientWidth + 1),
    )
    expect(overflow).toBe(false)
  })

  test('have no accessibility violations', async ({ page }) => {
    await page.goto(PAGE)
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('Glass rows, visual', () => {
  test.skip(
    process.platform !== 'linux' && !process.env.E2E_VISUAL_ANY_OS,
    'Baselines are rendered on Linux; set E2E_VISUAL_ANY_OS=1 to compare on this system anyway',
  )
  // One set of baselines, from the desktop project: the widths below are set here.
  test.skip(({ isMobile }) => isMobile, 'Widths are set by the test, so one project is enough')

  for (const width of [375, 768, 1280]) {
    test(`look the same at ${String(width)} px`, async ({ page }) => {
      await page.route('https://cdn.sanity.io/**', (route) =>
        route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
      )
      await page.setViewportSize({ width, height: 900 })
      await page.goto(PAGE)
      await page.evaluate(async () => {
        for (const img of document.querySelectorAll('img')) img.loading = 'eager'
        await Promise.all(
          [...document.querySelectorAll('img')].map((img) => img.decode().catch(() => undefined)),
        )
        await document.fonts.ready
      })
      await expect(page).toHaveScreenshot(`link-glass-${String(width)}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      })
    })
  }
})
