import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { galleryIds } from './fixtures/dataset.mjs'

/**
 * Process timeline (README, "Process timeline"): the steps are an ordered list in the order the
 * editor wrote them; the line beside them fills as the page scrolls; and it is fully drawn, with
 * every step visible, for visitors without JavaScript or who ask for less motion.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PAGE = '/process'
const STEP_TITLES = ['Discover', 'Design', 'Build', 'Launch']

const processIds = galleryIds.filter((id: string) => id.startsWith('process-'))

test.beforeEach(async ({ page }) => {
  // Stand in for the Sanity CDN so the step picture never waits on the network.
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#6366f1"/></svg>',
    }),
  )
})

/** The line's fill, as a scale from 0 (empty) to 1 (full). */
const fillOf = (page: Page) =>
  page
    .locator('[data-process-line-fill]')
    .first()
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).d)

/** Jumps to a scroll position, then lets two frames pass so Motion has measured it. */
const scrollTo = (page: Page, y: number) =>
  page.evaluate(
    (top) =>
      new Promise<void>((resolve) => {
        window.scrollTo(0, top)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve()
          })
        })
      }),
    y,
  )

test('the gallery has both layouts of the Process section', () => {
  expect(processIds).toEqual(expect.arrayContaining(['process-vertical', 'process-alternating']))
})

for (const id of processIds) {
  test(`${id} has no WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto('/section-gallery')
    const { violations } = await new AxeBuilder({ page })
      .include(`[data-gallery-section="${id}"]`)
      .withTags(WCAG)
      .analyze()
    expect(violations.map(({ id: rule }) => rule)).toEqual([])
  })

  test(`${id} lists its steps in order`, async ({ page }) => {
    await page.goto('/section-gallery')
    const section = page.locator(`[data-gallery-section="${id}"]`)
    await expect(section.getByRole('list').first()).toBeVisible()
    await expect(section.getByRole('listitem').getByRole('heading', { level: 3 })).toHaveText(
      STEP_TITLES,
    )
    // The label is optional: the third step has none.
    await expect(section.getByText('Week 1')).toBeVisible()
    await expect(section.getByText('Weeks 2–3')).toBeVisible()
  })
}

test('the steps are an <ol> in the server HTML, in order', async ({ request }) => {
  const html = await (await request.get(PAGE)).text()
  expect(html).toMatch(/<ol[^>]*>\s*<li/)
  const positions = STEP_TITLES.map((title) => html.indexOf(`>${title}</h3>`))
  expect(positions.every((position) => position > -1)).toBe(true)
  expect(positions).toEqual([...positions].sort((a, b) => a - b))
})

test('the page has no WCAG 2.2 AA violations', async ({ page }) => {
  await page.goto(PAGE)
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(violations.map(({ id }) => id)).toEqual([])
})

test.describe('motion on', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('the line is empty above the timeline and fills as the page scrolls', async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    const timeline = page.locator('[data-process-line]').first().locator('..')
    await expect(timeline).toBeAttached()

    // Above the timeline: nothing drawn yet. Each stop is a scroll event, so a stop that lands
    // before hydration is followed by one that paints.
    await scrollTo(page, 0)
    await scrollTo(page, 10)
    await expect.poll(() => fillOf(page)).toBeLessThan(0.05)

    const box = await timeline.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      return { top: rect.top + window.scrollY, height: rect.height }
    })
    // Midway through the timeline: part drawn.
    await scrollTo(page, box.top + box.height / 2 - 300)
    await expect.poll(() => fillOf(page)).toBeGreaterThan(0.1)
    expect(await fillOf(page)).toBeLessThan(0.95)

    // Past the end: fully drawn.
    await scrollTo(page, box.top + box.height)
    await expect.poll(() => fillOf(page)).toBeGreaterThan(0.99)
  })

  test('each step reveals as it scrolls into view', async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    const steps = page.locator('[data-process-step]')
    await steps.last().scrollIntoViewIfNeeded()
    for (const step of await steps.all()) await expect(step).toHaveCSS('opacity', '1')
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the line is fully drawn and every step is visible, wherever the page is scrolled', async ({
    page,
  }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    await scrollTo(page, 0)
    expect(await fillOf(page)).toBe(1)
    const steps = page.locator('[data-process-step]')
    await expect(steps).toHaveCount(4)
    for (const step of await steps.all()) await expect(step).toHaveCSS('opacity', '1')
  })
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false, reducedMotion: 'no-preference' })

  test('the line is fully drawn and every step is visible', async ({ page }) => {
    await page.goto(PAGE)
    expect(await fillOf(page)).toBe(1)
    const steps = page.locator('[data-process-step]')
    await expect(steps).toHaveCount(4)
    for (const step of await steps.all()) await expect(step).toBeVisible()
    for (const step of await steps.all()) await expect(step).toHaveCSS('opacity', '1')
  })
})
