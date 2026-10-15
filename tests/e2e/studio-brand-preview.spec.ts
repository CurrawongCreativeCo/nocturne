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

  test('shows the Browser icon preview: 16, 32 and 180 px on a light and a dark browser', async ({
    page,
  }) => {
    const preview = page.locator('[data-browser-icon-preview]')
    await expect(preview).toBeVisible()
    await expect(preview.getByRole('group')).toHaveCount(2)
    const images = preview.getByRole('img')
    await expect(images).toHaveCount(6)
    const sizes = await images.evaluateAll((all) =>
      all.map((img) => ({
        width: img.getAttribute('width'),
        loaded: (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
      })),
    )
    expect(sizes.map((size) => size.width)).toEqual(['16', '32', '90', '16', '32', '90'])
    expect(sizes.every((size) => size.loaded)).toBe(true)
  })

  test.describe('Preset picker', () => {
    const light = (page: Page) => page.locator('[data-picker-scheme="light"]')
    const example = (page: Page, id: string) => light(page).locator(`[data-picker-example="${id}"]`)

    test('shows the options as a radiogroup with one tab stop', async ({ page }) => {
      const group = example(page, 'options').getByRole('radiogroup', { name: 'Layout' })
      await expect(group.getByRole('radio')).toHaveCount(4)
      await expect(group.getByRole('radio', { checked: true })).toHaveCount(0)
      // Nothing chosen: the first card is the tab stop, and only it.
      await expect(group.locator('[role="radio"][tabindex="0"]')).toHaveCount(1)
      await expect(group.getByRole('radio').first()).toHaveAttribute('tabindex', '0')
      // Pictures: an inline component, a static file, and the first-letter fallback.
      await expect(group.locator('[data-thumbnail] svg')).toHaveCount(2)
      await expect(group.locator('[data-thumbnail] img')).toHaveCount(1)
    })

    test('arrows move focus, Enter and Space choose, and the choice collapses', async ({
      page,
    }) => {
      const box = example(page, 'options')
      const radios = box.getByRole('radio')
      await radios.first().focus()
      await page.keyboard.press('ArrowRight')
      await expect(radios.nth(1)).toBeFocused()
      // Moving focus does not choose.
      await expect(box.getByRole('radio', { checked: true })).toHaveCount(0)
      await expect(radios.nth(1)).toHaveAttribute('tabindex', '0')
      await expect(radios.first()).toHaveAttribute('tabindex', '-1')
      await page.keyboard.press('End')
      await expect(radios.nth(3)).toBeFocused()
      await page.keyboard.press('ArrowRight') // wraps
      await expect(radios.first()).toBeFocused()
      await page.keyboard.press('Space')
      // Chosen: collapsed to one row, focus back on "Change".
      await expect(box.locator('[data-picker-current]')).toHaveText('Split')
      await expect(box.getByRole('radio')).toHaveCount(0)
      await expect(box.getByRole('button', { name: 'Change Layout' })).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(box.getByRole('radio', { checked: true })).toHaveText(/Split/)
      await expect(box.getByRole('radio', { checked: true })).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('Enter')
      await expect(box.locator('[data-picker-current]')).toHaveText('Centred')
    })

    test('starts collapsed when a value is set, and Change opens the options', async ({ page }) => {
      const box = example(page, 'options-collapsed')
      await expect(box.locator('[data-picker-current]')).toHaveText('Centred')
      await expect(box.getByRole('radio')).toHaveCount(0)
      const change = box.getByRole('button', { name: 'Change Layout (collapsed)' })
      await change.click()
      await expect(box.getByRole('radio')).toHaveCount(4)
      await expect(box.getByRole('radio', { checked: true })).toHaveText(/Centred/)
    })

    test('a preset sets several fields, and any later change makes it Custom', async ({ page }) => {
      const box = example(page, 'presets')
      const values = box.locator('[data-preset-values]')
      await expect(box.locator('[data-picker-current]')).toHaveText('Feature')
      await box.getByRole('button', { name: /^Change/ }).click()
      await box.getByRole('radio', { name: /Statement/ }).click()
      await expect(box.locator('[data-picker-current]')).toHaveText('Statement')
      await expect(values).toHaveText('{"variant":"centred","style":{"tone":"surface"}}')
      await box.locator('[data-preset-tone]').selectOption('inverse')
      await expect(box.locator('[data-picker-current]')).toHaveText('Custom')
      // Choosing it again sets the fields again.
      await box.getByRole('button', { name: /^Change/ }).click()
      await box.getByRole('radio', { name: /Statement/ }).click()
      await expect(values).toHaveText('{"variant":"centred","style":{"tone":"surface"}}')
    })

    for (const scheme of SCHEMES) {
      test(`no WCAG 2.2 AA violations, ${scheme} (colour contrast aside)`, async ({ page }) => {
        // Open the grids, so the cards are scanned as well as the collapsed rows.
        const scope = page.locator(`[data-picker-scheme="${scheme}"]`)
        await scope.getByRole('button', { name: 'Change Layout (collapsed)' }).click()
        await scope.getByRole('button', { name: /^Change Section presets/ }).click()
        const { violations } = await new AxeBuilder({ page })
          .include(`[data-picker-scheme="${scheme}"]`)
          .withTags(WCAG)
          .disableRules('color-contrast')
          .analyze()
        expect(
          violations.map(
            ({ id, nodes }) => `${id}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`,
          ),
        ).toEqual([])
      })
    }
  })

  test.describe('Preset picker thumbnails', () => {
    const gallery = (page: Page, scheme: (typeof SCHEMES)[number]) =>
      page.locator(`[data-thumbnail-scheme="${scheme}"]`)
    const cell = (page: Page, scheme: (typeof SCHEMES)[number], key: string) =>
      gallery(page, scheme).locator(`[data-thumbnail-key="${key}"]`)

    for (const scheme of SCHEMES) {
      test(`shows every kind of thumbnail, ${scheme}`, async ({ page }) => {
        const scope = gallery(page, scheme)
        for (const group of ['layouts', 'animations', 'tones', 'insert-menu']) {
          await expect(scope.locator(`[data-thumbnail-group="${group}"]`)).toBeVisible()
        }
        await expect(cell(page, scheme, 'hero.full-bleed')).toBeVisible()
        await expect(cell(page, scheme, 'motion.parallax')).toBeVisible()
        await expect(cell(page, scheme, 'tone.accent')).toBeVisible()
        await expect(cell(page, scheme, 'section.hero')).toBeVisible()
        // Every drawing is 4:3 and at least the 160 px the picker's cards give it.
        for (const box of await scope.locator('[data-thumbnail-key] [data-thumbnail]').all()) {
          const { width, height } = (await box.boundingBox()) ?? { width: 0, height: 0 }
          expect(width).toBeGreaterThanOrEqual(150)
          expect(width / height).toBeCloseTo(4 / 3, 1)
        }
      })

      test(`no WCAG 2.2 AA violations, ${scheme} (colour contrast aside)`, async ({ page }) => {
        const { violations } = await new AxeBuilder({ page })
          .include(`[data-thumbnail-scheme="${scheme}"]`)
          .withTags(WCAG)
          .disableRules('color-contrast')
          .analyze()
        expect(
          violations.map(
            ({ id, nodes }) => `${id}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`,
          ),
        ).toEqual([])
      })
    }

    test('wireframes follow the Studio scheme; tones show the site tokens in both', async ({
      page,
    }) => {
      const background = (scheme: (typeof SCHEMES)[number], key: string) =>
        cell(page, scheme, key)
          .locator('svg rect')
          .first()
          .evaluate((element) => getComputedStyle(element).fill)
      expect(await background('light', 'hero.split')).not.toBe(
        await background('dark', 'hero.split'),
      )
      // Surface is white and Dark is near-black (tokens.json), whichever scheme the Studio is in.
      expect(await background('light', 'tone.surface')).toBe(
        await background('dark', 'tone.surface'),
      )
      expect(await background('dark', 'tone.inverse')).not.toBe(
        await background('dark', 'tone.surface'),
      )
    })

    test('animations loop, and stand still for visitors who ask for less motion', async ({
      page,
    }) => {
      const loops = () => cell(page, 'light', 'motion.reveal').locator('animate, animateTransform')
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await expect(loops()).not.toHaveCount(0)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await expect(loops()).toHaveCount(0)
    })
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
