import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * Small portraits drawn by ProfileImage (README, "Image design"): the testimonials' avatar and the Team
 * list's portrait, at each size and ring. The customised states are on /profile-images (a page of their
 * own, so the section gallery and its baselines are untouched); the defaults are the gallery's. Run at a
 * phone and a desktop width, and on the light and the inverse tone. Grid and Slider portraits stay on FramedImage; a list with a saved
 * Image design keeps it; values the site does not know fall back to Medium with no ring.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SIZES = [
  { name: 'a phone', width: 390, height: 800, team: { small: 64, medium: 96, large: 128 } },
  { name: 'a desktop', width: 1280, height: 900, team: { small: 96, medium: 128, large: 160 } },
]
const AVATAR = { small: 40, medium: 48, large: 64 }

const PAGE = '/profile-images'
const gallery = (page: Page, id: string) => page.locator(`[data-gallery-section="${id}"]`)
const titled = (page: Page, title: string) =>
  page.locator('section', {
    has: page.getByRole('heading', { level: 2, name: title, exact: true }),
  })
const avatars = (page: Page, id: string) => titled(page, `Avatars: ${id}`)
const portraits = (page: Page, id: string) => titled(page, `Team list: ${id}`)
const width = async (locator: Locator) => Math.round((await locator.boundingBox())?.width ?? 0)

for (const viewport of SIZES) {
  test.describe(`on ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })
    test('a testimonial avatar is a 48 px circle with no ring until a size or ring is chosen', async ({
      page,
    }) => {
      await page.goto('/section-gallery')
      const section = gallery(page, 'testimonials')
      const circles = section.locator('[data-profile-image="circle"]')
      await expect(circles).toHaveCount(2)
      expect(await width(circles.first())).toBe(AVATAR.medium)
      await expect(section.locator('.image-ring')).toHaveCount(0)
    })

    test('testimonial avatars follow Small and Large', async ({ page }) => {
      await page.goto(PAGE)
      for (const size of ['small', 'large'] as const) {
        const avatar = avatars(page, size).locator('[data-profile-image]')
        expect(await width(avatar.first())).toBe(AVATAR[size])
      }
    })

    test('testimonial rings are decoration: solid, gradient, and on the inverse tone', async ({
      page,
    }) => {
      await page.goto(PAGE)
      for (const [id, kind] of [
        ['ring-line', 'line'],
        ['ring-gradient', 'gradient'],
        ['ring-inverse', 'line'],
      ] as const) {
        const ringed = avatars(page, id).locator(`[data-profile-border="${kind}"]`)
        await expect(ringed).toHaveCount(2)
        // The ring is one layer hidden from assistive technology, and never a tab stop.
        const ring = ringed.first().locator('.image-ring')
        await expect(ring).toHaveAttribute('aria-hidden', 'true')
        await expect(ring).toBeVisible()
      }
    })

    test('values the site does not know fall back to Medium with no ring', async ({ page }) => {
      await page.goto(PAGE)
      const circles = avatars(page, 'malformed').locator('[data-profile-image="circle"]')
      expect(await width(circles.first())).toBe(AVATAR.medium)
      await expect(avatars(page, 'malformed').locator('.image-ring')).toHaveCount(0)
      const squares = portraits(page, 'portrait-malformed').locator(
        '[data-profile-image="rounded"]',
      )
      expect(await width(squares.first())).toBe(viewport.team.medium)
      await expect(portraits(page, 'portrait-malformed').locator('.image-ring')).toHaveCount(0)
    })

    test('a new team list draws its portraits with ProfileImage, at the size it always had', async ({
      page,
    }) => {
      await page.goto('/section-gallery')
      const list = gallery(page, 'team-list')
      const pictures = list.locator('[data-profile-image="rounded"]')
      await expect(pictures).toHaveCount(4)
      await expect(list.locator('[data-framed-image]')).toHaveCount(0)
      expect(await width(pictures.first())).toBe(viewport.team.medium)
      await expect(list.locator('.image-ring')).toHaveCount(0)
    })

    test('team list portraits follow Small, Large and the ring', async ({ page }) => {
      await page.goto(PAGE)
      expect(
        await width(portraits(page, 'portrait-small').locator('[data-profile-image]').first()),
      ).toBe(viewport.team.small)
      const ringed = portraits(page, 'portrait-large-ring').locator('[data-profile-border="line"]')
      await expect(ringed).toHaveCount(2)
      await expect(
        portraits(page, 'portrait-gradient').locator('[data-profile-border="gradient"]'),
      ).toHaveCount(2)
      // The ring adds its width and gap around the picture; the picture itself is the size chosen.
      const picture = ringed.first().locator('img')
      expect(await width(picture)).toBe(viewport.team.large)
    })

    test('a team list with a saved Image design keeps drawing with it', async ({ page }) => {
      await page.goto(PAGE)
      const list = portraits(page, 'legacy-image-design')
      await expect(list.locator('[data-profile-image]')).toHaveCount(0)
      await expect(list.locator('.image-ring')).toHaveCount(0)
      const picture = list.locator('li img').first()
      await expect(picture).toHaveClass(/rounded-full/)
      expect(await width(picture)).toBe(viewport.team.medium)
    })

    test('team grid and slider stay on FramedImage', async ({ page }) => {
      await page.goto('/section-gallery')
      for (const id of ['team-grid', 'team-grid-circle', 'team-slider']) {
        await expect(gallery(page, id).locator('[data-profile-image]')).toHaveCount(0)
      }
    })

    test('every new state passes axe', async ({ page }) => {
      await page.goto(PAGE)
      // The whole page: every size, ring, tone and the legacy list are on it.
      const { violations } = await new AxeBuilder({ page }).include('main').withTags(WCAG).analyze()
      expect(violations).toEqual([])
    })
  })
}

test('the keyboard moves from one team member to the next; the portrait and ring take no tab stop', async ({
  page,
}) => {
  await page.goto(PAGE)
  const links = portraits(page, 'portrait-large-ring').getByRole('link')
  await expect(links).toHaveCount(2)
  await links.first().focus()
  await expect(links.first()).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(links.nth(1)).toBeFocused()
})
