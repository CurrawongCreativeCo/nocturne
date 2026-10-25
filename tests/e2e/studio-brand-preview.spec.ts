import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'
import { brandPreviewCases } from '../../src/features/studio/brand-preview/cases'
import { hexToOklch } from '../../src/lib/color/oklch'

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
const READY_TIMEOUT = 45_000

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
/**
 * Currawong's primary fill must be its accent exactly (2 per channel for rounding). A client's accent
 * may be moved in lightness, just far enough for Sanity's own label to reach 4.5:1 on it
 * (theme.ts), so a client's fill must keep the accent's hue (within 12 degrees) and nothing else.
 */
const CURRAWONG_TOLERANCE = 2
const CLIENT_HUE_TOLERANCE = 12

const hueDistance = (a: string, b: string) => {
  const difference = Math.abs(hexToOklch(a).h - hexToOklch(b).h) % 360
  return Math.min(difference, 360 - difference)
}
const rgbToHexString = (rgb: string) =>
  `#${(rgb.match(/\d+/g) ?? []).map((v) => Number(v).toString(16).padStart(2, '0')).join('')}`

test('shows the Launch & visibility screen for agency staff and clients, in both schemes', async ({
  page,
}) => {
  for (const scheme of SCHEMES) {
    const holder = page.locator(`[data-launch-scheme="${scheme}"]`)
    const agency = holder.locator('[data-launch-example="agency"]')
    await expect(agency.getByText('Pre-launch: visitors see Links at /')).toBeVisible()
    await expect(agency.getByRole('heading', { name: 'Before launch' })).toBeVisible()
    await expect(
      agency.getByText('1 of 8 done').or(agency.getByText(/\d of \d done/)),
    ).toBeVisible()
    await expect(agency.getByRole('heading', { name: 'How to launch' })).toBeVisible()
    const client = holder.locator('[data-launch-example="client"]')
    await expect(
      client.getByText(/Your website is in pre-launch\. Visitors see your Link page at/),
    ).toBeVisible()
    await expect(client.getByRole('button', { name: 'Edit your links' })).toBeVisible()
    await expect(client.getByRole('heading', { name: 'Before launch' })).toHaveCount(0)
  }
})

// The page renders every brand case in both schemes plus the input galleries, and each of the ~120
// tests loads it afresh. Under a full parallel run that has taken over 30 s, which fails beforeEach
// (it counts towards the test timeout) without any assertion being wrong. Only this spec gets the
// longer limit; the global timeout stays as it is.
test.describe.configure({ timeout: 60_000 })

test.beforeEach(async ({ page }) => {
  // The two checks below are the real ready gate; waiting for every image's load event adds nothing.
  // They get their own 45 s: the default 5 s expect timeout is shorter than this page takes to
  // hydrate on a loaded CI runner (mobile in shard 4 failed there on main and on branches).
  await page.goto(PATH, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main[data-ready="true"]')).toBeVisible({ timeout: READY_TIMEOUT })
  await expect(page.locator('[data-case]')).toHaveCount(brandPreviewCases.length * SCHEMES.length, {
    timeout: READY_TIMEOUT,
  })
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

        test('has no colour contrast failures', async ({ page }) => {
          const { violations } = await new AxeBuilder({ page })
            .include(`[data-case="${item.id}"][data-scheme="${scheme}"]`)
            .withRules('color-contrast')
            .analyze()
          const failing = violations.flatMap(({ nodes }) =>
            nodes.map((node) => node.html.replace(/<[^>]*>/g, '')),
          )
          expect(failing, 'elements below 4.5:1').toEqual([])
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
          // Each scheme has its own accent (src/features/studio/theme.ts builds the theme once per
          // scheme), so the fill is this scheme's accent fill, not the other one's.
          const accent = item.brand[scheme].accentFill
          if (item.brand.source === 'client') {
            expect(
              hueDistance(rgbToHexString(background), accent),
              `${background} is not the ${scheme} brand accent's hue`,
            ).toBeLessThanOrEqual(CLIENT_HUE_TOLERANCE)
          } else {
            expect(
              channelDistance(background, hexToRgb(accent)),
              `${background} is not the ${scheme} brand accent`,
            ).toBeLessThanOrEqual(CURRAWONG_TOLERANCE)
          }
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

for (const scheme of SCHEMES) {
  test(`design inputs work by keyboard and pass axe, ${scheme}`, async ({ page }) => {
    const selector = `[data-design-input-scheme="${scheme}"]`
    const scope = page.locator(selector)
    const choices = scope.getByRole('group', { name: 'Border', exact: true })
    await choices.getByRole('button', { name: 'Thin', exact: true }).focus()
    await page.keyboard.press('Space')
    await expect(choices.getByRole('button', { name: 'Thin', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await choices.getByRole('button', { name: 'Inherit', exact: true }).click()
    await expect(choices.getByRole('button', { name: 'Inherit', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await scope.getByRole('button', { name: 'Change Icon', exact: true }).click()
    const icons = scope.getByRole('radiogroup', { name: 'Icon', exact: true })
    await expect(icons.getByRole('radio', { name: 'Lotus', exact: true })).toBeFocused()
    await page.keyboard.press('Home')
    await page.keyboard.press('Enter')
    await expect(scope.getByRole('button', { name: 'Change Icon', exact: true })).toBeFocused()
    const slider = scope.getByRole('slider', { name: 'Strength', exact: true })
    await slider.focus()
    await page.keyboard.press('ArrowRight')
    await expect(slider).toHaveValue('61')
    await scope.getByRole('button', { name: 'Clear', exact: true }).click()
    await expect(slider).toHaveAttribute('aria-valuetext', 'Follows the preset')
    await scope.getByRole('button', { name: 'Change Overlay gradient', exact: true }).click()
    await scope.getByRole('radio', { name: 'focus', exact: true }).click()
    await expect(scope.locator('[data-overlay-preview] img')).toBeVisible()
    const results = await new AxeBuilder({ page }).include(selector).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
    // Also scan the expanded icon grid, where focus and contrast differ from its summary.
    await scope.getByRole('button', { name: 'Change Icon', exact: true }).click()
    const expanded = await new AxeBuilder({ page }).include(selector).withTags(WCAG).analyze()
    expect(expanded.violations).toEqual([])
  })
}
