import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * Section panels (README, "Section panels"): the section gallery holds a section for each case. Glass
 * over a solid tone is tinted, with no blur; over a picture or a gradient it is frosted. Every panel
 * passes axe, which measures the text colour against the panel as drawn.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const GALLERY = '/section-gallery'

/** Stands in for every Sanity CDN image, so nothing depends on the network. */
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

const PANELS = [
  { id: 'panel-solid-tone', render: 'tinted' },
  { id: 'panel-inverse', render: 'tinted' },
  { id: 'panel-image', render: 'frosted' },
  { id: 'panel-gradient', render: 'frosted' },
  { id: 'panel-solid-card', render: 'solid' },
] as const

const panelOf = (section: Locator) => section.locator('[data-panel]')
const backdropFilter = (panel: Locator) =>
  panel.evaluate((el) => getComputedStyle(el).backdropFilter)

for (const { id, render } of PANELS) {
  test.describe(id, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(GALLERY)
    })

    test(`renders ${render}`, async ({ page }) => {
      const panel = panelOf(page.locator(`[data-gallery-section="${id}"]`))
      await expect(panel).toHaveCount(1)
      await expect(panel).toHaveAttribute('data-panel', render)
      if (render === 'frosted') expect(await backdropFilter(panel)).toContain('blur')
      else expect(await backdropFilter(panel)).toBe('none')
    })

    test('passes axe', async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .include(`[data-gallery-section="${id}"]`)
        .withTags(WCAG)
        .analyze()
      expect(results.violations).toEqual([])
    })
  })
}

test('a section with no panel chosen has none', async ({ page }) => {
  await page.goto(GALLERY)
  await expect(page.locator('[data-gallery-section="hero"] [data-panel]')).toHaveCount(0)
})

test('visitors who ask for more contrast get an opaque panel', async ({ page }) => {
  await page.emulateMedia({ contrast: 'more' })
  await page.goto(GALLERY)
  for (const id of ['panel-image', 'panel-solid-tone']) {
    const panel = panelOf(page.locator(`[data-gallery-section="${id}"]`))
    expect(await backdropFilter(panel)).toBe('none')
    const colour = await panel.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(colour).not.toMatch(/\/ 0\.\d+\)|rgba\(.*, 0\.\d+\)/)
  }
})

/**
 * Playwright cannot emulate `prefers-reduced-transparency`, and a browser that cannot blur cannot be
 * launched on purpose, so these two fallbacks are checked in the stylesheet that ships: each is a rule
 * under its condition that turns the blur off and fills the panel with the solid colour.
 */
test('the stylesheet makes panels solid for reduced transparency and without backdrop-filter', async ({
  page,
}) => {
  await page.goto(GALLERY)
  const found = await page.evaluate(() => {
    const out = { reducedTransparency: false, noBackdropFilter: false }
    const solid = (rules: CSSRuleList) =>
      [...rules].some(
        (rule) =>
          rule instanceof CSSStyleRule &&
          rule.selectorText.includes('data-panel') &&
          rule.style.getPropertyValue('background-color').includes('--panel-solid'),
      )
    const walk = (rules: CSSRuleList) => {
      for (const rule of rules) {
        if (
          rule instanceof CSSMediaRule &&
          rule.conditionText.includes('prefers-reduced-transparency')
        ) {
          out.reducedTransparency ||= solid(rule.cssRules)
        }
        if (rule instanceof CSSSupportsRule && /not \(.*backdrop-filter/.test(rule.conditionText)) {
          out.noBackdropFilter ||= solid(rule.cssRules)
        }
        if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules)
      }
    }
    for (const sheet of document.styleSheets) {
      try {
        walk(sheet.cssRules)
      } catch {
        // A cross-origin sheet; the site's own are same-origin.
      }
    }
    return out
  })
  expect(found).toEqual({ reducedTransparency: true, noBackdropFilter: true })
})
