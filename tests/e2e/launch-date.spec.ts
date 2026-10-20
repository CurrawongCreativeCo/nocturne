import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * The launch date line and its optional countdown (README, "Launch date"). The line is plain server
 * text in the Business info time zone (Australia/Sydney in the fixtures). The countdown is a client
 * island that only a page which turns it on downloads.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
// A string that is only in the countdown's code.
const ISLAND_MARKER = 'data-launch-countdown-text'

const line = (page: Page) => page.locator('[data-launch-date]:visible')
const countdown = (page: Page) => page.locator('[data-launch-countdown]')

/** The text of every script the page loads, to see whether the countdown's code came with it. */
function watchScripts(page: Page) {
  const bodies: Promise<string>[] = []
  page.on('response', (response) => {
    if (response.url().includes('/_next/static/') && response.url().endsWith('.js')) {
      bodies.push(response.text().catch(() => ''))
    }
  })
  return async () => (await Promise.all(bodies)).some((body) => body.includes(ISLAND_MARKER))
}

test.describe('the date line', () => {
  test('reads in en-AU order, with the time, from the server', async ({ page }) => {
    await page.goto('/launch-date-plain')
    await expect(line(page)).toHaveText('Opening Monday 5 January, 9:30 am')
    await expect(countdown(page)).toHaveCount(0)
  })

  test('is in the HTML without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/launch-date-plain')
    await expect(line(page)).toHaveText('Opening Monday 5 January, 9:30 am')
    await context.close()
  })

  test('is not there once the date has passed, and the rest of the page is', async ({ page }) => {
    await page.goto('/launch-date-past')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Launch date in the past')
    await expect(line(page)).toHaveCount(0)
    await expect(countdown(page)).toHaveCount(0)
  })

  test('passes axe with and without the countdown', async ({ page }) => {
    for (const path of ['/launch-date-plain', '/launch-date']) {
      await page.goto(path)
      await expect(line(page)).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
      expect(results.violations, path).toEqual([])
    }
  })
})

test.describe('the countdown', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('loads its code only on a page that turns it on', async ({ page }) => {
    const loaded = watchScripts(page)
    await page.goto('/launch-date')
    await expect(page.locator(`[${ISLAND_MARKER}]`)).toBeVisible()
    expect(await loaded()).toBe(true)

    for (const path of ['/launch-date-plain', '/links']) {
      const other = await page.context().newPage()
      const otherLoaded = watchScripts(other)
      await other.goto(path)
      await other.waitForLoadState('networkidle')
      expect(await otherLoaded(), path).toBe(false)
      await other.close()
    }
  })

  test('is hidden from screen readers and the date line stays', async ({ page }) => {
    await page.goto('/launch-date')
    await expect(countdown(page)).toHaveAttribute('aria-hidden', 'true')
    await expect(line(page).locator('p').first()).toHaveText('Opening Monday 5 January')
    await expect(page.locator(`[${ISLAND_MARKER}]`)).toContainText('to go')
  })

  test('counts down by the minute', async ({ page }) => {
    // 5 January 2099 starts at 13:00 UTC on the 4th in Sydney (UTC+11). 30 seconds of slack for the page load.
    await page.clock.install({ time: new Date('2099-01-04T00:00:30Z') })
    await page.goto('/launch-date')
    const text = page.locator(`[${ISLAND_MARKER}]`)
    await expect(text).toHaveText('12 hours 59 minutes to go')
    await page.clock.runFor(60_000)
    await expect(text).toHaveText('12 hours 58 minutes to go')
  })

  test('counts by the second only in the last hour', async ({ page }) => {
    await page.clock.install({ time: new Date('2099-01-04T12:29:30Z') })
    await page.goto('/launch-date')
    const text = page.locator(`[${ISLAND_MARKER}]`)
    await expect(text).toHaveText(/^30 minutes \d+ seconds to go$/)
    const before = await text.textContent()
    await page.clock.runFor(2000)
    await expect.poll(() => text.textContent()).not.toBe(before)
  })

  test('stops while the tab is hidden and catches up when it is shown', async ({ page }) => {
    await page.clock.install({ time: new Date('2099-01-04T00:00:30Z') })
    await page.goto('/launch-date')
    const text = page.locator(`[${ISLAND_MARKER}]`)
    await expect(text).toHaveText('12 hours 59 minutes to go')

    const setHidden = (hidden: boolean) =>
      page.evaluate((value) => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => value })
        document.dispatchEvent(new Event('visibilitychange'))
      }, hidden)
    await setHidden(true)
    await page.clock.runFor(5 * 60_000)
    await expect(text).toHaveText('12 hours 59 minutes to go')
    await setHidden(false)
    await expect(text).toHaveText('12 hours 54 minutes to go')
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('shows the date line and no countdown text', async ({ page }) => {
      await page.goto('/launch-date')
      await expect(line(page)).toBeVisible()
      await page.waitForLoadState('networkidle')
      await expect(page.locator(`[${ISLAND_MARKER}]`)).toHaveCount(0)
    })
  })

  test('holds its height before it fills in, so nothing moves', async ({ page }) => {
    await page.goto('/launch-date')
    // Streaming leaves the fallback and its replacement in the page for a moment; wait for one.
    await expect(countdown(page)).toHaveCount(1)
    const box = await countdown(page).boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(24)
  })
})
