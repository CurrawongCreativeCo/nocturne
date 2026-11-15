import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * A divider under a hero's title (README, "Decorative dividers"): `/hero-dividers` has a hero in each layout
 * with one, and a Full background hero with none. It checks where the divider sits, that the space around it
 * is the divider's own (what follows it gives up its top margin, so the gaps are 24px with or without
 * margin collapsing, read from the computed layout) with an intro, with buttons alone and under a
 * returning visitor's greeting, that it follows each layout's alignment, that its colour differs from what is
 * behind it, and that nothing scrolls sideways.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const LAYOUTS = [
  ['Full background', 'Hero overlay', true],
  ['Split', 'Hero split', false],
  ['Editorial', 'Hero editorial', false],
  ['Image with panel', 'Hero panel', false],
] as const

const hero = (page: Page, title: string) =>
  page.locator('#main-content section').filter({ has: page.getByRole('heading', { name: title }) })
const divider = (root: Locator) => root.locator('[data-decorative-divider]')

test.describe('hero dividers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/hero-dividers')
  })

  for (const [name, title] of LAYOUTS) {
    test(`${name}: sits between the title and the intro, 24px from each`, async ({ page }) => {
      const root = hero(page, title)
      await expect(divider(root)).toHaveCount(1)
      const heading = await root.getByRole('heading', { name: title }).boundingBox()
      const rule = await divider(root).boundingBox()
      const text = await root.getByText('An introduction under the divider.').boundingBox()
      if (!heading || !rule || !text) throw new Error('Missing boxes')
      // The divider's own 1.5rem above and below, once each: the intro's top margin is 0 beside it.
      expect(Math.round(rule.y - (heading.y + heading.height))).toBe(24)
      expect(Math.round(text.y - (rule.y + rule.height))).toBe(24)
    })
  }

  test('is 24px from the buttons when there is no intro', async ({ page }) => {
    const root = hero(page, 'Hero buttons')
    const rule = await divider(root).boundingBox()
    const button = await root.getByRole('link', { name: 'Get started' }).boundingBox()
    if (!rule || !button) throw new Error('Missing boxes')
    expect(Math.round(button.y - (rule.y + rule.height))).toBe(24)
  })

  test('puts the greeting 24px under the divider and the intro 24px under the greeting', async ({
    page,
    context,
    baseURL,
  }) => {
    // A returning visitor sees the greeting; the page is requested again with the cookie.
    await context.addCookies([{ name: 'visited', value: '1', url: baseURL ?? '' }])
    await page.goto('/hero-dividers')
    const root = hero(page, 'Hero greeting')
    const rule = await divider(root).boundingBox()
    const greeting = await root.getByText('Welcome back!').boundingBox()
    const text = await root.getByText('An introduction under the divider.').boundingBox()
    if (!rule || !greeting || !text) throw new Error('Missing boxes')
    expect(Math.round(greeting.y - (rule.y + rule.height))).toBe(24)
    expect(Math.round(text.y - (greeting.y + greeting.height))).toBe(24)
  })

  test('a hero with none chosen draws none and keeps its usual space under the title', async ({
    page,
  }) => {
    const root = hero(page, 'Hero control')
    await expect(divider(root)).toHaveCount(0)
    const heading = await root.getByRole('heading', { name: 'Hero control' }).boundingBox()
    const text = await root.getByText('An introduction under the divider.').boundingBox()
    if (!heading || !text) throw new Error('Missing boxes')
    expect(Math.round(text.y - (heading.y + heading.height))).toBe(24)
  })

  test('follows the layout’s alignment', async ({ page }) => {
    // Full background centres its text; the others start at the heading's edge.
    const centred = hero(page, 'Hero overlay')
    const rule = await divider(centred).boundingBox()
    const box = await centred.getByRole('heading', { name: 'Hero overlay' }).boundingBox()
    if (!rule || !box) throw new Error('Missing boxes')
    expect(Math.abs(rule.x + rule.width / 2 - (box.x + box.width / 2))).toBeLessThan(2)
    for (const title of ['Hero split', 'Hero editorial', 'Hero panel']) {
      const root = hero(page, title)
      const start = await divider(root).boundingBox()
      const heading = await root.getByRole('heading', { name: title }).boundingBox()
      if (!start || !heading) throw new Error('Missing boxes')
      expect(Math.abs(start.x - heading.x), title).toBeLessThan(2)
    }
  })

  test('is visible against what is behind it, in the dark and the light layouts', async ({
    page,
  }) => {
    for (const [, title] of LAYOUTS) {
      const root = hero(page, title)
      const [line, behind] = await divider(root).evaluate((node) => {
        const colours = (element: Element) => getComputedStyle(element).color
        let surface = node.parentElement
        // The nearest ancestor that paints a background: the panel, or the section.
        while (
          surface &&
          getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)' &&
          surface.parentElement
        ) {
          surface = surface.parentElement
        }
        return [colours(node), surface ? getComputedStyle(surface).backgroundColor : '']
      })
      expect(line, title).not.toBe('')
      expect(line, title).not.toBe(behind)
    }
  })

  for (const [name, width] of [
    ['a phone', 390],
    ['a desktop', 1280],
  ] as const) {
    test(`does not scroll sideways on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(violations).toEqual([])
  })
})
