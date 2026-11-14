import AxeBuilder from '@axe-core/playwright'
import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

import { FAKE_SANITY_PORT, REVALIDATE_SECRET } from './constants'
import { test } from './fixtures/test'

/**
 * A divider above the footer's copyright and links row (README, "Decorative dividers"). The fake Content Lake
 * adds it to Navigation only while this spec asks (POST /__fixture/footer-divider/<on|off>), and Playwright
 * runs it after every other spec (the `footer-divider` project), so no other test or baseline sees one. It
 * switches the divider (and the social row) off and expires the cache again when it ends.
 *
 * The fixture has Business info, so the footer's business block is directly above the divider unless the
 * social row is on: then the row sits between them and the block keeps its line. The footer's own top border,
 * against the page, always stays. With nothing above the bottom row no divider is drawn; that needs no
 * Business info, so only the unit tests cover it. It reads computed spacing and borders, not class names.
 */
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only: it sets its own widths')

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function expire(request: APIRequestContext) {
  const body = JSON.stringify({ _type: 'siteNavigation', _id: 'siteNavigation' })
  const webhook = await request.post('/api/revalidate', {
    data: body,
    headers: {
      'content-type': 'application/json',
      [SIGNATURE_HEADER_NAME]: await encodeSignatureHeader(body, Date.now(), REVALIDATE_SECRET),
    },
  })
  expect(webhook.status()).toBe(200)
}

async function use(
  request: APIRequestContext,
  state: { divider: 'on' | 'off'; social: 'on' | 'off' },
) {
  for (const [name, value] of [
    ['footer-divider', state.divider],
    ['footer-social', state.social],
  ]) {
    const control = await request.post(
      `http://localhost:${FAKE_SANITY_PORT}/__fixture/${name}/${value}`,
    )
    expect(control.status()).toBe(204)
  }
  await expire(request)
}

const footer = (page: Page) => page.getByRole('contentinfo')
const divider = (page: Page) => footer(page).locator('[data-decorative-divider]')
/** The copyright line, the first thing in the bottom row. */
const copyright = (page: Page) => footer(page).getByText('©')
const style = (locator: Locator, property: string) =>
  locator.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property)

/**
 * The first request after an expiry may still get the old copy while the new one renders, so wait for the page to
 * show BOTH things the test switched: the divider, and the social row (which the divider's presence alone cannot
 * tell: a test that only turns the social row on sees a divider in the old copy too). A test that does not turn
 * the row on waits for it to be absent, so it never reads a copy from an earlier state.
 */
const settled = async (page: Page, drawn: boolean, social = false) => {
  await expect
    .poll(
      async () => {
        await page.goto('/')
        const dividers = await divider(page).count()
        const rows = await footer(page).locator('[data-social-style]').count()
        return `divider ${String(dividers)}, social row ${String(rows)}`
      },
      { timeout: 30_000, intervals: [250, 500, 1000] },
    )
    .toBe(`divider ${drawn ? 1 : 0}, social row ${social ? 1 : 0}`)
}

test.afterAll(async ({ request }) => {
  await use(request, { divider: 'off', social: 'off' })
})

test('with none chosen, the footer keeps both fixed lines', async ({ page, request }) => {
  await use(request, { divider: 'off', social: 'off' })
  await settled(page, false)
  expect(await style(footer(page), 'border-top-width')).toBe('1px')
  expect(await style(footer(page).locator('> div').first(), 'border-bottom-width')).toBe('1px')
})

test.describe('a divider with Business info directly above it', () => {
  test.beforeEach(async ({ page, request }) => {
    await use(request, { divider: 'on', social: 'off' })
    await settled(page, true)
  })

  test('replaces the business block’s line, and never shows both', async ({ page }) => {
    expect(await style(footer(page).locator('> div').first(), 'border-bottom-width')).toBe('0px')
    // The footer's own top edge is not between the divider and anything: it stays.
    expect(await style(footer(page), 'border-top-width')).toBe('1px')
  })

  test('sits above the bottom row with 24px of its own, on the content’s left edge', async ({
    page,
  }) => {
    const block = await footer(page).locator('> div').first().boundingBox()
    const rule = await divider(page).boundingBox()
    const text = await copyright(page).boundingBox()
    if (!block || !rule || !text) throw new Error('Missing boxes')
    // 24px under the business block's own padding, so its text is 48px + 24px above the rule.
    expect(Math.round(rule.y - (block.y + block.height))).toBe(24)
    // The bottom row's own padding (3rem) under the rule's 24px.
    expect(Math.round(text.y - (rule.y + rule.height))).toBeGreaterThanOrEqual(24)
    // The same left edge as the copyright line: it is in the footer's content column.
    expect(Math.abs(rule.x - text.x)).toBeLessThan(2)
  })

  test('is decoration: no focus stops, and the links keep their order', async ({ page }) => {
    await expect(divider(page)).toHaveAttribute('aria-hidden', 'true')
    expect(await divider(page).locator('a, button, input, [tabindex]').count()).toBe(0)
    const hrefs = await footer(page)
      .locator('a')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')))
    expect(hrefs.length).toBeGreaterThan(0)
    // Tab through the footer: no stop lands inside the divider.
    await footer(page).locator('a').first().focus()
    for (const _href of hrefs) {
      expect(
        await page.evaluate(() => document.activeElement?.closest('[data-decorative-divider]')),
      ).toBeNull()
      await page.keyboard.press('Tab')
    }
  })

  for (const width of [390, 1280]) {
    test(`does not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/')
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }

  test('has no WCAG 2.2 AA violations in the footer', async ({ page }) => {
    const { violations } = await new AxeBuilder({ page }).include('footer').withTags(WCAG).analyze()
    expect(violations).toEqual([])
  })
})

test('with the social row between, the divider sits under it and the business block keeps its line', async ({
  page,
  request,
}) => {
  await use(request, { divider: 'on', social: 'on' })
  await settled(page, true, true)
  expect(await style(footer(page).locator('> div').first(), 'border-bottom-width')).toBe('1px')
  const icons = await footer(page).locator('[data-social-style]').boundingBox()
  const rule = await divider(page).boundingBox()
  if (!icons || !rule) throw new Error('Missing boxes')
  expect(rule.y).toBeGreaterThanOrEqual(icons.y + icons.height)
  expect(Math.round(rule.y - (icons.y + icons.height))).toBe(24)
})
