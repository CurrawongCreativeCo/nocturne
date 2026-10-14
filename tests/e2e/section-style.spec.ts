import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { galleryIds } from './fixtures/dataset.mjs'

/**
 * Shared section Design options (README, "Section style"): tone, spacing, anchor and motion, set on
 * the gallery's styled sections and on the `style-motion` fixture page.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const TONES = ['surface', 'alt', 'inverse', 'accent'] as const
const GALLERY = '/section-gallery'

/** Stands in for every Sanity CDN image, so nothing depends on the network. */
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

/** The value a CSS variable resolves to on an element. */
const variable = (page: Page, selector: string, name: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element, property) => getComputedStyle(element).getPropertyValue(property), name)

test.describe('tones', () => {
  test('the gallery shows every tone and spacing on at least two sections', () => {
    for (const id of ['features-grid-style', 'media-text-style']) {
      for (const tone of TONES) expect(galleryIds).toContain(`${id}-${tone}`)
      for (const spacing of ['compact', 'spacious'])
        expect(galleryIds).toContain(`${id}-${spacing}`)
    }
  })

  for (const id of ['features-grid-style', 'media-text-style']) {
    for (const tone of TONES) {
      test(`${id} in the ${tone} tone has no WCAG 2.2 AA violations`, async ({ page }) => {
        await page.goto(GALLERY)
        const section = `[data-gallery-section="${id}-${tone}"]`
        await expect(page.locator(`${section} section`)).toHaveAttribute('data-tone', tone)

        const { violations } = await new AxeBuilder({ page })
          .include(section)
          .withTags(WCAG)
          .analyze()
        expect(
          violations.map(
            ({ id: rule, nodes }) => `${rule}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`,
          ),
        ).toEqual([])
      })
    }
  }

  test('dark tones recolour the text and switch the focus outline to the light ink', async ({
    page,
  }) => {
    await page.goto(GALLERY)
    const root = (name: string) => variable(page, 'html', name)
    const inkInverse = await root('--color-ink-inverse')
    const focus = await root('--color-focus')

    for (const tone of ['inverse', 'accent']) {
      const section = `section[data-tone="${tone}"][id="features-grid-style-${tone}"]`
      expect(await variable(page, section, '--color-ink')).not.toBe(await root('--color-ink'))
      expect(await variable(page, section, '--color-focus')).toBe(inkInverse)
    }
    for (const tone of ['surface', 'alt']) {
      const section = `section[data-tone="${tone}"][id="features-grid-style-${tone}"]`
      expect(await variable(page, section, '--color-ink')).toBe(await root('--color-ink'))
      expect(await variable(page, section, '--color-focus')).toBe(focus)
    }
    await expect(page.locator('#features-grid-style-alt')).not.toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    )
    await expect(page.locator('#features-grid-style-surface')).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    )
  })

  test('spacing changes the space above and below', async ({ page }) => {
    await page.goto(GALLERY)
    const padding = (id: string) =>
      page.locator(`#${id}`).evaluate((element) => parseFloat(getComputedStyle(element).paddingTop))
    // Both anchors are on tone variants; spacing variants have none, so find them by their gallery id.
    const byGallery = (id: string) =>
      page
        .locator(`[data-gallery-section="${id}"] section`)
        .evaluate((element) => parseFloat(getComputedStyle(element).paddingTop))
    const compact = await byGallery('features-grid-style-compact')
    const normal = await padding('features-grid-style-surface')
    const spacious = await byGallery('features-grid-style-spacious')
    expect(compact).toBeLessThan(normal)
    expect(normal).toBeLessThan(spacious)
  })

  test('narrow width and centring apply', async ({ page }) => {
    await page.goto(GALLERY)
    const section = page.locator('[data-gallery-section="rich-text-style-narrow"] section')
    const container = section.locator('> div')
    await expect(container).toHaveCSS('max-width', '672px')
    await expect(container).toHaveCSS('text-align', 'center')
  })
})

test.describe('anchors', () => {
  test('use the anchor as the section id', async ({ page }) => {
    await page.goto('/style-motion')
    for (const id of ['first', 'reveal', 'stagger']) {
      await expect(page.locator(`section#${id}`)).toHaveCount(1)
    }
    await page.goto('/style-motion#stagger')
    await expect(page.locator('section#stagger')).toBeInViewport()
  })

  test('are unique on the page', async ({ page }) => {
    await page.goto('/style-motion')
    const ids = await page.locator('section[id]').evaluateAll((s) => s.map((e) => e.id))
    expect(new Set(ids).size).toBe(ids.length)
  })
})

test.describe('motion', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('reveals and staggers sections, but never the first one', async ({ page }) => {
    await page.goto('/style-motion')
    await expect(page.locator('section#first [data-reveal]')).toHaveCount(0)
    await expect(page.locator('section#reveal > [data-reveal]')).toHaveCount(1)
    // The container plus one wrapper per direct child (heading block and list).
    await expect(page.locator('section#stagger [data-reveal]')).toHaveCount(3)
    // Parallax is static until its own task.
    await expect(page.locator('section[data-tone="inverse"] [data-reveal]')).toHaveCount(0)

    await page.locator('section#stagger').scrollIntoViewIfNeeded()
    for (const element of await page.locator('section#stagger [data-reveal]').all()) {
      await expect(element).toHaveCSS('opacity', '1')
    }
  })

  test('has no WCAG 2.2 AA violations once revealed', async ({ page }) => {
    await page.goto('/style-motion')
    for (const id of ['reveal', 'stagger']) {
      await page.locator(`section#${id}`).scrollIntoViewIfNeeded()
    }
    await expect(page.locator('section#stagger [data-reveal]').last()).toHaveCSS('opacity', '1')
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(violations.map(({ id }) => id)).toEqual([])
  })
})

test.describe('reduced motion and no JavaScript', () => {
  test('show the final state at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/style-motion')
    for (const element of await page.locator('[data-reveal]').all()) {
      await expect(element).toHaveCSS('opacity', '1')
      await expect(element).toHaveCSS('transform', 'none')
    }
  })

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false, reducedMotion: 'no-preference' })

    test('keeps every section readable', async ({ page }) => {
      await page.goto('/style-motion')
      for (const element of await page.locator('[data-reveal]').all()) {
        await expect(element).toHaveCSS('opacity', '1')
      }
      await expect(page.getByText('Fades up once in view.')).toBeVisible()
    })
  })
})
