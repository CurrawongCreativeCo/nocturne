import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * A divider between a section header's title and its intro (README, "Decorative dividers"): `/header-dividers`
 * has one in a start-aligned and a centred section, in a call to action and a logo cloud (whose header has no
 * wrapper), a header with none, and a title with no intro, which draws none. It checks where the divider
 * sits, that the intro's own top margin gives way to the divider's space, that it follows the section's
 * alignment, and that nothing scrolls sideways.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const section = (page: Page, title: string) =>
  page.locator('#main-content section').filter({ has: page.getByRole('heading', { name: title }) })
const divider = (root: Locator) => root.locator('[data-decorative-divider]')
const intro = (root: Locator) => root.locator('[data-text-role="intro"]')
const marginTop = (element: Locator) => element.evaluate((node) => getComputedStyle(node).marginTop)

test.describe('header dividers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/header-dividers')
  })

  test('sit between the title and the intro, in reading order', async ({ page }) => {
    for (const title of ['Start header', 'Centre header', 'Trusted by']) {
      const root = section(page, title)
      await expect(divider(root)).toHaveCount(1)
      const order = await root.evaluate((node) => {
        const at = (selector: string) => {
          const found = node.querySelector(selector)
          return found ? [...node.querySelectorAll('*')].indexOf(found) : -1
        }
        return [at('h2'), at('[data-decorative-divider]'), at('[data-text-role="intro"]')]
      })
      expect(order.every((index) => index >= 0)).toBe(true)
      expect(order).toEqual([...order].sort((a, b) => a - b))
    }
  })

  test('draw nothing where there is no intro, and nothing extra where none is chosen', async ({
    page,
  }) => {
    await expect(divider(section(page, 'Title only'))).toHaveCount(0)
    await expect(divider(section(page, 'Control header'))).toHaveCount(0)
  })

  test('the intro gives up its top margin, so the space is the divider’s, not both', async ({
    page,
  }) => {
    // With a divider the intro sits flush under it; without one it keeps its usual space.
    expect(await marginTop(intro(section(page, 'Start header')))).toBe('0px')
    expect(await marginTop(intro(section(page, 'Control header')))).not.toBe('0px')
    const root = section(page, 'Start header')
    const heading = await root.locator('h2').boundingBox()
    const rule = await divider(root).boundingBox()
    const text = await intro(root).boundingBox()
    if (!heading || !rule || !text) throw new Error('Missing boxes')
    // The divider's own 1.5rem above and below, once each.
    expect(Math.round(rule.y - (heading.y + heading.height))).toBe(24)
    expect(Math.round(text.y - (rule.y + rule.height))).toBe(24)
  })

  test('follows the section’s alignment, including where the header has no wrapper', async ({
    page,
  }) => {
    const centred = async (title: string) => {
      const root = section(page, title)
      const rule = await divider(root).boundingBox()
      const box = await root.boundingBox()
      if (!rule || !box) throw new Error('Missing boxes')
      return Math.abs(rule.x + rule.width / 2 - (box.x + box.width / 2))
    }
    for (const title of ['Centre header', 'Call to action', 'Trusted by']) {
      expect(await centred(title), title).toBeLessThan(2)
    }
    // Start-aligned stays at the start of the container.
    const start = section(page, 'Start header')
    const rule = await divider(start).boundingBox()
    const heading = await start.locator('h2').boundingBox()
    if (!rule || !heading) throw new Error('Missing boxes')
    expect(Math.abs(rule.x - heading.x)).toBeLessThan(2)
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
