import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * Background image placement (README, "Section backgrounds"): size, position, repeat, strength, the
 * overlay colour and Fill the screen, on three Link page fixtures (full-screen photo, a faint
 * transparent pattern at the bottom, and a tiled pattern that stays put).
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const WIDTHS = [375, 768, 1280]

const PHOTO = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`
// Transparent apart from one small mark: it keeps its alpha through `auto=format`.
const PATTERN = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><circle cx="80" cy="60" r="40" fill="#0b6e4f"/></svg>`

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: route.request().url().includes('fedcba98') ? PATTERN : PHOTO,
    }),
  )
})

const layer = (page: Page) => page.locator('[data-section-background]')

for (const width of WIDTHS) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } })

    test('a photo fills the whole screen, with a dark wash', async ({ page }) => {
      await page.goto('/links-photo')
      const section = page.locator('section[data-tone]').first()
      const box = await section.boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(800)
      await expect(layer(page).locator('[data-section-image="cover"]')).toHaveCount(1)
      await expect(page.locator('[data-section-overlay]')).toHaveAttribute(
        'data-overlay-colour',
        'dark',
      )
      expect(
        await page
          .locator('[data-section-overlay]')
          .evaluate((el) => getComputedStyle(el).backgroundColor),
      ).toBe('rgb(3, 7, 18)')
    })

    test('a faint pattern sits at the bottom, whole and not cropped', async ({ page }) => {
      await page.goto('/links-pattern')
      const section = page.locator('section[data-tone]').first()
      const sectionBox = await section.boundingBox()
      const picture = layer(page).locator('img')
      await expect(picture).toHaveCount(1)
      const box = await picture.boundingBox()
      expect(box?.width).toBe(160)
      expect(box?.height).toBe(120)
      // Bottom + Centre: its bottom edge is the section's, and it is centred.
      expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(
        Math.round((sectionBox?.y ?? 0) + (sectionBox?.height ?? 0)),
      )
      expect(Math.round((box?.x ?? 0) + 80)).toBe(Math.round((sectionBox?.x ?? 0) + width / 2))
      await expect(layer(page).locator('[data-section-image]')).toHaveCSS('opacity', '0.3')
    })

    for (const slug of ['links-photo', 'links-pattern', 'links-tiled']) {
      test(`${slug} has no WCAG 2.2 AA violations`, async ({ page }) => {
        await page.goto(`/${slug}`)
        const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
        expect(violations.map(({ id }) => id)).toEqual([])
      })
    }
  })
}

test('a tiled pattern repeats as a CSS background and strength is exact', async ({ page }) => {
  await page.goto('/links-tiled')
  const tile = layer(page).locator('[data-section-tile="both"]')
  await expect(tile).toHaveCSS('background-repeat', 'repeat')
  await expect(layer(page).locator('[data-section-image]')).toHaveCSS('opacity', '0.2')
  await expect(layer(page).locator('img')).toHaveCount(0)
})

test('stays put on large screens only, and not for reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/links-tiled')
  const image = layer(page).locator('[data-image-fixed]')
  await expect(image).toHaveCSS('position', 'fixed')
  await expect(layer(page)).toHaveCSS('clip-path', 'inset(0px)')

  await page.setViewportSize({ width: 375, height: 800 })
  await expect(image).toHaveCSS('position', 'absolute')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(image).toHaveCSS('position', 'absolute')
})

test('the picture adds no layout shift and stays decorative', async ({ page }) => {
  await page.goto('/links-pattern')
  await expect(layer(page)).toHaveAttribute('aria-hidden', 'true')
  await expect(layer(page).locator('img')).toHaveAttribute('alt', '')
})
