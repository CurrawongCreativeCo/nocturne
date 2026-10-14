import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { brandPreviewCases } from '../../src/features/studio/brand-preview/cases'

/**
 * CMS branding, tested through /studio-brand-preview (Studio itself needs a login): Sanity UI under
 * the theme Studio receives for each brand, in light and dark. Screenshots are in
 * studio-brand-visual.spec.ts.
 */
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PATH = '/studio-brand-preview'
/** Currawong violet, the one colour a client's Studio must never show. */
const CURRAWONG_VIOLET = 'rgb(95, 43, 212)'
const SCHEMES = ['light', 'dark'] as const

/**
 * Elements whose text fails 4.5:1 today, by case and scheme (found by this page; see "Known contrast
 * gaps" in the README). The legacy theme gives both schemes one accent and one grey ramp, so a label
 * Sanity UI draws in the scheme's own paper or ink cannot reach 4.5:1 on both. The test below
 * expects exactly this list: a new failure fails it, and so does a fix, until the list is updated.
 */
const KNOWN_CONTRAST_GAPS: Record<string, string[]> = {
  'currawong-light': ['Default', 'Primary', 'Publish'],
  'currawong-dark': ['Default'],
  'green-cream-light': ['Default'],
  'green-cream-dark': ['Default', 'Primary', 'Publish'],
  'partial-light': ['Default'],
  'partial-dark': ['Default', 'Primary', 'Publish'],
  'low-contrast-light': ['Default', 'Primary', 'Publish', 'primary'],
  'low-contrast-dark': ['Default'],
}

const hexToRgb = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgb(${value >> 16}, ${(value >> 8) & 255}, ${value & 255})`
}

/** Largest per-channel difference between two "rgb(r, g, b)" strings. */
const channelDistance = (a: string, b: string) => {
  const channels = (rgb: string) => rgb.match(/\d+/g)?.map(Number) ?? []
  const [left, right] = [channels(a), channels(b)]
  return Math.max(...left.map((value, i) => Math.abs(value - (right[i] ?? 0))))
}
const ACCENT_TOLERANCE = 40

test.beforeEach(async ({ page }) => {
  await page.goto(PATH)
  await expect(page.locator('main[data-ready="true"]')).toBeVisible()
  await expect(page.locator('[data-case]')).toHaveCount(brandPreviewCases.length * SCHEMES.length)
})

const section = (page: Page, id: string, scheme: string) =>
  page.locator(`[data-case="${id}"][data-scheme="${scheme}"]`)

/**
 * Whether focusing `target` with the keyboard changes how it looks. Sanity UI draws its focus ring
 * differently per component (an inset shadow on a button, a ring on the field around an input), so
 * this compares what is drawn around the element, not any one CSS property.
 */
async function focusChangesAppearance(page: Page, target: Locator) {
  await page.keyboard.press('Tab') // keyboard modality, so :focus-visible applies
  await target.evaluate((element) => {
    ;(element as HTMLElement).blur()
  })
  // Two levels up: the ring may be on the element, its wrapper or the field around an input.
  const around = target.locator('xpath=../..')
  const before = await around.screenshot()
  await target.focus()
  await expect(target).toBeFocused()
  const after = await around.screenshot()
  return !before.equals(after)
}

test.describe('Studio brand preview', () => {
  test('is kept out of search engines and the sitemap', async ({ page, request }) => {
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    const sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).not.toContain('studio-brand-preview')
  })

  test('has one h1', async ({ page }) => {
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('no WCAG 2.2 AA violations on the whole page (colour contrast aside)', async ({ page }) => {
    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG)
      .disableRules('color-contrast')
      .analyze()
    expect(
      violations.map(
        ({ id, nodes }) => `${id}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`,
      ),
    ).toEqual([])
  })

  for (const item of brandPreviewCases) {
    for (const scheme of SCHEMES) {
      test.describe(`${item.label}, ${scheme}`, () => {
        test('no WCAG 2.2 AA violations (colour contrast aside)', async ({ page }) => {
          const { violations } = await new AxeBuilder({ page })
            .include(`[data-case="${item.id}"][data-scheme="${scheme}"]`)
            .withTags(WCAG)
            .disableRules('color-contrast') // checked on its own below
            .analyze()
          expect(
            violations.map(
              ({ id, nodes }) => `${id}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`,
            ),
          ).toEqual([])
        })

        test('colour contrast matches the known gaps', async ({ page }) => {
          const { violations } = await new AxeBuilder({ page })
            .include(`[data-case="${item.id}"][data-scheme="${scheme}"]`)
            .withRules('color-contrast')
            .analyze()
          const failing = violations
            .flatMap(({ nodes }) => nodes.map((node) => node.html.replace(/<[^>]*>/g, '')))
            .toSorted()
          expect(failing).toEqual((KNOWN_CONTRAST_GAPS[`${item.id}-${scheme}`] ?? []).toSorted())
        })

        test('shows keyboard focus on buttons and inputs', async ({ page }) => {
          const root = section(page, item.id, scheme)
          for (const target of [
            root.getByRole('button', { name: 'Default', exact: true }),
            root.locator('[data-kit-button="primary"]'),
            root.getByRole('button', { name: 'Ghost' }),
            root.locator('[data-kit-input]'),
          ]) {
            expect(await focusChangesAppearance(page, target), 'focus draws no ring').toBe(true)
          }
        })

        test('primary button uses the brand accent, never Currawong violet', async ({ page }) => {
          const button = section(page, item.id, scheme).locator('[data-kit-button="primary"]')
          const background = await button.evaluate((el) => getComputedStyle(el).backgroundColor)
          // Studio has one accent, the dark-scheme fill (src/features/studio/theme.ts); Sanity UI
          // tints the button's fill a little from it, so compare with a margin, not exactly.
          expect(
            channelDistance(background, hexToRgb(item.brand.dark.accentFill)),
            `${background} is not the brand accent`,
          ).toBeLessThanOrEqual(ACCENT_TOLERANCE)
          if (item.brand.source === 'client') expect(background).not.toBe(CURRAWONG_VIOLET)
        })
      })
    }
  }

  test('the yellow client shows adjusted text and focus colours', async ({ page }) => {
    const item = brandPreviewCases.find((entry) => entry.id === 'low-contrast')
    if (!item) throw new Error('no low-contrast case')
    const root = section(page, item.id, 'light')
    // Yellow on paper reads at 1.4:1, so the light scheme's text and focus colours are darkened.
    await expect(root.locator('[data-warnings]')).toBeVisible()
    for (const role of ['accentText', 'focus'] as const) {
      const shown = await root.locator(`[data-role="${role}"]`).getAttribute('data-hex')
      expect(shown).toBe(item.brand.light[role])
      expect(shown).not.toBe('#ffd400')
    }
    // The fill itself stays exactly the client's yellow.
    await expect(root.locator('[data-role="accentFill"]')).toHaveAttribute('data-hex', '#ffd400')
  })
})
