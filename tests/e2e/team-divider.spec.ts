import AxeBuilder from '@axe-core/playwright'
import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

import { FAKE_SANITY_PORT, REVALIDATE_SECRET } from './constants'
import { test } from './fixtures/test'

/**
 * A divider between a team member's summary and biography (README, "Decorative dividers"). The fake Content
 * Lake adds Team page settings with one only while this spec asks (POST /__fixture/team-divider/<on|off>), and
 * Playwright runs it after every other spec (the `team-divider` project), so no other test or baseline sees one.
 * It switches the divider off and expires the cache again when it ends. Ann has a biography and contact
 * details, Ben a biography and none, Dev contact details and no biography. It reads computed margins and
 * positions, not class names.
 */
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only: it sets its own widths')

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function use(request: APIRequestContext, state: 'on' | 'off') {
  const control = await request.post(
    `http://localhost:${FAKE_SANITY_PORT}/__fixture/team-divider/${state}`,
  )
  expect(control.status()).toBe(204)
  const body = JSON.stringify({ _type: 'teamPageSettings', _id: 'teamPageSettings' })
  const webhook = await request.post('/api/revalidate', {
    data: body,
    headers: {
      'content-type': 'application/json',
      [SIGNATURE_HEADER_NAME]: await encodeSignatureHeader(body, Date.now(), REVALIDATE_SECRET),
    },
  })
  expect(webhook.status()).toBe(200)
}

const divider = (page: Page) => page.locator('article [data-decorative-divider]')
/** The summary: the portrait and the header, in one grid. */
const summary = (page: Page) => page.locator('article > div').first()
const bio = (page: Page, text: string) =>
  page.locator('article > div').filter({ hasText: text }).last()
const margin = (locator: Locator) => locator.evaluate((node) => getComputedStyle(node).marginTop)
const borderTop = (locator: Locator) =>
  locator.evaluate((node) => getComputedStyle(node).borderTopWidth)

/** The first request after an expiry may still get the old copy while the new one renders. */
const settled = async (page: Page, path: string, drawn: boolean) => {
  await expect
    .poll(
      async () => {
        await page.goto(path)
        return divider(page).count()
      },
      { timeout: 30_000, intervals: [250, 500, 1000] },
    )
    .toBe(drawn ? 1 : 0)
}

const ANN = '/team/ann-lee'
const ANN_BIO = 'Ann founded the practice in 2004.'

test.afterAll(async ({ request }) => {
  await use(request, 'off')
})

test('with none chosen, the biography keeps its usual margin and the contact line stays', async ({
  page,
  request,
}) => {
  await use(request, 'off')
  await settled(page, ANN, false)
  expect(await margin(bio(page, ANN_BIO))).toBe('48px')
  expect(await borderTop(page.locator('section[aria-labelledby="contact-heading"]'))).toBe('1px')
})

test.describe('with a divider chosen', () => {
  test.beforeEach(async ({ page, request }) => {
    await use(request, 'on')
    await settled(page, ANN, true)
  })

  test('sits between the summary and the biography, 24px from each', async ({ page }) => {
    const above = await summary(page).boundingBox()
    const rule = await divider(page).boundingBox()
    const first = await bio(page, ANN_BIO).locator('> *').first().boundingBox()
    if (!above || !rule || !first) throw new Error('Missing boxes')
    expect(Math.round(rule.y - (above.y + above.height))).toBe(24)
    expect(Math.round(first.y - (rule.y + rule.height))).toBe(24)
    // Starts where the page's text starts.
    expect(Math.abs(rule.x - above.x)).toBeLessThan(2)
  })

  test('takes the biography’s space: its margins are 0, not added to the divider’s', async ({
    page,
  }) => {
    expect(await margin(bio(page, ANN_BIO))).toBe('0px')
    expect(await margin(bio(page, ANN_BIO).locator('> *').first())).toBe('0px')
  })

  test('leaves the contact section’s own line in place', async ({ page }) => {
    const contact = page.locator('section[aria-labelledby="contact-heading"]')
    expect(await borderTop(contact)).toBe('1px')
    expect(await margin(contact)).toBe('48px')
  })

  test('is drawn for a member with a biography and no contact details', async ({ page }) => {
    await settled(page, '/team/ben-ng', true)
    await expect(page.locator('section[aria-labelledby="contact-heading"]')).toHaveCount(0)
  })

  test('is not drawn for a member with no biography', async ({ page }) => {
    await settled(page, '/team/dev-patel', false)
    // Contact details still follow the summary as they always did.
    expect(await margin(page.locator('section[aria-labelledby="contact-heading"]'))).toBe('48px')
  })

  test('is decoration: no focus stop lands in it, and it is hidden from assistive technology', async ({
    page,
  }) => {
    await expect(divider(page)).toHaveAttribute('aria-hidden', 'true')
    expect(await divider(page).locator('a, button, input, [tabindex]').count()).toBe(0)
    const links = await page.locator('article a').count()
    await page.locator('article a').first().focus()
    for (let index = 0; index <= links; index++) {
      expect(
        await page.evaluate(() => document.activeElement?.closest('[data-decorative-divider]')),
      ).toBeNull()
      await page.keyboard.press('Tab')
    }
  })

  for (const width of [390, 1280]) {
    test(`does not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto(ANN)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const { violations } = await new AxeBuilder({ page })
      .include('article')
      .withTags(WCAG)
      .analyze()
    expect(violations).toEqual([])
  })
})
