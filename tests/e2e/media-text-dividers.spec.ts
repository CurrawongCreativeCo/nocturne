import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * A divider between Image + text's heading and its body (README, "Decorative dividers"): `/media-text-dividers`
 * has one in each layout (Side, Stacked, Full background), under a body that opens with a heading, in a
 * centred Side section, and a section with none chosen. It checks where the divider sits, that the space
 * around it is the divider's own (the body and its first block give up their top margin, so the gaps are
 * 24px with or without margin collapsing, read from the computed layout), that it follows the alignment,
 * that its line is visible against what is behind it, and that nothing scrolls sideways.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const LAYOUTS = [
  ['Side', 'Side divider'],
  ['Stacked', 'Stacked divider'],
  ['Full background', 'Overlay divider'],
  ['Side, body opens with a heading', 'Heading first divider'],
] as const

const section = (page: Page, title: string) =>
  page.locator('#main-content section').filter({ has: page.getByRole('heading', { name: title }) })
const divider = (root: Locator) => root.locator('[data-decorative-divider]')
/** The body's first block, which is what sits under the divider. */
const firstBlock = (root: Locator) => root.locator('[data-text-role="intro"] > *').first()

test.describe('Image + text dividers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/media-text-dividers')
  })

  for (const [name, title] of LAYOUTS) {
    test(`${name}: sits between the heading and the body, 24px from each`, async ({ page }) => {
      const root = section(page, title)
      await expect(divider(root)).toHaveCount(1)
      const heading = await root.getByRole('heading', { name: title }).boundingBox()
      const rule = await divider(root).boundingBox()
      const body = await firstBlock(root).boundingBox()
      if (!heading || !rule || !body) throw new Error('Missing boxes')
      expect(Math.round(rule.y - (heading.y + heading.height))).toBe(24)
      expect(Math.round(body.y - (rule.y + rule.height))).toBe(24)
    })
  }

  test('keeps the divider inside the text, not beside the picture', async ({ page }) => {
    for (const [, title] of LAYOUTS) {
      const root = section(page, title)
      const inText = await divider(root).evaluate((node) => {
        const text = node.parentElement
        return Boolean(text?.querySelector('h2') && text.querySelector('[data-text-role="intro"]'))
      })
      expect(inText, title).toBe(true)
    }
  })

  test('a section with none chosen draws none and keeps a smaller gap under the title', async ({
    page,
  }) => {
    const root = section(page, 'No divider')
    await expect(divider(root)).toHaveCount(0)
    const heading = await root.getByRole('heading', { name: 'No divider' }).boundingBox()
    const body = await firstBlock(root).boundingBox()
    if (!heading || !body) throw new Error('Missing boxes')
    // The body's usual `mt-4`, not the divider's 24px either side.
    expect(Math.round(body.y - (heading.y + heading.height))).toBeLessThan(24)
  })

  test('follows the alignment: Stacked and a centred section centre it, Side starts', async ({
    page,
  }) => {
    for (const title of ['Stacked divider', 'Centred divider']) {
      const root = section(page, title)
      const rule = await divider(root).boundingBox()
      const heading = await root.getByRole('heading', { name: title }).boundingBox()
      if (!rule || !heading) throw new Error('Missing boxes')
      expect(
        Math.abs(rule.x + rule.width / 2 - (heading.x + heading.width / 2)),
        title,
      ).toBeLessThan(2)
    }
    for (const title of ['Side divider', 'Overlay divider']) {
      const root = section(page, title)
      const rule = await divider(root).boundingBox()
      const heading = await root.getByRole('heading', { name: title }).boundingBox()
      if (!rule || !heading) throw new Error('Missing boxes')
      expect(Math.abs(rule.x - heading.x), title).toBeLessThan(2)
    }
  })

  test('is visible: its colour differs from what is behind it, over the picture too', async ({
    page,
  }) => {
    for (const [, title] of LAYOUTS) {
      const root = section(page, title)
      const [line, behind] = await divider(root).evaluate((node) => {
        let surface = node.parentElement
        // The nearest ancestor that paints a background: the section's tone.
        while (
          surface &&
          getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)' &&
          surface.parentElement
        ) {
          surface = surface.parentElement
        }
        return [
          getComputedStyle(node).color,
          surface ? getComputedStyle(surface).backgroundColor : '',
        ]
      })
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
