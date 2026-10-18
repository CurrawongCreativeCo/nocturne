import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { galleryIds } from './fixtures/dataset.mjs'

/**
 * The hero's supporting slot (README, "Adding a hero slot"): every slot type in every hero preset
 * passes axe at every width without overflowing, sits where the placement map says, has its content in
 * the server HTML, and joins the hero's stagger without ever hiding content.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const GALLERY = '/section-gallery'
const SLOT_PAGE = '/hero-slot'
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="160"><rect width="400" height="160" fill="#6366f1"/></svg>`

const TYPES = ['stats', 'badges', 'logos', 'launch']
const PRESETS = [
  'full-background',
  'split-right',
  'split-left',
  'centred-text',
  'editorial',
  'image-with-panel',
]
const slotIds = galleryIds.filter((id: string) => id.startsWith('hero-slot-'))

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

test('the gallery has every slot type in every hero preset', () => {
  for (const type of TYPES) {
    for (const preset of PRESETS) expect(slotIds).toContain(`hero-slot-${type}-${preset}`)
  }
  expect(slotIds).toContain('hero-slot-stats-editorial-inset')
})

const section = (page: Page, id: string) => page.locator(`[data-gallery-section="${id}"]`)

for (const id of slotIds) {
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
      const overflow = await section(page, id).evaluate((element) => {
        const slot = element.querySelector('[data-hero-slot]')
        if (!slot) return 'no slot'
        const frame = element.getBoundingClientRect()
        const box = slot.getBoundingClientRect()
        const wide = [...slot.querySelectorAll('*')].some(
          (child) => child.getBoundingClientRect().right > frame.right + 0.5,
        )
        return wide || box.right > frame.right + 0.5 ? 'overflows' : 'fits'
      })
      expect(overflow, `${id} at ${width}px`).toBe('fits')
    }
  })
}

test.describe('placement', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  const boxes = async (page: Page, id: string) => {
    await page.goto(GALLERY)
    const frame = section(page, id)
    const get = async (selector: string) => {
      // The slot can arrive a moment after load on a slow runner: wait until it is drawn.
      await expect(frame.locator(selector).first()).toBeVisible()
      const found = await frame.locator(selector).first().boundingBox()
      if (!found) throw new Error(`${selector} has no box in ${id}`)
      return found
    }
    return {
      slot: await get('[data-hero-slot]'),
      heading: await get('h1'),
      buttons: await get('a'),
    }
  }

  for (const preset of ['full-background', 'split-right', 'split-left', 'centred-text']) {
    test(`${preset} puts the slot under the buttons`, async ({ page }) => {
      const { slot, buttons } = await boxes(page, `hero-slot-stats-${preset}`)
      expect(slot.y).toBeGreaterThanOrEqual(buttons.y + buttons.height)
    })
  }

  test('image with panel puts the slot inside the panel, under the buttons', async ({ page }) => {
    const id = 'hero-slot-badges-image-with-panel'
    const { slot, buttons } = await boxes(page, id)
    expect(slot.y).toBeGreaterThanOrEqual(buttons.y + buttons.height)
    const insidePanel = await section(page, id)
      .locator('[data-hero-slot]')
      .evaluate((element) => Boolean(element.closest('[class*="bg-surface"]')))
    expect(insidePanel).toBe(true)
  })

  test('editorial puts the slot beside the text on a wide screen', async ({ page }) => {
    const { slot, heading } = await boxes(page, 'hero-slot-stats-editorial')
    expect(slot.x).toBeGreaterThanOrEqual(heading.x + heading.width)
  })

  test('editorial puts the slot under the small picture when both are there', async ({ page }) => {
    const id = 'hero-slot-stats-editorial-inset'
    const { slot } = await boxes(page, id)
    const picture = await section(page, id).locator('img').boundingBox()
    expect(picture).not.toBeNull()
    expect(slot.y).toBeGreaterThanOrEqual((picture?.y ?? 0) + (picture?.height ?? 0))
  })

  test('editorial puts the slot below the text on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    const { slot, buttons } = await boxes(page, 'hero-slot-stats-editorial')
    expect(slot.y).toBeGreaterThanOrEqual(buttons.y + buttons.height)
  })
})

test.describe('the slot types', () => {
  test('the statistics bar is formatted on the server', async ({ request }) => {
    const html = await (await request.get(GALLERY)).text()
    const start = html.indexOf('data-gallery-section="hero-slot-stats-full-background"')
    const next = html.indexOf('data-gallery-section=', start + 1)
    const sectionHtml = html.slice(start, next)
    for (const figure of ['12,500+', '4.9/5', '$1.2m']) expect(sectionHtml).toContain(figure)
  })

  test('badges are a list, with their icons hidden from screen readers', async ({ page }) => {
    await page.goto(GALLERY)
    const badges = section(page, 'hero-slot-badges-full-background').locator('[data-badge-row] li')
    await expect(badges).toHaveText(['Locally owned', 'Free delivery', 'Five-year warranty'])
    // Two have an icon, one has none: the label is never pushed aside.
    expect(await badges.locator('svg[aria-hidden="true"]').count()).toBe(2)
  })

  test('logos use the company name as alt text, in grey by default', async ({ page }) => {
    await page.goto(GALLERY)
    const logos = section(page, 'hero-slot-logos-full-background').locator('[data-logo-row] img')
    expect(await logos.count()).toBe(6)
    await expect(logos.first()).toHaveAttribute('alt', 'Acme')
    expect(await logos.first().evaluate((img) => getComputedStyle(img).filter)).toContain(
      'grayscale',
    )
  })
})

test.describe('motion', () => {
  const slot = (page: Page) => page.locator('[data-hero-slot]')

  test.describe('motion on', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('fades in with the rest of the hero and ends fully visible', async ({ page }) => {
      await page.goto(SLOT_PAGE)
      await expect(slot(page)).toBeVisible()
      await expect
        .poll(() => slot(page).evaluate((element) => getComputedStyle(element).opacity))
        .toBe('1')
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('is there at once, with no fade or movement', async ({ page }) => {
      await page.goto(SLOT_PAGE)
      const state = await slot(page).evaluate((element) => {
        const style = getComputedStyle(element)
        return { opacity: style.opacity, transform: style.transform }
      })
      expect(state.opacity).toBe('1')
      expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(state.transform)
    })
  })

  test.describe('no JavaScript', () => {
    test.use({ javaScriptEnabled: false })

    test('shows the slot and its figures', async ({ page }) => {
      await page.goto(SLOT_PAGE)
      await expect(slot(page)).toContainText('12,500+')
      expect(await slot(page).evaluate((element) => getComputedStyle(element).opacity)).toBe('1')
    })
  })

  test('the page has exactly one h1 and no violations', async ({ page }) => {
    await page.goto(SLOT_PAGE)
    await expect(page.locator('h1')).toHaveCount(1)
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(violations.map(({ id }) => id)).toEqual([])
  })
})
