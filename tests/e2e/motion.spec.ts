import { expect, test } from '@playwright/test'

/** The first hero fades up its description and buttons (src/features/pages/components/sections/hero.tsx). */
const REVEALED = '[data-reveal]'

test.describe('motion on', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('reveals the hero text after load and fetches the feature bundle lazily', async ({
    page,
  }) => {
    const chunks: string[] = []
    page.on('response', (response) => {
      if (response.url().includes('/_next/static/chunks/')) chunks.push(response.url())
    })
    await page.goto('/')

    const revealed = page.locator(REVEALED)
    await expect(revealed.first()).toBeVisible()
    await expect(revealed.first()).toHaveCSS('opacity', '1')
    for (const element of await revealed.all()) await expect(element).toHaveCSS('opacity', '1')

    // The h1 is an LCP candidate: it is never animated.
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveAttribute('data-reveal')
    expect(chunks.length).toBeGreaterThan(0)
  })
})

test.describe('reduced motion', () => {
  test('shows the final state straight away', async ({ page }) => {
    await page.goto('/')
    for (const element of await page.locator(REVEALED).all()) {
      await expect(element).toHaveCSS('opacity', '1')
      await expect(element).toHaveCSS('transform', 'none')
    }
  })
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false, reducedMotion: 'no-preference' })

  test('content that fades in is readable', async ({ page }) => {
    await page.goto('/')
    const revealed = page.locator(REVEALED)
    expect(await revealed.count()).toBeGreaterThan(0)
    for (const element of await revealed.all()) await expect(element).toHaveCSS('opacity', '1')
  })
})
