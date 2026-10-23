import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { galleryIds } from './fixtures/dataset.mjs'
import { test } from './fixtures/test'

/**
 * The touch slider (README, "Slider"), driven through the testimonials section's Slider layout on
 * a real page (/slider; the gallery has no MotionProvider, so it only shows the layout). Six quotes,
 * "Person 1" to "Person 6"; which are in view depends on the width (1, 2 or 3 at a time).
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PAGE = '/slider'
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

const carousel = (page: Page) => page.getByRole('region', { name: 'Customer testimonials' })
const slides = (page: Page) => carousel(page).locator('[aria-roledescription="slide"]')
const next = (page: Page) => carousel(page).getByRole('button', { name: 'Next slide' })
const previous = (page: Page) => carousel(page).getByRole('button', { name: 'Previous slide' })

/**
 * Waits until the script has taken over: the controls exist, the track is measured and Motion's
 * features (which drag needs) have downloaded.
 */
const ready = async (page: Page) => {
  await page.goto(PAGE)
  await expect(next(page)).toBeVisible()
  await page.waitForLoadState('networkidle')
  await carousel(page).scrollIntoViewIfNeeded()
}

/** Slides a visitor can reach: not `inert`. */
const reachable = (page: Page) =>
  slides(page).evaluateAll((els) => els.filter((el) => !el.matches('[inert]')).length)

/** The clipping box, and the track inside it that moves. */
const viewport = (page: Page) => carousel(page).locator('> div').first()
const track = (page: Page) => slides(page).first().locator('..')
const trackX = (page: Page) =>
  track(page).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41)

/** Whether the slide sits inside the clipped viewport (its padding allowed for). */
const inView = async (page: Page, slide: Locator) => {
  const port = await viewport(page).boundingBox()
  const box = await slide.boundingBox()
  if (!port || !box) return false
  return box.x >= port.x - 16 && box.x + box.width <= port.x + port.width + 16
}

const firstInView = async (page: Page) => {
  const all = slides(page)
  for (let i = 0; i < (await all.count()); i++) if (await inView(page, all.nth(i))) return i + 1
  return 0
}

test('has no WCAG 2.2 AA violations', async ({ page }) => {
  await ready(page)
  const { violations } = await new AxeBuilder({ page }).include('main').withTags(WCAG).analyze()
  expect(violations.map(({ id }) => id)).toEqual([])
})

test('the gallery has the slider layouts, and they pass axe', async ({ page }) => {
  expect(galleryIds).toEqual(
    expect.arrayContaining(['testimonials-slider', 'testimonials-slider-inverse']),
  )
  await page.goto('/section-gallery')
  for (const id of ['testimonials-slider', 'testimonials-slider-inverse']) {
    const { violations } = await new AxeBuilder({ page })
      .include(`[data-gallery-section="${id}"]`)
      .withTags(WCAG)
      .analyze()
    expect(violations.map(({ id: rule }) => rule)).toEqual([])
  }
})

test('names the carousel and each slide', async ({ page }) => {
  await ready(page)
  await expect(carousel(page)).toHaveAttribute('aria-roledescription', 'carousel')
  await expect(slides(page)).toHaveCount(6)
  await expect(slides(page).first()).toHaveAttribute('role', 'group')
  await expect(slides(page).first()).toHaveAttribute('aria-label', '1 of 6')
  await expect(slides(page).last()).toHaveAttribute('aria-label', '6 of 6')
})

test('Previous and Next step through the slides, disabled at the ends', async ({ page }) => {
  await ready(page)
  await expect(previous(page)).toBeDisabled()
  await expect(next(page)).toBeEnabled()
  expect(await firstInView(page)).toBe(1)

  await next(page).click()
  await expect.poll(() => firstInView(page)).toBe(2)
  await expect(previous(page)).toBeEnabled()
  await previous(page).click()
  await expect.poll(() => firstInView(page)).toBe(1)

  // Keep going to the last stop.
  while (await next(page).isEnabled()) await next(page).click()
  await expect(next(page)).toBeDisabled()
  await expect.poll(() => inView(page, slides(page).last())).toBe(true)
})

test('pagination buttons jump to a slide', async ({ page }) => {
  await ready(page)
  const dots = carousel(page).getByRole('button', { name: /^Go to slide \d$/ })
  expect(await dots.count()).toBeGreaterThan(1)
  await expect(dots.first()).toHaveAttribute('aria-current', 'true')
  await dots.nth(1).click()
  await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true')
  await expect.poll(() => firstInView(page)).toBe(2)
})

test('the arrow keys work while focus is inside, and announce the slide politely', async ({
  page,
}) => {
  await ready(page)
  await next(page).focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => firstInView(page)).toBe(2)
  await expect(carousel(page).locator('[aria-live="polite"]')).toHaveText('Slide 2 of 6')
  await page.keyboard.press('ArrowLeft')
  await expect.poll(() => firstInView(page)).toBe(1)
  await expect(carousel(page).locator('[aria-live="polite"]')).toHaveText('Slide 1 of 6')
})

test('arrow keys do nothing outside the slider', async ({ page }) => {
  await ready(page)
  await page.locator('main h1').click()
  await page.keyboard.press('ArrowRight')
  expect(await firstInView(page)).toBe(1)
})

