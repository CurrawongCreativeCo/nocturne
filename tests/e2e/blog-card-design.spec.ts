import AxeBuilder from '@axe-core/playwright'
import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

import { FAKE_SANITY_PORT, REVALIDATE_SECRET } from './constants'
import { test } from './fixtures/test'

/**
 * The blog's post cards with a design from Blog settings (task 156): the index, a category page and a post's
 * related posts, at a phone and a desktop width. The fake Content Lake adds the settings only while this spec
 * asks (POST /__fixture/blog-settings), and Playwright runs it after every other spec (the
 * `blog-card-design` project), so no other test or baseline sees a designed card. It switches the design off
 * and expires the cache again when it ends, as design-settings.spec.ts does for its palettes.
 */
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only: it sets its own widths')

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]
const PAGES = ['/blog', '/blog/category/news']
const CARD = 'main article'

/** Switches the design, then expires the cached settings the way the Sanity webhook does. */
async function useDesign(request: APIRequestContext, design: 'on' | 'off') {
  const control = await request.post(
    `http://localhost:${FAKE_SANITY_PORT}/__fixture/blog-settings/${design}`,
  )
  expect(control.status()).toBe(204)
  const body = JSON.stringify({ _type: 'blogSettings', _id: 'blogSettings' })
  const webhook = await request.post('/api/revalidate', {
    data: body,
    headers: {
      'content-type': 'application/json',
      [SIGNATURE_HEADER_NAME]: await encodeSignatureHeader(body, Date.now(), REVALIDATE_SECRET),
    },
  })
  expect(webhook.status()).toBe(200)
}

/**
 * The page once it shows the design asked for. The webhook expires the cache stale-while-revalidate, so the
 * first visit afterwards may still be served the old page: reload until the cards say otherwise.
 */
const settled = async (page: Page, path: string, designed = true) => {
  await expect
    .poll(
      async () => {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        return (await page.locator('main article [data-decorative-mark]').count()) > 0
      },
      { timeout: 30_000, intervals: [250, 500, 1000] },
    )
    .toBe(designed)
}

test.afterAll(async ({ request }) => {
  await useDesign(request, 'off')
})

test('with no design, a post card is what it always was', async ({ page, request }) => {
  await useDesign(request, 'off')
  await settled(page, '/blog', false)
  const card = page.locator(CARD).first()
  await expect(card).toHaveClass(/^group relative flex h-full flex-col$/)
  await expect(page.locator('[data-decorative-mark]')).toHaveCount(0)
})

for (const viewport of WIDTHS) {
  test.describe(`at ${String(viewport.width)} px, designed`, () => {
    test.use({ viewport })

    test.beforeEach(async ({ request }) => {
      await useDesign(request, 'on')
    })

    for (const path of PAGES) {
      test(`${path}: every card has the fill, border, text and mark, and nothing leaves the window`, async ({
        page,
      }) => {
        await settled(page, path)
        const cards = page.locator(CARD)
        expect(await cards.count()).toBeGreaterThan(0)
        for (const card of await cards.all()) {
          expect(
            await card.evaluate((element) => getComputedStyle(element).backgroundColor),
          ).not.toBe('rgba(0, 0, 0, 0)')
          expect(await card.evaluate((element) => getComputedStyle(element).borderRadius)).not.toBe(
            '0px',
          )
          const mark = card.locator('> [data-decorative-mark="card"]')
          await expect(mark).toHaveCount(1)
          expect(await mark.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe(
            'none',
          )
          // The mark never leaves its card.
          const [markBox, cardBox] = await Promise.all([mark.boundingBox(), card.boundingBox()])
          if (!markBox || !cardBox) throw new Error('The mark or its card has no box.')
          expect(markBox.x).toBeGreaterThanOrEqual(cardBox.x)
          expect(markBox.x + markBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1)
          await expect(card.locator('[data-text-role="title"]')).toHaveClass(/font-medium/)
        }
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }))
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
      })

      test(`${path}: axe finds nothing on the designed cards`, async ({ page }) => {
        await settled(page, path)
        const results = await new AxeBuilder({ page }).include('main').analyze()
        expect(
          results.violations.flatMap(({ id, nodes }) => nodes.map((node) => `${id}: ${node.html}`)),
        ).toEqual([])
      })
    }

    test('a post’s related posts take the same design, and the card is still one link', async ({
      page,
    }) => {
      await settled(page, '/blog/welcome-to-the-blog')
      const related = page.locator('section[aria-labelledby="related-posts"] article')
      expect(await related.count()).toBeGreaterThan(0)
      await expect(related.first().locator('> [data-decorative-mark="card"]')).toHaveCount(1)
      await expect(related.first().locator('a')).toHaveCount(1)
    })

    test('the whole card still opens its post', async ({ page }) => {
      await settled(page, '/blog')
      const card = page.locator(CARD).first()
      const href = await card.locator('a').first().getAttribute('href')
      await card.click({ position: { x: 8, y: 8 } })
      await expect(page).toHaveURL(new RegExp(`${href ?? '/blog/'}$`))
    })
  })
}

test('switching the design off restores the plain card', async ({ page, request }) => {
  await useDesign(request, 'on')
  await settled(page, '/blog')
  await expect(page.locator('[data-decorative-mark="card"]').first()).toBeAttached()
  await useDesign(request, 'off')
  await settled(page, '/blog', false)
  await expect(page.locator('[data-decorative-mark]')).toHaveCount(0)
  await expect(page.locator(CARD).first()).toHaveClass(/^group relative flex h-full flex-col$/)
})
