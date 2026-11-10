import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'
import { clipReading } from './picture-depth-helpers'

/**
 * Picture depth on the Location's map picture (README, "Picture depth and glow"): `/picture-depth-location`. The
 * filter is on the picture itself, so it follows the picture's own ring and corners; the card or details beside it
 * are untouched. With no map image there is no picture, and so no effect.
 */

const PAGE = '/picture-depth-location'
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test.beforeEach(async ({ page }) => {
  // The click-to-load map must not reach Google from a test.
  await page.route('https://www.google.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>map</p>' }),
  )
})

const section = (page: Page, heading: string) =>
  page
    .locator('#main-content section')
    .filter({ has: page.getByRole('heading', { name: heading, exact: true }) })
const picture = (scope: Locator) => scope.locator('img').first()
const filterOf = (scope: Locator) => picture(scope).evaluate((el) => getComputedStyle(el).filter)

const LEVELS = [
  ['Location soft', '0px 1px 2px'],
  ['Location raised', '0px 4px 6px'],
  ['Location floating', '0px 20px 28px'],
  ['Location floating strong glow', '0px 0px 14px'],
  ['Location strong glow only', '0px 0px 14px'],
] as const

test.describe('motion off', () => {
  test.use({ reducedMotion: 'reduce' })

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready)
  })

  test('nothing chosen draws no filter, and Flat with Glow off is the same', async ({ page }) => {
    for (const heading of ['Location nothing chosen', 'Location flat and glow off']) {
      expect(await filterOf(section(page, heading)), heading).toBe('none')
    }
  })

  for (const [heading, expected] of LEVELS) {
    test(`${heading}: the picture carries the shadow and keeps its ring, corners and size`, async ({
      page,
    }) => {
      const scope = section(page, heading)
      const plain = section(page, 'Location nothing chosen')
      expect(await filterOf(scope)).toContain(expected)
      const look = (s: Locator) =>
        picture(s).evaluate((el) => {
          const css = getComputedStyle(el)
          const { width, height } = el.getBoundingClientRect()
          return [
            css.boxShadow,
            css.borderRadius,
            css.objectFit,
            Math.round(width),
            Math.round(height),
          ]
        })
      expect(await look(scope)).toEqual(await look(plain))
    })
  }

  test('the filter changes neither the picture’s box, the section nor the page', async ({
    page,
  }) => {
    const scope = section(page, 'Location floating strong glow')
    const read = () =>
      scope.evaluate((el) => {
        const { x, y, width, height } = (el.querySelector('img') as Element).getBoundingClientRect()
        return {
          img: [x, y, width, height],
          height: el.getBoundingClientRect().height,
          page: document.documentElement.scrollHeight,
        }
      })
    const before = await read()
    await picture(scope).evaluate((el) => {
      el.style.setProperty('filter', 'none', 'important')
    })
    expect(await read()).toEqual(before)
  })

  test('the map picture’s shadow is not cut off by anything that clips', async ({ page }) => {
    for (const [heading] of LEVELS) {
      const { clippedBy, edge, strongest, where } = await clipReading(
        page,
        picture(section(page, heading)),
      )
      expect(clippedBy, `${heading}: nothing around the picture clips`).toBe('')
      expect(edge, `${heading} ${where}`).toBeLessThan(Math.max(8, strongest * 0.25))
    }
  })

  test('the click-to-load map keeps its filtered picture until it is clicked, then the map replaces it', async ({
    page,
  }) => {
    const scope = section(page, 'Location interactive floating')
    expect(await filterOf(scope)).toContain('0px 20px 28px')
    const load = scope.getByRole('button', { name: 'Load interactive map' })
    await expect(load).toBeVisible()
    await load.click()
    await expect(scope.locator('iframe')).toHaveCount(1)
    await expect(scope.locator('img')).toHaveCount(0)
    // The map is the provider's own: no picture depth on it.
    expect(await scope.locator('iframe').evaluate((el) => getComputedStyle(el).filter)).toBe('none')
  })

  test('with no map image nothing is drawn: no picture, no filter, and the same details as without a depth', async ({
    page,
  }) => {
    const none = section(page, 'Location no picture nothing chosen')
    const depth = section(page, 'Location no picture floating')
    await expect(depth.locator('img')).toHaveCount(0)
    const [a, b] = [await none.boundingBox(), await depth.boundingBox()]
    expect(b?.width).toBeCloseTo(a?.width ?? 0, 1)
    expect(b?.height).toBeCloseTo(a?.height ?? 0, 1)
    expect(
      await depth.evaluate(
        (el) => el.querySelectorAll('[style*="depth-filter"], [class*="depth-filter"]').length,
      ),
    ).toBe(0)
  })
})

test.describe('motion on', () => {
  test.use({ reducedMotion: 'no-preference' })

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
  })

  test('under the section’s parallax the picture moves as one piece, and the filter is on the picture', async ({
    page,
  }) => {
    const scope = section(page, 'Location parallax floating')
    expect(await filterOf(scope)).toContain('0px 20px 28px')
    // The whole picture drifts (it has no frame of its own to stay still); the mover is not the filtered element.
    const mover = scope.locator("[style*='--parallax-amount']")
    await expect(mover).toHaveCount(1)
    expect(await mover.evaluate((el) => getComputedStyle(el).filter)).toBe('none')
    expect(await mover.evaluate((el) => el.querySelector('img') !== null)).toBe(true)
  })

  test('adds nothing the accessibility tree reads, and passes axe', async ({ page }) => {
    const exposed = (heading: string) =>
      section(page, heading).evaluate((el) =>
        [...el.querySelectorAll('img')].map((img) =>
          [img.getAttribute('alt'), img.getAttribute('role'), img.getAttribute('aria-hidden')].join(
            '|',
          ),
        ),
      )
    const withDepth = await exposed('Location floating strong glow')
    expect(withDepth.length).toBeGreaterThan(0)
    expect(withDepth).toEqual(await exposed('Location nothing chosen'))
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })

  test('hydrates without warnings and without a layout shift', async ({ page }) => {
    const problems: string[] = []
    page.on('console', (message) => {
      if (/hydrat/i.test(message.text())) problems.push(message.text())
    })
    await page.addInitScript(() => {
      const shifts: number[] = []
      ;(window as unknown as { __shifts: number[] }).__shifts = shifts
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as {
          value: number
          hadRecentInput: boolean
        }[]) {
          if (!entry.hadRecentInput) shifts.push(entry.value)
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    await section(page, 'Location interactive floating').scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    const total = await page.evaluate(() =>
      (window as unknown as { __shifts: number[] }).__shifts.reduce((a, b) => a + b, 0),
    )
    expect(problems).toEqual([])
    expect(total).toBeLessThan(0.01)
  })
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('draws the shadow from the server’s markup alone', async ({ page }) => {
    await page.goto(PAGE)
    expect(await filterOf(section(page, 'Location floating strong glow'))).toContain(
      '0px 20px 28px',
    )
  })
})
