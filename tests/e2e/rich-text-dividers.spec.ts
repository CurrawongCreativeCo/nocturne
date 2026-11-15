import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * A divider block in a Rich text body (README, "Decorative dividers"): `/rich-text-dividers` has one between two
 * paragraphs, one after a list and before a heading, one in a centred section, and a body with none. It reads
 * computed layout: the divider owns 24px each side, and the blocks beside it have no margin on that side
 * (a class on the body, so the gap is 24px whatever the neighbour is and does not depend on margins
 * collapsing), while a body with none keeps its usual margins.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const section = (page: Page, text: string) =>
  page.locator('#main-content section').filter({ hasText: text })
const divider = (root: Locator) => root.locator('[data-decorative-divider]')
const margin = (locator: Locator, side: 'top' | 'bottom') =>
  locator.evaluate((node, edge) => getComputedStyle(node).getPropertyValue(`margin-${edge}`), side)

test.describe('Rich text dividers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rich-text-dividers')
  })

  test('sit between the two paragraphs, 24px from each', async ({ page }) => {
    const root = section(page, 'Before the first divider.')
    await expect(divider(root)).toHaveCount(1)
    const before = await root.getByText('Before the first divider.').boundingBox()
    const rule = await divider(root).boundingBox()
    const after = await root.getByText('After the first divider.').boundingBox()
    if (!before || !rule || !after) throw new Error('Missing boxes')
    expect(Math.round(rule.y - (before.y + before.height))).toBe(24)
    expect(Math.round(after.y - (rule.y + rule.height))).toBe(24)
  })

  test('take the neighbours’ margins: both are 0 beside it, and unchanged elsewhere', async ({
    page,
  }) => {
    const root = section(page, 'Before the first divider.')
    expect(await margin(root.getByText('Before the first divider.'), 'bottom')).toBe('0px')
    expect(await margin(root.getByText('After the first divider.'), 'top')).toBe('0px')
    // A body with none keeps `my-4` on its paragraphs.
    const control = section(page, 'Control: first paragraph.')
    expect(await margin(control.getByText('Control: first paragraph.'), 'top')).toBe('16px')
    expect(await margin(control.getByText('Control: second paragraph.'), 'bottom')).toBe('16px')
  })

  test('are 24px from a list before and a heading after, whatever their own margins are', async ({
    page,
  }) => {
    const root = section(page, 'A heading after the divider')
    const list = await root.locator('ul').boundingBox()
    const rule = await divider(root).boundingBox()
    const heading = await root
      .getByRole('heading', { name: 'A heading after the divider' })
      .boundingBox()
    if (!list || !rule || !heading) throw new Error('Missing boxes')
    expect(Math.round(rule.y - (list.y + list.height))).toBe(24)
    expect(Math.round(heading.y - (rule.y + rule.height))).toBe(24)
    expect(await margin(root.locator('ul'), 'bottom')).toBe('0px')
    expect(
      await margin(root.getByRole('heading', { name: 'A heading after the divider' }), 'top'),
    ).toBe('0px')
  })

  test('follow the section’s alignment: centred in a centred section, at the start otherwise', async ({
    page,
  }) => {
    const centred = section(page, 'Centred before.')
    const rule = await divider(centred).boundingBox()
    const box = await centred.getByText('Centred before.').boundingBox()
    if (!rule || !box) throw new Error('Missing boxes')
    expect(Math.abs(rule.x + rule.width / 2 - (box.x + box.width / 2))).toBeLessThan(2)

    const basic = section(page, 'Before the first divider.')
    const start = await divider(basic).boundingBox()
    const text = await basic.getByText('Before the first divider.').boundingBox()
    if (!start || !text) throw new Error('Missing boxes')
    expect(Math.abs(start.x - text.x)).toBeLessThan(2)
  })

  test('is decoration: hidden from assistive technology, with nothing to tab to', async ({
    page,
  }) => {
    const rule = divider(section(page, 'Before the first divider.'))
    await expect(rule).toHaveAttribute('aria-hidden', 'true')
    expect(await rule.locator('a, button, input, [tabindex]').count()).toBe(0)
  })

  for (const width of [390, 1280]) {
    test(`does not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/rich-text-dividers')
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
