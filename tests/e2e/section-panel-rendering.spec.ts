import AxeBuilder from '@axe-core/playwright'
import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

import { FAKE_SANITY_PORT, REVALIDATE_SECRET } from './constants'
import { test } from './fixtures/test'

/**
 * Section panels as the browser draws them (README, "Section panels"), under the site's own palettes
 * (default, a sample light one and a dark one), over a black and a white picture, and for visitors who
 * ask for less transparency or whose browser cannot blur. Whether text is readable is measured from the
 * rendered pixels in the padding above the text, never assumed from the colours.
 *
 * It switches the colours the whole fake site is served in, so it runs alone (playwright.config.ts).
 */
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only')

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PAGE = '/glass-panels'
const READABLE = 4.5
const PALETTES = ['off', 'light', 'dark'] as const
type Palette = (typeof PALETTES)[number]

const svg = (fill: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="${fill}"/></svg>`

/** Serves a palette, then expires the cached settings the way the Sanity webhook does. */
async function usePalette(request: APIRequestContext, palette: Palette) {
  const control = await request.post(
    `http://localhost:${FAKE_SANITY_PORT}/__fixture/design/${palette}`,
  )
  expect(control.status()).toBe(204)
  const body = JSON.stringify({ _type: 'designSettings', _id: 'designSettings' })
  const webhook = await request.post('/api/revalidate', {
    data: body,
    headers: {
      'content-type': 'application/json',
      [SIGNATURE_HEADER_NAME]: await encodeSignatureHeader(body, Date.now(), REVALIDATE_SECRET),
    },
  })
  expect(webhook.status()).toBe(200)
  // The page refreshes in the background (the first request after a change still gets the old render),
  // so wait until it draws the new palette: the bare picture on dark Inverse is the one that differs.
  await expect
    .poll(
      async () => {
        const html = await (await request.get(PAGE)).text()
        return /id="rp-picture-bare".*?data-panel="(\w+)"/s.exec(html)?.[1]
      },
      { timeout: 30_000 },
    )
    .toBe(palette === 'dark' ? 'solid' : 'frosted')
}

test.afterAll(async ({ request }) => {
  await usePalette(request, 'off')
})

const panelIn = (page: Page, id: string) => page.locator(`#${id} [data-panel]`)

interface Drawn {
  render: string | null
  backdropFilter: string
  background: string
}

const drawn = (panel: Locator): Promise<Drawn> =>
  panel.evaluate((el) => ({
    render: el.getAttribute('data-panel'),
    backdropFilter: getComputedStyle(el).backdropFilter,
    background: getComputedStyle(el).backgroundColor,
  }))

/**
 * The weakest contrast between the section's text colours and the panel as painted, over the strip of
 * panel padding above the text (nothing is drawn there but the panel and what shows through it).
 */
async function weakestContrast(panel: Locator): Promise<number> {
  const measured = await measure(panel)
  test.info().annotations.push({ type: 'contrast', description: `${measured.toFixed(2)}:1` })
  return measured
}

async function measure(panel: Locator): Promise<number> {
  const png = (await panel.screenshot()).toString('base64')
  return panel.evaluate(async (el, data) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('No canvas')
    const rgbOf = (colour: string) => {
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = '#000'
      context.fillStyle = colour
      context.fillRect(0, 0, 1, 1)
      const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
      return [r, g, b] as const
    }
    const luminance = ([r, g, b]: readonly [number, number, number]) => {
      const lin = (v: number) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    }
    const ratio = (a: readonly [number, number, number], b: readonly [number, number, number]) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
      return (hi + 0.05) / (lo + 0.05)
    }
    const texts = ['h2', 'p']
      .map((selector) => el.querySelector(selector))
      .filter((node): node is Element => node !== null)
      .map((node) => rgbOf(getComputedStyle(node).color))

    const image = new Image()
    image.src = `data:image/png;base64,${data}`
    await image.decode()
    canvas.width = image.width
    canvas.height = image.height
    context.drawImage(image, 0, 0)
    const style = getComputedStyle(el)
    const inset = Math.ceil(parseFloat(style.borderTopLeftRadius) || 0) + 4
    const bottom = Math.floor(parseFloat(style.paddingTop)) - 4
    const width = image.width - inset * 2
    const height = Math.max(1, bottom - 4)
    const pixels = context.getImageData(inset, 4, width, height).data
    let worst = Number.POSITIVE_INFINITY
    for (let i = 0; i < pixels.length; i += 4) {
      const pixel = [pixels[i] ?? 0, pixels[i + 1] ?? 0, pixels[i + 2] ?? 0] as const
      for (const text of texts) worst = Math.min(worst, ratio(text, pixel))
    }
    return worst
  }, png)
}

