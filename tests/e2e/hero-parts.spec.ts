import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test'

import { galleryIds } from './fixtures/dataset.mjs'

/**
 * Animated hero parts (README, "Animating individual parts") on two real pages: /hero-parts, whose
 * hero is the first section with a different animation on every part, and /hero-parts-later, whose
 * hero sits below a text section. The resolver's arithmetic is unit-tested (part-motion.test.ts); this
 * checks what the browser does, and that the LCP candidates never wait for JavaScript.
 */

const FIRST = '/hero-parts'
const LATER = '/hero-parts-later'
const GALLERY = '/section-gallery'
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`
const GALLERY_ENTRIES = [
  'hero-parts-overlay',
  'hero-parts-ignored',
  'hero-parts-split',
  'hero-parts-split-circle',
  'hero-parts-split-parallax',
  'hero-parts-editorial',
  'hero-parts-full-bleed',
]

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

/** The element that plays a part's animation: the closest Motion wrapper around what it holds. */
const wrapper = (inner: Locator) => inner.locator('xpath=ancestor-or-self::*[@data-reveal][1]')

const heading = (page: Page) => page.getByRole('heading', { level: 1 })
const eyebrow = (page: Page) => page.getByText('Eyebrow', { exact: true })
const description = (page: Page) => page.getByText('Each part plays its own animation.')
const buttons = (page: Page) => page.getByRole('link', { name: 'About us' })

/** The computed state of the element that plays a part's animation (or of the part itself, if nothing wraps it). */
const state = (element: Locator) =>
  element.evaluate((part) => {
    const node = part.closest('[data-reveal]') ?? part
    const style = getComputedStyle(node)
    const matrix = new DOMMatrix(style.transform)
    return {
      opacity: Number(style.opacity),
      clipPath: style.clipPath,
      x: matrix.m41,
      y: matrix.m42,
      scale: matrix.a,
    }
  })

/** The hero's <section>: the first one with a tone (the announcement bar above it has none). */
const heroSection = (html: string) => {
  const start = html.lastIndexOf('<section', html.indexOf('data-tone'))
  return html.slice(start, html.indexOf('</section>', start))
}

test('the gallery has an entry for every layout with animated parts', () => {
  for (const id of GALLERY_ENTRIES) expect(galleryIds).toContain(id)
})

test.describe('the first section', () => {
  test('ships its heading and picture whole in the server HTML, and only the rest hidden', async ({
    request,
  }) => {
    const section = heroSection(await (await request.get(FIRST)).text())

    // The heading slides (it only moves), so it is wrapped and starts at full opacity.
    const wrapped = /<div[^>]*data-reveal[^>]*>\s*<h1[^>]*>Hero with animated parts<\/h1>/.exec(
      section,
    )
    expect(wrapped?.[0]).toMatch(/opacity:\s*1/)
    expect(wrapped?.[0]).not.toMatch(/opacity:\s*0|clip-path/)
    expect(section).not.toMatch(/<h1[^>]*style=/)

    // The background picture rises, from full opacity too.
    const picture = /<div[^>]*data-reveal[^>]*>\s*<img[^>]*data-nimg/.exec(section)
    expect(picture?.[0]).toMatch(/opacity:\s*1/)
    expect(picture?.[0]).not.toMatch(/opacity:\s*0|clip-path/)
    expect(section).not.toContain('loading="lazy"')

    // The eyebrow, which is not an LCP candidate, is wiped in from nothing.
    expect(section).toMatch(
      /<span[^>]*data-reveal[^>]*style="clip-path:inset\(-10% 100% -10% -5%\)"[^>]*>Eyebrow<\/span>/,
    )
    // The intro fades in: it starts hidden, as it always has.
    expect(section).toMatch(/<p[^>]*data-reveal[^>]*opacity:\s*0[^>]*>Each part plays/)
  })

  test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('each part ends whole and in place', async ({ page }) => {
      await page.goto(FIRST)
      await expect(heading(page)).toBeVisible()
      for (const part of [description(page), buttons(page)]) {
        await expect(wrapper(part)).toHaveCSS('opacity', '1', { timeout: 5000 })
        await expect(wrapper(part)).toHaveCSS('transform', 'none')
      }
      await expect(wrapper(heading(page))).toHaveCSS('transform', 'none', { timeout: 5000 })
      await expect(wrapper(heading(page))).toHaveCSS('opacity', '1')
      // The eyebrow's wipe settles with nothing clipped away (the browser writes the inset in short form).
      await expect
        .poll(async () => (await state(eyebrow(page))).clipPath, { timeout: 5000 })
        .toBe('inset(-10% -5%)')
    })

    test('the long delay starts the buttons after the intro', async ({ page }) => {
      await page.goto(FIRST)
      const started = await page.evaluate(
        () =>
          new Promise<number[]>((resolve) => {
            const times: number[] = []
            const find = (text: string) =>
              [...document.querySelectorAll('[data-reveal]')].find((node) =>
                node.textContent.includes(text),
              )
            const intro = find('Each part plays')
            const cta = find('About us')
            const t0 = performance.now()
            const tick = () => {
              const now = performance.now() - t0
              if (intro && times[0] === undefined && Number(getComputedStyle(intro).opacity) > 0.05)
                times[0] = now
              if (cta && times[1] === undefined && Number(getComputedStyle(cta).opacity) > 0.05)
                times[1] = now
              if ((times[0] !== undefined && times[1] !== undefined) || now > 3000) resolve(times)
              else requestAnimationFrame(tick)
            }
            tick()
          }),
      )
      expect(started[0]).toBeDefined()
      expect(started[1]).toBeDefined()
      expect(started[1] ?? 0).toBeGreaterThan(started[0] ?? 0)
    })

    test('has no WCAG 2.2 AA violations once everything has played', async ({ page }) => {
      await page.goto(FIRST)
      await expect(wrapper(buttons(page))).toHaveCSS('opacity', '1', { timeout: 5000 })
      await expect(page.locator('h1')).toHaveCount(1)
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
      expect(violations.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([])
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('shows every part at once, whole and in place', async ({ page }) => {
      await page.goto(FIRST)
      for (const part of [heading(page), description(page), buttons(page), eyebrow(page)]) {
        expect(await state(part)).toMatchObject({ opacity: 1, clipPath: 'none', x: 0, y: 0 })
      }
      const picture = await state(page.locator('section img').first())
      expect(picture).toMatchObject({ opacity: 1, clipPath: 'none', y: 0, scale: 1 })
    })
  })

  test.describe('no JavaScript', () => {
    test.use({ javaScriptEnabled: false })

    test('shows every part, whole', async ({ page }) => {
      await page.goto(FIRST)
      await expect(heading(page)).toBeVisible()
      expect(await state(heading(page))).toMatchObject({ opacity: 1, clipPath: 'none', x: 0 })
      expect(await state(eyebrow(page))).toMatchObject({ opacity: 1, clipPath: 'none' })
      await expect(description(page)).toBeVisible()
      await expect(buttons(page)).toBeVisible()
    })
  })
})

test.describe('a hero further down the page', () => {
  test('starts its heading clipped away and its picture smaller, and may do so in the HTML', async ({
    request,
  }) => {
    const html = await (await request.get(LATER)).text()
    const start = html.indexOf('A hero further down')
    expect(html.slice(Math.max(0, start - 200), start)).toContain(
      'clip-path:inset(-10% 100% -10% -5%)',
    )
    expect(html).toMatch(/<div[^>]*data-reveal[^>]*scale\(0\.95\)[^>]*>\s*<img/)
  })

  test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('wipes the heading in, then shows it and the picture whole', async ({ page }) => {
      await page.goto(LATER)
      const later = page.getByRole('heading', { level: 2, name: 'A hero further down' })
      await later.scrollIntoViewIfNeeded()
      await expect
        .poll(async () => (await state(later)).clipPath, { timeout: 5000 })
        .toBe('inset(-10% -5%)')
      expect((await state(later)).opacity).toBe(1)
      await expect(wrapper(page.locator('section img').first())).toHaveCSS('transform', 'none', {
        timeout: 5000,
      })
    })

    test('has no WCAG 2.2 AA violations', async ({ page }) => {
      await page.goto(LATER)
      const later = page.getByRole('heading', { level: 2, name: 'A hero further down' })
      await later.scrollIntoViewIfNeeded()
      await expect
        .poll(async () => (await state(later)).clipPath, { timeout: 5000 })
        .toBe('inset(-10% -5%)')
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
      expect(violations.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([])
    })
  })
})

test.describe('in the gallery', () => {
  test.use({ reducedMotion: 'reduce' })

  const entry = async (request: APIRequestContext, id: string) => {
    const html = await (await request.get(GALLERY)).text()
    const start = html.indexOf(`data-gallery-section="${id}"`)
    const next = html.indexOf('data-gallery-section=', start + 1)
    return html.slice(start, next === -1 ? undefined : next)
  }

  for (const id of GALLERY_ENTRIES) {
    test(`${id} shows its parts at rest, with the heading in the server HTML`, async ({
      page,
      request,
    }) => {
      expect(await entry(request, id)).toMatch(/<h1[^>]*>Welcome to Test Co<\/h1>/)

      await page.goto(GALLERY)
      const section = page.locator(`[data-gallery-section="${id}"]`)
      await expect(section.getByRole('heading', { level: 1 })).toBeVisible()
      // Whatever wraps the heading shows it whole and in place.
      expect(await state(section.getByRole('heading', { level: 1 }))).toMatchObject({
        opacity: 1,
        clipPath: 'none',
        x: 0,
      })
    })
  }

  test('Fade, Reveal and Scale leave the first section’s heading and picture unwrapped', async ({
    request,
  }) => {
    const section = await entry(request, 'hero-parts-ignored')
    expect(section).not.toMatch(/data-reveal[^>]*>\s*<h1/)
    expect(section).not.toMatch(/data-reveal[^>]*>\s*<img/)
    expect(section).not.toMatch(
      /<h1[^>]*style=|<img[^>]*style="[^"]*(?:opacity|clip-path|transform)/,
    )
    // The eyebrow is not an LCP candidate, so its Fade is applied.
    expect(section).toMatch(/<span[^>]*data-reveal[^>]*opacity:\s*0[^>]*>Eyebrow<\/span>/)
  })

  test('the Split picture keeps its circle when it animates', async ({ page }) => {
    await page.goto(GALLERY)
    const picture = page.locator('[data-gallery-section="hero-parts-split-circle"] img')
    await picture.scrollIntoViewIfNeeded()
    const { width, height, radius } = await picture.evaluate((img) => {
      const { width, height } = img.getBoundingClientRect()
      return { width, height, radius: getComputedStyle(img).borderTopLeftRadius }
    })
    expect(width).toBeGreaterThan(0)
    expect(width).toBeCloseTo(height, 0)
    expect(radius).not.toBe('0px')
  })
})
