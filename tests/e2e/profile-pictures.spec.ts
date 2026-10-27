import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * Small profile pictures beyond the Link list (README, "Image design"): the testimonial avatars and
 * the Team list's portraits, in the section gallery. Without a design they draw as they always did;
 * a ring grows the picture's box by the ring and its gap, never the picture; an Image design on a
 * Team list takes precedence over Portraits.
 */

const GALLERY = '/section-gallery'
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#6366f1"/></svg>`,
    }),
  )
  await page.goto(GALLERY)
})

const gallery = (page: Page, id: string) => page.locator(`[data-gallery-section="${id}"]`)
const size = async (locator: Locator) => {
  const box = await locator.boundingBox()
  return { width: Math.round(box?.width ?? 0), height: Math.round(box?.height ?? 0) }
}

test.describe('testimonial avatars', () => {
  test('keep the original 48px round avatar without a design', async ({ page }) => {
    const avatar = gallery(page, 'testimonials').locator('figcaption img').first()
    expect(await size(avatar)).toEqual({ width: 48, height: 48 })
    await expect(gallery(page, 'testimonials').locator('[data-profile-border]')).toHaveCount(0)
    expect(await avatar.evaluate((img) => getComputedStyle(img).borderTopLeftRadius)).not.toBe(
      '0px',
    )
  })

  test('draw a Large avatar inside a ring that only adds to its box', async ({ page }) => {
    const section = gallery(page, 'testimonials-avatar-ring')
    const avatar = section.locator('figcaption img').first()
    const wrapper = section.locator('[data-profile-border="line"]').first()
    expect(await size(avatar)).toEqual({ width: 64, height: 64 })
    // Medium ring (4px) plus the small gap (3px) on each side.
    expect(await size(wrapper)).toEqual({ width: 78, height: 78 })
    await expect(wrapper.locator('.image-ring')).toHaveCount(1)
    // The name sits beside the box, vertically centred on it.
    const [box, name] = await Promise.all([
      wrapper.boundingBox(),
      section.locator('figcaption .font-semibold').first().boundingBox(),
    ])
    const middle = (b: { y: number; height: number } | null) => (b ? b.y + b.height / 2 : 0)
    expect(Math.abs(middle(box) - middle(name))).toBeLessThan(20)
  })
})

test.describe('team list portraits', () => {
  test('keep their original portrait without Portraits', async ({ page }) => {
    const list = gallery(page, 'team-list')
    await expect(list.locator('[data-profile-image]')).toHaveCount(0)
    // 96px on a phone, 128px from the small breakpoint.
    expect((await size(list.locator('img').first())).width).toBeGreaterThanOrEqual(96)
  })

  test('draw a circle inside a ring', async ({ page }) => {
    const section = gallery(page, 'team-list-portrait-ring')
    const wrapper = section.locator('[data-profile-image="circle"]').first()
    await expect(wrapper).toHaveAttribute('data-profile-border', 'line')
    const picture = wrapper.locator('img')
    const inner = await size(picture)
    expect(inner.width).toBeGreaterThanOrEqual(96)
    expect(inner.width).toBe(inner.height)
    // The 4px ring and 3px gap are added around the picture on every side.
    expect(await size(wrapper)).toEqual({ width: inner.width + 14, height: inner.height + 14 })
    expect(await picture.evaluate((img) => getComputedStyle(img).borderTopLeftRadius)).not.toBe(
      '0px',
    )
  })

  test('use Image design, not Portraits, when both are stored', async ({ page }) => {
    const section = gallery(page, 'team-list-image-design')
    await expect(section.locator('[data-profile-image]')).toHaveCount(0)
    await expect(section.locator('img')).toHaveCount(1)
  })
})

test('the profile picture cases have no accessibility violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .include('[data-gallery-section="testimonials-avatar-ring"]')
    .include('[data-gallery-section="team-list-portrait-ring"]')
    .include('[data-gallery-section="team-list-image-design"]')
    .withTags(WCAG)
    .analyze()
  expect(results.violations).toEqual([])
})
