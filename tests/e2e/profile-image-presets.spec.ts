import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * Small portraits drawn by ProfileImage (README, "Image design"): the testimonials' avatar and the Team
 * list's portrait, at each size and ring, in the section gallery. Run at a phone and a desktop width, and
 * on the light and the inverse tone. Grid and Slider portraits stay on FramedImage; a list with a saved
 * Image design keeps it; values the site does not know fall back to Medium with no ring.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SIZES = [
  { name: 'a phone', width: 390, height: 800, team: { small: 64, medium: 96, large: 128 } },
  { name: 'a desktop', width: 1280, height: 900, team: { small: 96, medium: 128, large: 160 } },
]
const AVATAR = { small: 40, medium: 48, large: 64 }

const section = (page: Page, id: string) => page.locator(`[data-gallery-section="${id}"]`)
const width = async (locator: Locator) => Math.round((await locator.boundingBox())?.width ?? 0)

for (const viewport of SIZES) {
  test.describe(`on ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })
    test.beforeEach(async ({ page }) => {
      await page.goto('/section-gallery')
    })

    test('a testimonial avatar is a 48 px circle with no ring until a size or ring is chosen', async ({
      page,
    }) => {
      const avatars = section(page, 'testimonials').locator('[data-profile-image="circle"]')
      await expect(avatars).toHaveCount(2)
      expect(await width(avatars.first())).toBe(AVATAR.medium)
      await expect(section(page, 'testimonials').locator('.image-ring')).toHaveCount(0)
    })

    test('testimonial avatars follow Small and Large', async ({ page }) => {
      for (const size of ['small', 'large'] as const) {
        const avatar = section(page, `testimonials-avatar-${size}`).locator('[data-profile-image]')
        expect(await width(avatar.first())).toBe(AVATAR[size])
      }
    })

    test('testimonial rings are decoration: solid, gradient, and on the inverse tone', async ({
      page,
    }) => {
      for (const [id, kind] of [
        ['ring-line', 'line'],
        ['ring-gradient', 'gradient'],
        ['ring-inverse', 'line'],
      ] as const) {
        const avatars = section(page, `testimonials-avatar-${id}`).locator(
          `[data-profile-border="${kind}"]`,
        )
        await expect(avatars).toHaveCount(2)
        // The ring is one layer hidden from assistive technology, and never a tab stop.
        const ring = avatars.first().locator('.image-ring')
        await expect(ring).toHaveAttribute('aria-hidden', 'true')
        await expect(ring).toBeVisible()
      }
    })

    test('values the site does not know fall back to Medium with no ring', async ({ page }) => {
      const avatars = section(page, 'testimonials-avatar-malformed').locator(
        '[data-profile-image="circle"]',
      )
      expect(await width(avatars.first())).toBe(AVATAR.medium)
      await expect(
        section(page, 'testimonials-avatar-malformed').locator('.image-ring'),
      ).toHaveCount(0)
      const portraits = section(page, 'team-list-portrait-malformed').locator(
        '[data-profile-image="rounded"]',
      )
      expect(await width(portraits.first())).toBe(viewport.team.medium)
      await expect(
        section(page, 'team-list-portrait-malformed').locator('.image-ring'),
      ).toHaveCount(0)
    })

    test('a new team list draws its portraits with ProfileImage, at the size it always had', async ({
      page,
    }) => {
      const list = section(page, 'team-list')
      const portraits = list.locator('[data-profile-image="rounded"]')
      await expect(portraits).toHaveCount(4)
      await expect(list.locator('[data-framed-image]')).toHaveCount(0)
      expect(await width(portraits.first())).toBe(viewport.team.medium)
      await expect(list.locator('.image-ring')).toHaveCount(0)
    })

    test('team list portraits follow Small, Large and the ring', async ({ page }) => {
      expect(
        await width(
          section(page, 'team-list-portrait-small').locator('[data-profile-image]').first(),
        ),
      ).toBe(viewport.team.small)
      const ringed = section(page, 'team-list-portrait-large-ring').locator(
        '[data-profile-border="line"]',
      )
      await expect(ringed).toHaveCount(2)
      await expect(
        section(page, 'team-list-portrait-gradient').locator('[data-profile-border="gradient"]'),
      ).toHaveCount(2)
      // The ring adds its width and gap around the picture; the picture itself is the size chosen.
      const picture = ringed.first().locator('img')
      expect(await width(picture)).toBe(viewport.team.large)
    })

    test('a team list with a saved Image design keeps drawing with it', async ({ page }) => {
      const list = section(page, 'team-list-legacy-image-design')
      await expect(list.locator('[data-profile-image]')).toHaveCount(0)
      await expect(list.locator('.image-ring')).toHaveCount(0)
      const picture = list.locator('li img').first()
      await expect(picture).toHaveClass(/rounded-full/)
      expect(await width(picture)).toBe(viewport.team.medium)
    })

    test('team grid and slider stay on FramedImage', async ({ page }) => {
      for (const id of ['team-grid', 'team-grid-circle', 'team-slider']) {
        await expect(section(page, id).locator('[data-profile-image]')).toHaveCount(0)
      }
    })

    test('every new state passes axe', async ({ page }) => {
      const ids = [
        'testimonials-avatar-small',
        'testimonials-avatar-large',
        'testimonials-avatar-ring-line',
        'testimonials-avatar-ring-gradient',
        'testimonials-avatar-ring-inverse',
        'team-list-portrait-small',
        'team-list-portrait-large-ring',
        'team-list-portrait-gradient',
        'team-list-legacy-image-design',
      ]
      for (const id of ids) {
        const { violations } = await new AxeBuilder({ page })
          .include(`[data-gallery-section="${id}"]`)
          .withTags(WCAG)
          .analyze()
        expect(violations, id).toEqual([])
      }
    })
  })
}

test('the keyboard moves from one team member to the next; the portrait and ring take no tab stop', async ({
  page,
}) => {
  await page.goto('/section-gallery')
  const links = section(page, 'team-list-portrait-large-ring').getByRole('link')
  await expect(links).toHaveCount(2)
  await links.first().focus()
  await expect(links.first()).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(links.nth(1)).toBeFocused()
})