test.describe('under each palette', () => {
  for (const palette of PALETTES) {
    test.describe(palette, () => {
      test.beforeAll(async ({ request }) => {
        await usePalette(request, palette)
      })

      test('chooses tinted, frosted or solid by what is behind the panel', async ({ page }) => {
        await page.goto(PAGE)
        // Glass over a solid tone is a tint with no blur; over a picture it is frosted.
        const solidTone = await drawn(panelIn(page, 'rp-solid-tone'))
        expect(solidTone).toMatchObject({ render: 'tinted', backdropFilter: 'none' })
        const picture = await drawn(panelIn(page, 'rp-picture'))
        expect(picture.render).toBe('frosted')
        expect(picture.backdropFilter).toContain('blur')
        expect((await drawn(panelIn(page, 'rp-solid-card'))).render).toBe('solid')

        // The dark palette has no gradients, so the section draws none and the panel is a plain tint.
        const gradient = await drawn(panelIn(page, 'rp-gradient'))
        expect(gradient.render).toBe(palette === 'dark' ? 'tinted' : 'frosted')

        // A bare picture on the dark Inverse tone cannot hold 4.5:1 at any see-through strength, so the
        // panel falls back to solid; with the other palettes it only needs more opacity.
        const bare = await drawn(panelIn(page, 'rp-picture-bare'))
        expect(bare.render).toBe(palette === 'dark' ? 'solid' : 'frosted')
        if (bare.render === 'solid') {
          expect(bare.backdropFilter).toBe('none')
          expect(bare.background).not.toMatch(/\/ 0\.\d+\)|rgba\(.*, 0\.\d+\)/)
        }
      })

      test('every panel is readable as painted', async ({ page }) => {
        await page.goto(PAGE)
        for (const id of [
          'rp-solid-tone',
          'rp-picture',
          'rp-picture-bare',
          'rp-gradient',
          'rp-solid-card',
        ]) {
          const worst = await weakestContrast(panelIn(page, id))
          expect(worst, `${id} under ${palette}`).toBeGreaterThanOrEqual(READABLE)
        }
      })

      test('passes axe', async ({ page }) => {
        await page.goto(PAGE)
        const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
        expect(results.violations).toEqual([])
      })
    })
  }
})

test.describe('over the darkest and the lightest picture', () => {
  test.beforeAll(async ({ request }) => {
    await usePalette(request, 'off')
  })

  for (const [name, fill] of [
    ['black', '#000000'],
    ['white', '#ffffff'],
  ] as const) {
    test(`stays readable over a ${name} picture`, async ({ page }) => {
      await page.route('https://cdn.sanity.io/**', (route) =>
        route.fulfill({ contentType: 'image/svg+xml', body: svg(fill) }),
      )
      await page.goto(PAGE)
      for (const id of ['rp-picture', 'rp-picture-bare']) {
        const worst = await weakestContrast(panelIn(page, id))
        expect(worst, `${id} over ${name}`).toBeGreaterThanOrEqual(READABLE)
      }
    })
  }
})

test.describe('visitors and browsers that cannot show glass', () => {
  test.beforeAll(async ({ request }) => {
    await usePalette(request, 'off')
  })

  test.beforeEach(async ({ page }) => {
    await page.route('https://cdn.sanity.io/**', (route) =>
      route.fulfill({ contentType: 'image/svg+xml', body: svg('#6366f1') }),
    )
  })

  const opaque = (background: string) => !/\/ 0\.\d+\)|rgba\(.*, 0\.\d+\)/.test(background)

  test('reduced transparency draws opaque panels, with no blur', async ({ page }) => {
    // The browser's own media feature, emulated; the motion preference is kept (it is the suite's default).
    const session = await page.context().newCDPSession(page)
    await session.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-reduced-motion', value: 'reduce' },
        { name: 'prefers-reduced-transparency', value: 'reduce' },
      ],
    })
    await page.goto(PAGE)
    expect(
      await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches),
    ).toBe(true)
    for (const id of ['rp-solid-tone', 'rp-picture', 'rp-gradient']) {
      const panel = await drawn(panelIn(page, id))
      expect(panel.backdropFilter, id).toBe('none')
      expect(opaque(panel.background), `${id}: ${panel.background}`).toBe(true)
      expect(await weakestContrast(panelIn(page, id)), id).toBeGreaterThanOrEqual(READABLE)
    }
  })

  test('a browser that does not know backdrop-filter draws opaque panels', async ({ page }) => {
    // Chromium knows the property, and no engine we can run does not. So the shipped stylesheet is served
    // with the property renamed everywhere: to the engine it really is an unknown property, in the
    // @supports test and in every declaration, as it is to a browser without it.
    await page.route(/\.css(\?.*)?$/, async (route) => {
      const response = await route.fetch()
      const css = (await response.text()).replace(
        /(-webkit-)?backdrop-filter/g,
        'x-backdrop-filter',
      )
      await route.fulfill({ response, body: css })
    })
    await page.goto(PAGE)
    expect(await page.evaluate(() => CSS.supports('x-backdrop-filter', 'blur(1px)'))).toBe(false)
    for (const id of ['rp-picture', 'rp-gradient']) {
      const panel = await drawn(panelIn(page, id))
      expect(panel.render, id).toBe('frosted')
      expect(panel.backdropFilter, id).toBe('none')
      expect(opaque(panel.background), `${id}: ${panel.background}`).toBe(true)
      expect(await weakestContrast(panelIn(page, id)), id).toBeGreaterThanOrEqual(READABLE)
    }
  })
})
