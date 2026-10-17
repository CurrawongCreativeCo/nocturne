import { expect, test, type Page } from '@playwright/test'

import { brandPreviewCases } from '../../src/features/studio/brand-preview/cases'

/**
 * The CMS brand, measured and photographed on /studio-brand-preview, desktop only (the page is a
 * fixed two-column kit; mobile only stacks it).
 * - Contrast: computed colours of the controls Sanity UI draws under each brand's theme, in light and
 *   dark, checked against WCAG (4.5:1 for text, 3:1 for the focus ring). These run on any system.
 * - Screenshots: one per brand and colour scheme. Baselines are Linux-only, like visual.spec.ts, and
 *   are refreshed by the same "Update visual baselines" workflow (`npm run test:e2e:update` matches
 *   "visual").
 */
test.use({ reducedMotion: 'reduce' })

const SCHEMES = ['light', 'dark'] as const
const TEXT_CONTRAST = 4.5
const FOCUS_CONTRAST = 3

async function openPreview(page: Page) {
  await page.goto('/studio-brand-preview')
  await expect(page.locator('main[data-ready="true"]')).toBeVisible()
}

interface TextMeasurement {
  name: string
  text: string
  background: string
  ratio: number
}

/**
 * Colours as the browser computed them, with the background found by compositing the element's
 * own and its ancestors' backgrounds until one is opaque (Sanity UI's tabs and bleed buttons are
 * transparent or translucent on the card behind them). Runs in the page, so it is self-contained.
 */
