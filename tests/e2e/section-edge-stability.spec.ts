import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * Section dividers beside the cases that used to misbehave (task 151, stage B1; README, "Section dividers"):
 * an edge on a section that renders nothing (S1), the footer's band on a Minimal page (S2) and the first and
 * last section of a Minimal page when an edge wraps them (S3). `/edge-empty` and `/edge-minimal` are the
 * fixtures. The rules are matched against the real markup in section-edge-css.test.tsx; this is what the
 * browser then does with them.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/** Stands in for every Sanity CDN image, so nothing depends on the network. */
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

const section = (page: Page, id: string) => page.locator(`section#${id}`)

async function box(locator: Locator) {
  const found = await locator.boundingBox()
  if (!found) throw new Error('No box: the element is not drawn.')
  return found
}

/** The edge's height in px, as the page resolves the variable at this width. */
const edgeHeight = (frame: Locator) =>
  frame.evaluate((el) => {
    const probe = document.createElement('div')
    probe.style.height = 'var(--edge-h)'
    el.append(probe)
    const height = probe.getBoundingClientRect().height
    probe.remove()
    return height
  })

const computed = (locator: Locator, property: string) =>
  locator.evaluate((el, name) => getComputedStyle(el).getPropertyValue(name).trim(), property)

test.describe('beside a section that renders nothing (S1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edge-empty')
  })

  test('the section below it is not pulled up over the last visible section', async ({ page }) => {
    const before = await box(section(page, 'ee-before'))
    const after = await box(section(page, 'ee-after'))
    // The empty section's edge was configured but never drawn, so nothing sits under it to pull up.
    expect(after.y).toBeGreaterThanOrEqual(before.y + before.height - 0.5)
  })

  test('keeps its own spacing, with no edge height added to its top padding', async ({ page }) => {
    const plain = await computed(section(page, 'ee-before'), 'padding-top')
    expect(await computed(section(page, 'ee-after'), 'padding-top')).toBe(plain)
    expect(await computed(section(page, 'ee-after').locator('xpath=..'), 'margin-top')).toBe('0px')
  })

  test('does not cover the last visible section’s content', async ({ page }) => {
    const heading = section(page, 'ee-before').getByRole('heading', {
      name: 'Before the empty section',
    })
    await heading.scrollIntoViewIfNeeded()
    const covered = await heading.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      return !(hit === el || el.contains(hit))
    })
    expect(covered).toBe(false)
  })

  test('a section that does draw its edge still pulls the one below up by exactly its height', async ({
    page,
  }) => {
    const above = await box(section(page, 'ee-control-a'))
    const below = await box(section(page, 'ee-control-b'))
    const height = await edgeHeight(page.locator('[data-section-edge-frame]').first())
    expect(height).toBeGreaterThan(0)
    expect(Math.abs(below.y - (above.y + above.height - height))).toBeLessThan(1.5)
  })

  test('draws no footer band when the last section rendered nothing', async ({ page }) => {
    await expect(page.locator('[data-edge-backdrop]')).toHaveCount(1)
    expect(await computed(page.locator('[data-edge-backdrop]'), 'display')).toBe('none')
    // The footer keeps its own top border, which only a drawn band takes away.
    const footer = page.getByRole('contentinfo')
    expect(await computed(footer, 'border-top-color')).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(violations.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([])
  })
})

test.describe('on a Minimal page (S2 and S3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edge-minimal')
  })

  test('draws no footer-coloured band: there is no footer, so the page background shows under the cut', async ({
    page,
  }) => {
    await expect(page.locator('[data-edge-backdrop]')).toHaveCount(1)
    expect(await computed(page.locator('[data-edge-backdrop]'), 'display')).toBe('none')
    expect(await computed(page.locator('[data-site-chrome]').first(), 'display')).toBe('none')
  })

  test('reaches the first section’s backdrop past the page’s top, through its edge frame', async ({
    page,
  }) => {
    const backdrop = section(page, 'em-first').locator('[data-screen-backdrop]')
    expect(await computed(backdrop, '--screen-backdrop-top')).toBe('-100lvh')
    expect(await computed(backdrop, '--screen-backdrop-bottom')).toBe('')
  })

  test('reaches the last section’s backdrop past the page’s bottom, though it sits in a wrapper under an edge', async ({
    page,
  }) => {
    const backdrop = section(page, 'em-last').locator('[data-screen-backdrop]')
    expect(await computed(backdrop, '--screen-backdrop-bottom')).toBe('-100lvh')
    expect(await computed(backdrop, '--screen-backdrop-top')).toBe('')
  })

  test('does not stretch the middle section’s own backdrop (it is neither first nor last)', async ({
    page,
  }) => {
    // The middle section has no picture, so check the others are the only two that reach past the page.
    const stretched = await page.locator('[data-screen-backdrop]').evaluateAll(
      (els) =>
        els.filter((el) => {
          const style = getComputedStyle(el)
          return (
            style.getPropertyValue('--screen-backdrop-top').trim() !== '' ||
            style.getPropertyValue('--screen-backdrop-bottom').trim() !== ''
          )
        }).length,
    )
    expect(stretched).toBe(2)
  })

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(violations.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([])
  })
})
