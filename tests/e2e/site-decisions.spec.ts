import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

import { FAKE_SANITY_PORT, REVALIDATE_SECRET } from './constants'
import { test } from './fixtures/test'

/**
 * Site-wide Density and Shape (README, "Brand colours and design"; task 216b). `/site-decisions` has the
 * same quote section four times: with no spacing chosen and with Compact, Default and Spacious. A density
 * moves the Default spacing (and so a section with nothing chosen); a section that chose Compact or
 * Spacious keeps its own. A shape moves `--radius-card`. With nothing set the page is what tokens.json
 * defines. Read from computed styles, so the tests are the same at any root font size of 16px.
 */
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only')

type Palette = 'off' | 'density-airy' | 'density-compact' | 'shape-round' | 'shape-sharp'

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

const section = (page: Page, name: string) =>
  page
    .locator('#main-content section')
    .filter({ has: page.getByRole('heading', { name: `Spacing ${name}` }) })
/** The quote card: a `figure` drawn with `rounded-card`, one in each fixture section. */
const card = (page: Page, name: string) => section(page, name).locator('figure')
const px = (locator: Locator, property: 'paddingTop' | 'borderTopLeftRadius') =>
  locator.evaluate((element, name) => Number.parseFloat(getComputedStyle(element)[name]), property)
const paddingOf = (page: Page, name: string) => px(section(page, name), 'paddingTop')
const radiusOf = (page: Page, name: string) => px(card(page, name), 'borderTopLeftRadius')

/** The first request after an expiry may still get the old copy, so it is polled. */
const read = (page: Page, value: () => Promise<number>) => async () => {
  await page.goto('/site-decisions')
  return value()
}

test.describe('Density', () => {
  // Spacious is a clamp() of the viewport width, so it is read here and compared under each density.
  let spacious = 0

  test('with nothing set, Default and unset sections use today’s 96px and Compact 64px', async ({
    page,
    request,
  }) => {
    await usePalette(request, 'off')
    await page.goto('/site-decisions')
    expect(await paddingOf(page, 'unset')).toBe(96)
    expect(await paddingOf(page, 'default')).toBe(96)
    expect(await paddingOf(page, 'compact')).toBe(64)
    spacious = await paddingOf(page, 'spacious')
    expect(spacious).toBeGreaterThanOrEqual(128)
  })

  test('Airy gives a section with no spacing set more vertical padding, and a Compact section keeps its own', async ({
    page,
    request,
  }) => {
    await usePalette(request, 'density-airy')
    await expect.poll(read(page, () => paddingOf(page, 'unset'))).toBe(120)
    // Explicit spacing overrides the site's density (task 216 acceptance).
    expect(await paddingOf(page, 'compact')).toBe(64)
    expect(await paddingOf(page, 'default')).toBe(120)
    // Likewise a section that chose Spacious.
    expect(await paddingOf(page, 'spacious')).toBe(spacious)
  })

  test('Compact tightens a section with no spacing set, and a Compact section stays 64px', async ({
    page,
    request,
  }) => {
    await usePalette(request, 'density-compact')
    await expect.poll(read(page, () => paddingOf(page, 'unset'))).toBe(72)
    expect(await paddingOf(page, 'compact')).toBe(64)
    expect(await paddingOf(page, 'default')).toBe(72)
    expect(await paddingOf(page, 'spacious')).toBe(spacious)
  })

  test('the choice is in the first response: no client script or flash is needed', async ({
    request,
  }) => {
    await usePalette(request, 'density-airy')
    await expect
      .poll(async () => {
        const response = await request.get('/site-decisions')
        return /--spacing-section:\s*7\.5rem/.test(await response.text())
      })
      .toBe(true)
  })
})

test.describe('Shape', () => {
  test('with nothing set, a card has today’s 16px corners', async ({ page, request }) => {
    await usePalette(request, 'off')
    await page.goto('/site-decisions')
    expect(await radiusOf(page, 'unset')).toBe(16)
    expect(await radiusOf(page, 'compact')).toBe(16)
  })

  test('Round changes --radius-card to 28px on every card, whatever its section spacing', async ({
    page,
    request,
  }) => {
    await usePalette(request, 'shape-round')
    await expect.poll(read(page, () => radiusOf(page, 'unset'))).toBe(28)
    expect(await radiusOf(page, 'compact')).toBe(28)
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--radius-card'),
      ),
    ).toBe('1.75rem')
  })

  test('Sharp gives 4px corners, and Density is untouched by it', async ({ page, request }) => {
    await usePalette(request, 'shape-sharp')
    await expect.poll(read(page, () => radiusOf(page, 'unset'))).toBe(4)
    expect(await radiusOf(page, 'compact')).toBe(4)
    expect(await paddingOf(page, 'unset')).toBe(96)
  })

  test.afterAll(async ({ request }) => {
    await usePalette(request, 'off')
  })
})
