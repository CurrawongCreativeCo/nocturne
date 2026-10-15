import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { galleryIds } from './fixtures/dataset.mjs'

/**
 * Hero variants (README, "Section variants"): every layout in the section gallery passes axe, and
 * keeps its LCP candidate (the image, or the heading when there is none) in the server HTML, so it
 * paints without JavaScript.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const GALLERY = '/section-gallery'
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`

const heroIds = galleryIds.filter((id: string) => id.startsWith('hero-'))
// The first image is the LCP candidate; these layouts have one in the gallery.
const withImage = [
  'hero-overlay',
  'hero-split-right',
  'hero-split-left',
  'hero-full-bleed',
  'hero-parallax',
  'hero-full-bleed-parallax',
]

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

test('the gallery has an entry for every hero variant', () => {
  for (const id of [
    'hero-overlay',
    'hero-split-right',
    'hero-split-left',
    'hero-editorial',
    'hero-full-bleed',
  ]) {
    expect(heroIds).toContain(id)
  }
})

for (const id of heroIds) {
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

  test(`${id} renders its heading and image in the server HTML`, async ({ request }) => {
    const html = await (await request.get(GALLERY)).text()
    const start = html.indexOf(`data-gallery-section="${id}"`)
    expect(start).toBeGreaterThan(-1)
    const next = html.indexOf('data-gallery-section=', start + 1)
    const section = html.slice(start, next === -1 ? undefined : next)

    expect(section).toMatch(/<h1[^>]*>Welcome to Test Co<\/h1>/)
    // The image is in the HTML and not lazy, so the browser requests it at once. Layouts without a
    // picture (editorial, split with no image) have none to wait for.
    if (withImage.includes(id)) {
      expect(section).toMatch(/<img[^>]*data-nimg/)
      expect(section).not.toContain('loading="lazy"')
    }
    expect(section).not.toMatch(/class="[^"]*\w(?:text|font)-[\w-]+/)
  })
}
