import AxeBuilder from '@axe-core/playwright'
import {
  expect,
  test,
  type APIRequestContext,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test'
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

import { FAKE_SANITY_PORT, REVALIDATE_SECRET } from './constants'
import { SAMPLE_PRIMARY } from './fixtures/dataset.mjs'

/**
 * Studio brand colours (README, "Colour systems"): the designSettings singleton rendered by SiteShell
 * as :root CSS variables. The fake Content Lake serves the sample palettes; the tests expire the cached
 * settings with a signed webhook, as the real one does.
 */
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only')
const isMobile = (testInfo: TestInfo) => Boolean(testInfo.project.use.isMobile)

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const TONES = ['surface', 'alt', 'inverse', 'accent'] as const
const GALLERY = '/section-gallery'
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`
const DEFAULT_CTA = 'rgb(3, 7, 18)'
const SAMPLE_CTA = 'rgb(11, 110, 79)' // SAMPLE_PRIMARY

type Palette = 'off' | 'light' | 'dark'

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
}

const headerButton = (page: Page) =>
  page.locator('header').getByRole('link', { name: 'Contact' }).first()

/**
 * A CSS property of an element as "rgb(r, g, b)": tokens.json's colours are oklch, which the browser
 * reports as lab(), so the colour is painted on a canvas to read it back in sRGB.
 */
const rgbOf = (locator: Locator, property: 'backgroundColor' | 'color') =>
  locator.evaluate((element, name) => {
    const context = document.createElement('canvas').getContext('2d')
    if (!context) throw new Error('No canvas')
    context.fillStyle = getComputedStyle(element)[name]
    context.fillRect(0, 0, 1, 1)
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data
    return `rgb(${r}, ${g}, ${b})`
  }, property)

/** The first request after an expiry may still get the old copy while the new one renders. */
const buttonBackground = (page: Page) => async () => {
  await page.goto('/')
  return rgbOf(headerButton(page), 'backgroundColor')
}

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

test.afterAll(async ({ request }, testInfo) => {
  if (isMobile(testInfo)) return
  test.setTimeout(30_000)
  await usePalette(request, 'off')
})

test.describe('with nothing set', () => {
  test('renders no override and the primary button is tokens.json’s', async ({ page, request }) => {
    await usePalette(request, 'off')
    await expect.poll(buttonBackground(page)).toBe(DEFAULT_CTA)
    await expect(page.locator('style[data-href="design-settings"]')).toHaveCount(0)
  })
})

test.describe('with a sample palette', () => {
  test('the primary button takes the Primary colour, server-rendered with JavaScript off', async ({
    browser,
    request,
  }) => {
    await usePalette(request, 'light')
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    try {
      await expect
        .poll(async () => {
          await page.goto('/')
          return rgbOf(headerButton(page), 'backgroundColor')
        })
        .toBe(SAMPLE_CTA)
      const style = await page.locator('style[data-href="design-settings"]').textContent()
      expect(style).toContain(`--color-accent:${SAMPLE_PRIMARY}`)
      expect(style).toContain('--gradient-forest-dusk:linear-gradient(135deg, #0b6e4f, #1b3a4b)')
      // The text on the button is the derived, readable colour (white on this green).
      expect(await rgbOf(headerButton(page), 'color')).toBe('rgb(255, 255, 255)')
    } finally {
      await context.close()
    }
  })

  test('adds no JavaScript to the home page', async ({ page, request }) => {
    const scripts = async () => {
      const urls: string[] = []
      const listener = (response: {
        url: () => string
        request: () => { resourceType: () => string }
      }) => {
        if (response.request().resourceType() === 'script')
          urls.push(new URL(response.url()).pathname)
      }
      page.on('response', listener)
      await page.goto('/', { waitUntil: 'networkidle' })
      page.off('response', listener)
      return urls.sort()
    }
    await usePalette(request, 'off')
    await expect.poll(buttonBackground(page)).toBe(DEFAULT_CTA)
    const plain = await scripts()
    await usePalette(request, 'light')
    await expect.poll(buttonBackground(page)).toBe(SAMPLE_CTA)
    expect(await scripts()).toEqual(plain)
  })

  test('the Open Graph image is drawn in the Primary colour', async ({ request }) => {
    const image = async () => {
      const response = await request.get('/api/og/about')
      expect(response.status()).toBe(200)
      expect(response.headers()['content-type']).toBe('image/png')
      return (await response.body()).toString('base64')
    }
    await usePalette(request, 'off')
    let plain = ''
    await expect.poll(async () => (plain = await image())).not.toBe('')
    await usePalette(request, 'light')
    await expect.poll(image).not.toBe(plain)
  })

  for (const palette of ['light', 'dark'] as const) {
    for (const tone of TONES) {
      test(`${palette} palette: the ${tone} tone has no WCAG 2.2 AA violations`, async ({
        page,
        request,
      }) => {
        await usePalette(request, palette)
        await expect
          .poll(async () => {
            await page.goto(GALLERY)
            return page.evaluate(() =>
              getComputedStyle(document.documentElement).getPropertyValue('color-scheme'),
            )
          })
          .toBe(palette === 'dark' ? 'dark' : 'normal')

        const section = `[data-gallery-section="features-grid-style-${tone}"]`
        await expect(page.locator(`${section} section`)).toHaveAttribute('data-tone', tone)
        const { violations } = await new AxeBuilder({ page })
          .include(section)
          .withTags(WCAG)
          .analyze()
        expect(
          violations.map(
            ({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`,
          ),
        ).toEqual([])
      })
    }

    test(`${palette} palette: the home page has no WCAG 2.2 AA violations`, async ({
      page,
      request,
    }) => {
      await usePalette(request, palette)
      await expect
        .poll(async () => {
          await page.goto('/')
          return rgbOf(page.locator('body'), 'backgroundColor')
        })
        .toBe(palette === 'dark' ? 'rgb(3, 7, 18)' : 'rgb(255, 255, 255)')
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
      expect(violations.map(({ id }) => id)).toEqual([])
    })
  }
})