test('slides out of view are inert, so Tab never lands on them', async ({ page }) => {
  await ready(page)
  const visible = await reachable(page)
  expect(visible).toBeLessThan(6)
  expect(visible).toBeGreaterThanOrEqual(1)
  await next(page).click()
  await expect.poll(() => reachable(page)).toBe(visible)
  // The first slide is hidden from assistive technology now, the second is not.
  await expect(slides(page).first()).toHaveAttribute('inert', '')
  await expect(slides(page).nth(1)).not.toHaveAttribute('inert', '')
})

test('the track keeps vertical panning for phones', async ({ page }) => {
  await ready(page)
  expect(await track(page).evaluate((el) => getComputedStyle(el).touchAction)).toBe('pan-y')
})

test('does not shift the layout when the script takes over', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __shift: number }
    w.__shift = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as {
        hadRecentInput: boolean
        value: number
      }[])
        if (!entry.hadRecentInput) w.__shift += entry.value
    }).observe({ type: 'layout-shift', buffered: true })
  })
  await ready(page)
  await page.waitForTimeout(500)
  expect(
    await page.evaluate(() => (window as unknown as { __shift: number }).__shift),
  ).toBeLessThan(0.02)
})

test.describe('dragging', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Mouse drag is a desktop gesture; phones are covered by the buttons',
  )

  const drag = async (page: Page, dx: number) => {
    // From the middle of the clipped viewport: after a drag the first slide is off to the side, and
    // pressing there would miss the track.
    const box = await viewport(page).boundingBox()
    if (!box) throw new Error('no viewport')
    const y = box.y + box.height / 2
    const x = box.x + box.width / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    // Several moves, so the pan session has a velocity and passes its distance threshold.
    for (let step = 1; step <= 8; step++) await page.mouse.move(x + (dx * step) / 8, y)
    await page.mouse.up()
  }

  test('a drag to the left shows the next slide, and a drag back returns', async ({ page }) => {
    await ready(page)
    expect(await firstInView(page)).toBe(1)
    await drag(page, -260)
    await expect.poll(() => firstInView(page)).toBeGreaterThan(1)
    await expect(carousel(page).locator('[aria-live="polite"]')).toHaveText('')
    await drag(page, 260)
    await expect.poll(() => firstInView(page)).toBe(1)
  })

  test('a tiny drag springs back to the same slide', async ({ page }) => {
    await ready(page)
    await drag(page, -12)
    await page.waitForTimeout(600)
    expect(await firstInView(page)).toBe(1)
  })

  test('a drag cannot be pulled past the first slide', async ({ page }) => {
    await ready(page)
    await drag(page, 300)
    await page.waitForTimeout(600)
    expect(await firstInView(page)).toBe(1)
    expect(await trackX(page)).toBeCloseTo(0, 0)
  })

  test('a drag over slide content does not click it', async ({ page }) => {
    await ready(page)
    await page.evaluate(() => {
      const w = window as unknown as { __clicks: number }
      w.__clicks = 0
      document
        .querySelector('[aria-roledescription="slide"] figure')
        ?.addEventListener('click', () => {
          w.__clicks += 1
        })
    })
    await drag(page, -200)
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => (window as unknown as { __clicks: number }).__clicks)).toBe(0)
  })
})

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('springs to the next slide and settles on it', async ({ page }) => {
    await ready(page)
    await next(page).click()
    // Moving, then still: two reads a moment apart agree.
    let last = Number.NaN
    await expect
      .poll(
        async () => {
          const now = await trackX(page)
          const still = now === last
          last = now
          return still && now < 0
        },
        { intervals: [150] },
      )
      .toBe(true)
    expect(await firstInView(page)).toBe(2)
  })

  test('a drag release springs back and snaps to a slide', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Mouse drag is a desktop gesture')
    await ready(page)
    const box = await slides(page).first().boundingBox()
    if (!box) throw new Error('no first slide')
    const y = box.y + box.height / 2
    await page.mouse.move(box.x + 200, y)
    await page.mouse.down()
    for (let step = 1; step <= 8; step++) await page.mouse.move(box.x + 200 + step * 30, y)
    await page.mouse.up()
    // Pulled right from the first slide: it rubber-bands back to rest at 0.
    await expect.poll(() => trackX(page)).toBeCloseTo(0, 0)
    expect(await firstInView(page)).toBe(1)
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('moves at once, with no spring', async ({ page }) => {
    await ready(page)
    await next(page).click()
    // The first frame that shows any movement already shows all of it: nothing is mid-spring.
    await expect.poll(() => trackX(page)).toBeLessThan(0)
    const first = await trackX(page)
    await page.waitForTimeout(300)
    expect(await trackX(page)).toBe(first)
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('every slide is in the HTML, in a horizontal scroll-snap list', async ({ page }) => {
    await page.goto(PAGE)
    await expect(slides(page)).toHaveCount(6)
    const style = await viewport(page).evaluate((el) => {
      const css = getComputedStyle(el)
      return {
        overflowX: css.overflowX,
        snap: css.scrollSnapType,
        scrollable: el.scrollWidth > el.clientWidth,
      }
    })
    expect(style.overflowX).toBe('auto')
    expect(style.snap).toContain('x')
    expect(style.scrollable).toBe(true)
    // Keyboard reachable, and nothing is hidden from it.
    await expect(viewport(page)).toHaveAttribute('tabindex', '0')
    await expect(page.locator('[inert]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Next slide' })).toHaveCount(0)
  })

  test('the last slide can be scrolled to', async ({ page }) => {
    await page.goto(PAGE)
    await viewport(page).evaluate((el) => {
      el.scrollLeft = el.scrollWidth
    })
    await expect.poll(() => inView(page, slides(page).last())).toBe(true)
  })
})