function measureTextInPage({ caseId, scheme }: { caseId: string; scheme: string }) {
  type Rgba = [number, number, number, number]
  const parse = (value: string): Rgba => {
    const numbers = value.match(/[\d.]+/g)?.map(Number)
    if (!numbers || numbers.length < 3 || value.startsWith('color(')) {
      throw new Error(`Cannot read the colour "${value}"`)
    }
    const [r = 0, g = 0, b = 0, a = 1] = numbers
    return [r, g, b, a]
  }
  const over = (top: Rgba, below: Rgba): Rgba => {
    const alpha = top[3] + below[3] * (1 - top[3])
    const channel = (i: 0 | 1 | 2) =>
      alpha === 0 ? 0 : (top[i] * top[3] + below[i] * below[3] * (1 - top[3])) / alpha
    return [channel(0), channel(1), channel(2), alpha]
  }
  const effectiveBackground = (start: Element): Rgba => {
    let result: Rgba = [0, 0, 0, 0]
    for (let el: Element | null = start; el && result[3] < 1; el = el.parentElement) {
      result = over(result, parse(getComputedStyle(el).backgroundColor))
    }
    return result[3] < 1 ? over(result, [255, 255, 255, 1]) : result
  }
  const luminance = ([r, g, b]: Rgba) => {
    const [lr, lg, lb] = [r, g, b].map((v) => {
      const c = v / 255
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }) as [number, number, number]
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
  }
  const ratio = (a: Rgba, b: Rgba) => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
    return (high + 0.05) / (low + 0.05)
  }
  const hex = ([r, g, b]: Rgba) =>
    `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
  /** The element that holds the visible text: the colour may be set on it, not on the button. */
  const textElement = (el: Element) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    })
    return walker.nextNode()?.parentElement ?? el
  }

  const root = document.querySelector(`[data-case="${caseId}"][data-scheme="${scheme}"]`)
  if (!root) throw new Error(`No section for ${caseId} ${scheme}`)
  const byText = (selector: string, text: string) =>
    [...root.querySelectorAll(selector)].find((el) => el.textContent.trim() === text)
  const targets: [string, Element | null | undefined][] = [
    ['Default button', byText('button', 'Default')],
    ['Primary button', root.querySelector('[data-kit-button="primary"]')],
    ['Ghost button', byText('button', 'Ghost')],
    ['Publish button (primary)', byText('button', 'Publish')],
    ['Cancel button (bleed)', byText('button', 'Cancel')],
    ['Selected tool in the navbar', byText('nav button', 'Structure')],
    ['Unselected tool in the navbar', byText('nav button', 'Vision')],
    ['Selected tab', root.querySelector('[role="tab"][aria-selected="true"]')],
    ['Unselected tab', root.querySelector('[role="tab"][aria-selected="false"]')],
    ['Selected card', root.querySelector('[data-kit="selected-card"]')],
    ...['default', 'primary', 'positive', 'caution', 'critical'].map(
      (tone): [string, Element | null | undefined] => [
        `Badge, ${tone}`,
        byText('[data-kit="badges"] *', tone),
      ],
    ),
  ]
  return targets.map(([name, el]): TextMeasurement => {
    if (!el) throw new Error(`${name} is missing from ${caseId} ${scheme}`)
    const holder = textElement(el)
    const text = parse(getComputedStyle(holder).color)
    const background = effectiveBackground(holder)
    const shown = over(text, background)
    return {
      name,
      text: hex(shown),
      background: hex(background),
      ratio: ratio(shown, background),
    }
  })
}

/**
 * Box-shadows on the field around the element (three levels up, and everything inside), one entry
 * per node and pseudo-element: Sanity UI draws a text input's ring on a sibling of the input, and a
 * button's on the button or its wrapper. A ring is the entries that focus changed.
 */
function shadowEntries(element: HTMLElement) {
  const field = element.parentElement?.parentElement?.parentElement ?? element
  return [field, ...field.querySelectorAll('*')].flatMap((el, index) =>
    ['', '::before', '::after'].map(
      (pseudo) => `${index}${pseudo}|${getComputedStyle(el, pseudo || null).boxShadow}`,
    ),
  )
}

/** Of the `ring` shadows' opaque colours, the one nearest `brandFocus`, with its contrast against the card the control sits on. */
function measureRing(
  element: HTMLElement,
  { ring, brandFocus }: { ring: string[]; brandFocus: string },
) {
  type Rgba = readonly [number, number, number, number]
  const parse = (value: string): Rgba => {
    const [r = 0, g = 0, b = 0, a = 1] = value.match(/[\d.]+/g)?.map(Number) ?? []
    return [r, g, b, a]
  }
  const luminance = ([r, g, b]: Rgba) => {
    const [lr = 0, lg = 0, lb = 0] = [r, g, b].map((v) => {
      const c = v / 255
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
  }
  // The page behind the control: the first opaque background above the kit's buttons row.
  let page: Rgba = [255, 255, 255, 1]
  const start = element.closest('[data-case]')?.querySelector('[data-kit="buttons"]')
  for (let el = start?.parentElement; el; el = el.parentElement) {
    const colour = parse(getComputedStyle(el).backgroundColor)
    if (colour[3] === 1) {
      page = colour
      break
    }
  }
  const against = (colour: Rgba) => {
    const [a, b] = [luminance(colour), luminance(page)]
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  }
  const wanted = parse(brandFocus)
  const distance = (colour: Rgba) =>
    Math.max(
      Math.abs(colour[0] - wanted[0]),
      Math.abs(colour[1] - wanted[1]),
      Math.abs(colour[2] - wanted[2]),
    )
  const best = ring
    .flatMap((shadow) => shadow.match(/rgba?\([^)]*\)/g) ?? [])
    .map(parse)
    .filter((colour) => colour[3] > 0.99)
    .toSorted((x, y) => distance(x) - distance(y))[0]
  return {
    colour: best ? best.slice(0, 3).join(', ') : 'none',
    ratio: best ? against(best) : 0,
    distance: best ? distance(best) : 255,
  }
}

for (const item of brandPreviewCases) {
  for (const scheme of SCHEMES) {
    test.describe(`Colour contrast, ${item.label}, ${scheme}`, () => {
      test.beforeEach(async ({ page, isMobile }) => {
        test.skip(isMobile, 'Desktop only')
        await openPreview(page)
      })

      test('text on buttons, selected states and badges reaches 4.5:1', async ({ page }) => {
        const measured = await page.evaluate(measureTextInPage, { caseId: item.id, scheme })
        const failing = measured
          .filter(({ ratio }) => ratio < TEXT_CONTRAST)
          .map(
            ({ name, text, background, ratio }) =>
              `${name}: ${text} on ${background} = ${ratio.toFixed(2)}`,
          )
        expect(failing, 'text below 4.5:1').toEqual([])
      })

      test('the focus ring reaches 3:1 against the page and is the brand focus colour', async ({
        page,
      }) => {
        const root = page.locator(`[data-case="${item.id}"][data-scheme="${scheme}"]`)
        const targets = [
          ['primary button', root.locator('[data-kit-button="primary"]')],
          ['input', root.locator('[data-kit-input]')],
        ] as const
        const brandFocus = `rgb(${hexChannels(item.brand[scheme].focus).join(', ')})`
        for (const [name, locator] of targets) {
          await page.keyboard.press('Tab') // keyboard modality, so :focus-visible applies
          await locator.evaluate((element) => {
            ;(element as HTMLElement).blur()
          })
          const before = await locator.evaluate(shadowEntries)
          await locator.focus()
          await expect(locator).toBeFocused()
          // The ring fades in, so read it once it has stopped changing.
          let settled = await locator.evaluate(shadowEntries)
          for (let attempt = 0; attempt < 10; attempt++) {
            await page.waitForTimeout(150)
            const next = await locator.evaluate(shadowEntries)
            if (next.join() === settled.join()) break
            settled = next
          }
          const added = settled
            .filter((entry) => !before.includes(entry))
            .map((entry) => entry.slice(entry.indexOf('|') + 1))
          expect(added.length, `${name}: focus draws no ring`).toBeGreaterThan(0)
          const ring = await locator.evaluate(measureRing, { ring: added, brandFocus })
          expect(
            ring.ratio,
            `${name}: ring rgb(${ring.colour}) against the page`,
          ).toBeGreaterThanOrEqual(FOCUS_CONTRAST)
          expect(ring.distance, `${name}: ring is not the brand focus colour`).toBeLessThanOrEqual(
            2,
          )
        }
      })
    })
  }
}

function hexChannels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [value >> 16, (value >> 8) & 255, value & 255]
}

test.describe('Screenshots', () => {
  test.skip(
    process.platform !== 'linux' && !process.env.E2E_VISUAL_ANY_OS,
    'Baselines are rendered on Linux; set E2E_VISUAL_ANY_OS=1 to compare on this system anyway',
  )

  for (const item of brandPreviewCases) {
    for (const scheme of SCHEMES) {
      test(`${item.label}, ${scheme}`, async ({ page, isMobile }) => {
        test.skip(isMobile, 'Desktop only')
        await openPreview(page)
        const section = page.locator(`[data-case="${item.id}"][data-scheme="${scheme}"]`)
        await page.evaluate(() => document.fonts.ready)
        await expect(section).toHaveScreenshot(`studio-brand-${item.id}-${scheme}.png`)
      })
    }
  }

  // The preset picker examples: the grid, the collapsed row and the preset bar, light and dark.
  for (const scheme of SCHEMES) {
    test(`Preset picker, ${scheme}`, async ({ page, isMobile }) => {
      test.skip(isMobile, 'Desktop only')
      await openPreview(page)
      const examples = page.locator(`[data-picker-scheme="${scheme}"]`)
      await page.evaluate(() => document.fonts.ready)
      await expect(examples).toHaveScreenshot(`studio-brand-preset-picker-${scheme}.png`)
    })
  }
})
