import { expect, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * The navigation progress bar (README "Navigation feedback"): never for instant navigations,
 * shown for slow ones, and without the growing animation under reduced motion.
 */
test.skip(({ isMobile }) => isMobile, 'The header links are in the mobile menu there')

const bar = (page: Page) => page.locator('.route-progress')
const mainNav = (page: Page) => page.getByRole('navigation', { name: 'Main' })

/** Records whether the bar ever reached the loading phase, even for a single frame. */
async function recordLoading(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __progressShown: boolean }
    w.__progressShown = false
    new MutationObserver(() => {
      if (document.querySelector('.route-progress[data-phase="loading"]')) w.__progressShown = true
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-phase'] })
  })
}

const wasShown = (page: Page) =>
  page.evaluate(() => (window as unknown as { __progressShown: boolean }).__progressShown)

/**
 * Delays every client-side (RSC) request, prefetches included, so a link click takes a while to
 * land. Call it before page.goto(): a prefetch that already finished would make the click instant.
 */
async function delayNavigations(page: Page, ms: number) {
  await page.route('**/*', async (route) => {
    if (route.request().headers().rsc) await new Promise((resolve) => setTimeout(resolve, ms))
    await route.continue()
  })
}

test('stays hidden while moving between prerendered pages', async ({ page }) => {
  await recordLoading(page)
  const prefetch = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/about' &&
      response.request().headers()['next-router-prefetch'] === '1',
  )
  await page.goto('/')
  await expect(bar(page)).toHaveAttribute('data-phase', 'idle')
  // "Instant" means the link's prefetch has landed. On a busy machine it can still be in flight at
  // the click, and the bar is then right to appear, so wait for it.
  await (await prefetch).finished()
  await page.waitForLoadState('networkidle')
  await mainNav(page).getByRole('link', { name: 'About' }).click()
  await expect(page).toHaveURL('/about')
  await expect(page.getByRole('heading', { name: 'About', level: 1 })).toBeVisible()
  // Give a late timer the chance to misfire.
  await page.waitForTimeout(500)
  expect(await wasShown(page)).toBe(false)
  await expect(bar(page)).toHaveAttribute('data-phase', 'idle')
})

test('is aria-hidden and never takes a click', async ({ page }) => {
  await page.goto('/')
  await expect(bar(page)).toHaveAttribute('aria-hidden', 'true')
  expect(await bar(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
})

test('appears for a slow navigation, then completes and hides', async ({ page }) => {
  await delayNavigations(page, 1500)
  await page.goto('/')
  await mainNav(page).getByRole('link', { name: 'About' }).click()
  await expect(bar(page)).toHaveAttribute('data-phase', 'loading')
  expect(await bar(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
  await expect(page).toHaveURL('/about')
  await expect(bar(page)).toHaveAttribute('data-phase', 'idle')
  expect(await bar(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('0')
})

test('ignores hash links and the page you are already on', async ({ page }) => {
  await delayNavigations(page, 1000)
  await recordLoading(page)
  await page.goto('/about')
  await mainNav(page).getByRole('link', { name: 'About' }).click()
  await page.evaluate(() => {
    location.hash = '#main-content'
  })
  await page.waitForTimeout(500)
  expect(await wasShown(page)).toBe(false)
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('appears at full width without growing, and disappears', async ({ page }) => {
    await delayNavigations(page, 1500)
    await page.goto('/')
    await mainNav(page).getByRole('link', { name: 'About' }).click()
    await expect(bar(page)).toHaveAttribute('data-phase', 'loading')
    expect(await bar(page).evaluate((el) => getComputedStyle(el).transform)).toBe(
      'matrix(1, 0, 0, 1, 0, 0)',
    )
    await expect(page).toHaveURL('/about')
    await expect(bar(page)).toHaveAttribute('data-phase', 'idle')
  })
})
