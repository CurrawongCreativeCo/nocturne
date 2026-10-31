import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

import { galleryIds } from './fixtures/dataset.mjs'
import { test } from './fixtures/test'

/**
 * Image + text, section contract v2 (README, "Image + text"): the four looks, the media slot (a picture
 * or a video) and the supporting block each pass axe at every width without overflowing and sit where
 * the layout says. Sections saved before the media slot (`image`) are the older gallery entries, and
 * their baselines are unchanged.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const GALLERY = '/section-gallery'
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#6366f1"/></svg>`

const IDS = [
  'media-text-media-left',
  'media-text-stacked',
  'media-text-overlay',
  'media-text-supporting-video',
  'media-text-media-video',
]
const LEGACY = ['media-text-image-left', 'media-text-image-right', 'media-text-no-image']

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

const section = (page: Page, id: string) => page.locator(`[data-gallery-section="${id}"]`)

test('the gallery has every look, and the older entries that use the image field', () => {
  for (const id of [...IDS, ...LEGACY]) expect(galleryIds).toContain(id)
})

for (const id of IDS) {
  test(`${id} has no WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(GALLERY)
    const { violations } = await new AxeBuilder({ page })
      .include(`[data-gallery-section="${id}"]`)
      .withTags(WCAG)
      .analyze()
    expect(
      violations.map(
        ({ id: rule, nodes }) => `${rule}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`,
      ),
    ).toEqual([])
  })

  test(`${id} fits at phone, tablet and desktop widths`, async ({ page }) => {
    await page.goto(GALLERY)
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      const wide = await section(page, id).evaluate((element) => {
        const frame = element.getBoundingClientRect()
        return [...element.querySelectorAll('*')].some(
          (child) => child.getBoundingClientRect().right > frame.right + 0.5,
        )
      })
      expect(wide, `${id} at ${width}px`).toBe(false)
    }
  })
}

test.describe('layout', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  const box = async (page: Page, id: string, selector: string) => {
    const found = await section(page, id).locator(selector).first().boundingBox()
    if (!found) throw new Error(`${selector} has no box in ${id}`)
    return found
  }

  test('media left puts the picture before the text on a wide screen', async ({ page }) => {
    await page.goto(GALLERY)
    const picture = await box(page, 'media-text-media-left', 'img')
    const heading = await box(page, 'media-text-media-left', 'h2')
    expect(picture.x + picture.width).toBeLessThanOrEqual(heading.x + 1)
  })

  test('stacked puts the picture above the text', async ({ page }) => {
    await page.goto(GALLERY)
    const picture = await box(page, 'media-text-stacked', 'img')
    const heading = await box(page, 'media-text-stacked', 'h2')
    expect(picture.y + picture.height).toBeLessThanOrEqual(heading.y + 1)
  })

  test('text over media draws the picture behind the text, keeping the heading first in the source', async ({
    page,
  }) => {
    await page.goto(GALLERY)
    const picture = await box(page, 'media-text-overlay', 'img')
    const heading = await box(page, 'media-text-overlay', 'h2')
    expect(heading.x).toBeGreaterThanOrEqual(picture.x)
    expect(heading.y).toBeGreaterThanOrEqual(picture.y)
    expect(heading.y + heading.height).toBeLessThanOrEqual(picture.y + picture.height)
  })

  test('the supporting video sits under the picture and plays only after a click', async ({
    page,
  }) => {
    await page.goto(GALLERY)
    const id = 'media-text-supporting-video'
    const picture = await box(page, id, 'img')
    const video = await box(page, id, '[data-slot-video]')
    expect(video.y).toBeGreaterThanOrEqual(picture.y + picture.height)
    await expect(section(page, id).locator('iframe')).toHaveCount(0)
    await expect(section(page, id).getByRole('button', { name: /play video/i })).toBeVisible()
  })

  test('a video as the media is in the server HTML as a button, not a player', async ({
    request,
  }) => {
    const html = await (await request.get(GALLERY)).text()
    const start = html.indexOf('data-gallery-section="media-text-media-video"')
    const next = html.indexOf('data-gallery-section=', start + 1)
    const sectionHtml = html.slice(start, next)
    expect(sectionHtml).toContain('data-slot-video')
    expect(sectionHtml).not.toContain('<iframe')
  })
})
