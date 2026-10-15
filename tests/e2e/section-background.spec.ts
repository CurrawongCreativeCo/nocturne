import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { galleryIds } from './fixtures/dataset.mjs'

/**
 * Section backgrounds (README, "Section backgrounds"): a brand gradient and a picture with an
 * overlay, drawn behind the content by SectionFrame. The gallery holds one entry per case; the
 * `style-background` fixture page holds a first section and a later one.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const GALLERY = '/section-gallery'
const OVERLAYS = { none: 0, light: 0.45, medium: 0.7, strong: 0.88 } as const

/** Stands in for every Sanity CDN image, so nothing depends on the network. */
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

const backgroundIds = galleryIds.filter(
  (id: string) => id.includes('-background-') || id.includes('-gradient-'),
)

const sectionIn = (page: Page, id: string) => page.locator(`[data-gallery-section="${id}"] section`)

test.describe('the gallery', () => {
  test('has a gradient on a dark and a light tone, and a picture with every overlay', () => {
    for (const id of [
      'features-grid-gradient-inverse',
      'features-grid-gradient-surface',
      'media-text-background-surface-default',
      'media-text-background-inverse-default',
      ...Object.keys(OVERLAYS).map((overlay) => `media-text-background-${overlay}`),
    ]) {
      expect(galleryIds).toContain(id)
    }
  })

  for (const id of backgroundIds) {
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
  }

  for (const [overlay, opacity] of Object.entries(OVERLAYS)) {
    test(`the ${overlay} overlay is drawn at ${opacity}`, async ({ page }) => {
      await page.goto(GALLERY)
      const layer = sectionIn(page, `media-text-background-${overlay}`).locator(
        '[data-section-overlay]',
      )
      if (opacity === 0) {
        await expect(layer).toHaveCount(0)
      } else {
        await expect(layer).toHaveAttribute('data-section-overlay', overlay)
        expect(await layer.evaluate((el) => Number(getComputedStyle(el).opacity))).toBeCloseTo(
          opacity,
        )
      }
    })
  }

  test('an unset overlay follows the tone: Medium on dark, Light on light', async ({ page }) => {
    await page.goto(GALLERY)
    await expect(
      sectionIn(page, 'media-text-background-inverse-default').locator('[data-section-overlay]'),
    ).toHaveAttribute('data-section-overlay', 'medium')
    await expect(
      sectionIn(page, 'media-text-background-surface-default').locator('[data-section-overlay]'),
    ).toHaveAttribute('data-section-overlay', 'light')
  })

  test('the gradient is drawn from the brand gradient variable', async ({ page }) => {
    await page.goto(GALLERY)
    const layer = sectionIn(page, 'features-grid-gradient-inverse').locator(
      '[data-section-gradient]',
    )
    await expect(layer).toHaveAttribute('data-section-gradient', 'forest-dusk')
    expect(await layer.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain(
      'linear-gradient(',
    )
  })
})

test.describe('the layers', () => {
  test('sit behind the content, hidden from assistive technology, without taking space', async ({
    page,
  }) => {
    await page.goto('/style-background')
    const section = page.locator('#bg-second')
    const layers = section.locator('[data-section-background]')
    await expect(layers).toHaveAttribute('aria-hidden', 'true')
    expect(await layers.evaluate((el) => getComputedStyle(el).position)).toBe('absolute')

    const [box, frame] = await Promise.all([layers.boundingBox(), section.boundingBox()])
    expect(box).toEqual(frame)

    // The picture is decoration: empty alt text, so a screen reader skips it.
    await expect(layers.locator('img')).toHaveAttribute('alt', '')
    // The heading is above the layers, so it can be clicked.
    await section.getByRole('heading', { name: 'Picture further down' }).click({ trial: true })
  })

  test('the first section’s picture loads at once and a later one waits', async ({ page }) => {
    await page.goto('/style-background')
    await expect(page.locator('#bg-first [data-section-background] img')).not.toHaveAttribute(
      'loading',
      'lazy',
    )
    await expect(page.locator('#bg-second [data-section-background] img')).toHaveAttribute(
      'loading',
      'lazy',
    )
  })

  test('a gradient the design settings no longer define draws nothing', async ({ page }) => {
    await page.goto('/style-background')
    const layer = page.locator('#bg-removed [data-section-gradient]')
    await expect(layer).toHaveCount(1)
    expect(await layer.evaluate((el) => getComputedStyle(el).backgroundImage)).toBe('none')
  })

  test('a section with neither draws no layers', async ({ page }) => {
    await page.goto('/style-background')
    await expect(page.locator('#bg-none [data-section-background]')).toHaveCount(0)
  })

  test('the text follows the tone, not the picture', async ({ page }) => {
    await page.goto('/style-background')
    const colours = await page.evaluate(() => {
      // A custom property's value is not a computed colour, so paint it on a probe to compare.
      const resolve = (value: string) => {
        const probe = document.createElement('span')
        probe.style.color = value
        document.body.append(probe)
        const colour = getComputedStyle(probe).color
        probe.remove()
        return colour
      }
      const heading = (id: string) => {
        const element = document.querySelector(`#${id} h2`)
        if (!element) throw new Error(`No heading in #${id}`)
        return getComputedStyle(element).color
      }
      return {
        picture: heading('bg-first'),
        gradient: heading('bg-gradient'),
        light: heading('bg-second'),
        inverse: resolve('var(--color-ink-inverse)'),
        dark: resolve('var(--color-ink)'),
      }
    })
    expect(colours.picture).toBe(colours.inverse)
    expect(colours.gradient).toBe(colours.inverse)
    expect(colours.light).toBe(colours.dark)
  })

  test('are drawn by the server, so they show with JavaScript off', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    try {
      await page.route('https://cdn.sanity.io/**', (route) =>
        route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
      )
      await page.goto('/style-background')
      await expect(page.locator('#bg-gradient [data-section-gradient]')).toHaveCount(1)
      await expect(page.locator('#bg-second [data-section-background] img')).toHaveCount(1)
    } finally {
      await context.close()
    }
  })
})
