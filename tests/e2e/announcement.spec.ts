import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// The fixture's window is 2026-01-01 to 2100-01-01 (tests/e2e/fixtures/dataset.mjs).
const BEFORE_WINDOW = new Date('2025-06-01T00:00:00Z')
const AFTER_WINDOW = new Date('2101-01-01T00:00:00Z')
const MESSAGE = 'Summer sale: 20% off all services'

test.describe('announcement bar', () => {
  test('shows inside its window, as a labelled region with a link', async ({ page }) => {
    await page.goto('/')
    const bar = page.getByRole('region', { name: 'Announcement' })
    await expect(bar).toBeVisible()
    await expect(bar.getByRole('link', { name: MESSAGE })).toHaveAttribute('href', '/about')
    // Above the header, so it is the first landmark in the page.
    const [barBox, headerBox] = await Promise.all([
      bar.boundingBox(),
      page.getByRole('banner').boundingBox(),
    ])
    expect(barBox?.y).toBeLessThan(headerBox?.y ?? 0)

    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations).toEqual([])
  })

  test('is dismissed with its close button and stays dismissed', async ({ page }) => {
    await page.goto('/')
    const bar = page.getByRole('region', { name: 'Announcement' })
    await expect(bar).toBeVisible()

    await page.getByRole('button', { name: 'Dismiss announcement' }).click()
    await expect(bar).toBeHidden()

    await page.reload()
    await expect(page.getByRole('link', { name: 'About' }).first()).toBeVisible()
    await expect(bar).toBeHidden()

    // The key is the message, so a new message would show again.
    // (The consent choice shares localStorage; only the announcement's own keys matter here.)
    const keys = await page.evaluate(() => Object.keys(localStorage))
    expect(keys.filter((key) => key.startsWith('announcement-dismissed:'))).toEqual([
      `announcement-dismissed:${MESSAGE}`,
    ])
  })

  test('stays closed for the session when storage is blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError')
        },
      })
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Dismiss announcement' }).click()
    await expect(page.getByRole('region', { name: 'Announcement' })).toBeHidden()
  })

  test('is hidden, and takes no space, after its window has ended', async ({ page }) => {
    await page.clock.setFixedTime(AFTER_WINDOW)
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'About' }).first()).toBeVisible()
    await expect(page.getByRole('region', { name: 'Announcement' })).toBeHidden()
    await expect(page.getByText(MESSAGE)).toBeHidden()
    expect((await page.getByRole('banner').boundingBox())?.y).toBe(0)
  })

  test('is hidden before its window starts', async ({ page }) => {
    await page.clock.setFixedTime(BEFORE_WINDOW)
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'About' }).first()).toBeVisible()
    await expect(page.getByRole('region', { name: 'Announcement' })).toBeHidden()
  })

  test('the close button has a visible white focus ring', async ({ page }) => {
    await page.goto('/')
    const button = page.getByRole('button', { name: 'Dismiss announcement' })
    await button.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(button).toBeFocused()
    await expect(button).toHaveCSS('outline-style', 'solid')
    await expect(button).toHaveCSS('outline-width', '2px')
  })
})
