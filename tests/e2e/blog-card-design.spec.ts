import AxeBuilder from '@axe-core/playwright'
import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

import { FAKE_SANITY_PORT, REVALIDATE_SECRET } from './constants'
import { test } from './fixtures/test'
import { clipReading } from './picture-depth-helpers'

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
async function useDesign(
  request: APIRequestContext,
  design: 'on' | 'lift' | 'off' | `depth-${'raised' | 'floating' | 'glow' | 'glowOnly' | 'flat'}`,
) {
  const control = await request.post(
    `http://localhost:${FAKE_SANITY_PORT}/__fixture/blog-settings/${design}`,
  )
  expect(control.status()).toBe(204)
  // The depth variants also add (and `off` removes) a post with no picture, so the posts' cache expires too.
  const types = [
    { _type: 'blogSettings', _id: 'blogSettings' },
    { _type: 'post', _id: 'post-a-post-with-no-picture' },
  ]
  for (const document of types) {
    const body = JSON.stringify(document)
    const webhook = await request.post('/api/revalidate', {
      data: body,
      headers: {
        'content-type': 'application/json',
        [SIGNATURE_HEADER_NAME]: await encodeSignatureHeader(body, Date.now(), REVALIDATE_SECRET),
      },
    })
    expect(webhook.status()).toBe(200)
  }
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

/**
 * Depth, glow and Hover lift from Blog settings (task 146). A post card is one link, so with Lift chosen
 * every card is wrapped in a block that rises under the pointer and keyboard focus; the shadow in place of
 * none comes from the chosen level, over the card's border.
 */
test.describe('with a shadow, a glow and Lift', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })

  const wrapper = (page: Page) => page.locator('main .card-lift').first()
  const rise = (element: ReturnType<typeof wrapper>) =>
    element.evaluate((node) => {
      const value = getComputedStyle(node).transform
      return value === 'none' ? 0 : -Number.parseFloat(value.split(',')[5] ?? '0')
    })

  test.beforeEach(async ({ request }) => {
    await useDesign(request, 'lift')
  })

  test('every card draws the chosen shadow and rises on hover and keyboard focus', async ({
    page,
  }) => {
    await settled(page, '/blog')
    const cards = page.locator(CARD)
    expect(await cards.count()).toBeGreaterThan(0)
    for (const card of await cards.all()) {
      const shadow = await card.evaluate((element) => getComputedStyle(element).boxShadow)
      expect(shadow).toContain('0px 10px 15px -3px')
      expect(shadow).toMatch(/0px 0px 18px 0px/)
    }
    expect(await rise(wrapper(page))).toBe(0)
    await wrapper(page).hover()
    await expect.poll(() => rise(wrapper(page))).toBe(4)
    await page.mouse.move(0, 0)
    await expect.poll(() => rise(wrapper(page))).toBe(0)
    const link = wrapper(page).locator('a').first()
    for (let step = 0; step < 120; step++) {
      await page.keyboard.press('Tab')
      if (await link.evaluate((element) => element === document.activeElement)) break
    }
    await expect.poll(() => rise(wrapper(page))).toBe(4)
  })

  test.describe('and reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('nothing moves', async ({ page }) => {
      await settled(page, '/blog')
      await wrapper(page).hover()
      await page.waitForTimeout(400)
      expect(await rise(wrapper(page))).toBe(0)
    })
  })

  test('axe finds nothing, and the card is still one link', async ({ page }) => {
    await settled(page, '/blog')
    const results = await new AxeBuilder({ page }).include('main').analyze()
    expect(
      results.violations.flatMap(({ id, nodes }) => nodes.map((node) => `${id}: ${node.html}`)),
    ).toEqual([])
    await expect(wrapper(page).locator('a')).toHaveCount(1)
  })
})

/**
 * A shadow and glow on the post cards' pictures from Blog settings › Post card pictures (task 147). The filter is
 * on the picture, never the card; a card with no picture is as it was; and the card keeps its one link, its hover
 * and its focus. While a depth is on, the fake lake also serves a post with no picture (the index's newest).
 */
test.describe('with a depth on the pictures', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  const NO_PICTURE = 'A post with no picture'
  const filtered = (page: Page) => page.locator(`${CARD} img`).first()
  const filterOf = (page: Page) => filtered(page).evaluate((el) => getComputedStyle(el).filter)

  /** The page once the depth asked for is showing: the first picture's filter says so. */
  const settledDepth = async (page: Page, path: string, expected: string | null) => {
    await expect
      .poll(
        async () => {
          await page.goto(path)
          await page.waitForLoadState('networkidle')
          const count = await page.locator(`${CARD} img`).count()
          if (count === 0) return 'no pictures'
          return (await filterOf(page)) === 'none' ? null : await filterOf(page)
        },
        { timeout: 30_000, intervals: [250, 500, 1000] },
      )
      .toEqual(expected === null ? null : expect.stringContaining(expected))
  }
  const noPictureCard = (page: Page) =>
    page.locator(CARD).filter({ has: page.getByRole('link', { name: NO_PICTURE }) })

  for (const [design, expected] of [
    ['raised', '0px 4px 6px'],
    ['floating', '0px 20px 28px'],
    ['glow', '0px 0px 14px'],
    ['glowOnly', '0px 0px 14px'],
  ] as const) {
    test(`${design}: every card with a picture carries the shadow on its picture, not on the card`, async ({
      page,
      request,
    }) => {
      await useDesign(request, `depth-${design}`)
      for (const path of PAGES) {
        await settledDepth(page, path, expected)
        const cards = page.locator(CARD).filter({ has: page.locator('img') })
        expect(await cards.count()).toBeGreaterThan(0)
        for (const card of await cards.all()) {
          expect(
            await card.locator('img').evaluate((el) => getComputedStyle(el).filter),
            path,
          ).toContain(expected)
          // The card itself is not filtered.
          expect(await card.evaluate((el) => getComputedStyle(el).filter), path).toBe('none')
        }
      }
    })
  }

  test('Flat with Glow off is the same as nothing: no filter on any picture', async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000)
    // Start from a depth that does draw a filter, so waiting for it to go is the signal that Flat is showing.
    await useDesign(request, 'depth-glowOnly')
    await settledDepth(page, '/blog', '0px 0px 14px')
    await useDesign(request, 'depth-flat')
    await expect
      .poll(
        async () => {
          await page.goto('/blog')
          await page.waitForLoadState('networkidle')
          const all = await page.locator(`${CARD} img`).all()
          const filters = await Promise.all(
            all.map((img) => img.evaluate((el) => getComputedStyle(el).filter)),
          )
          return all.length > 0 && filters.every((value) => value === 'none')
        },
        { timeout: 60_000, intervals: [250, 500, 1000] },
      )
      .toBe(true)
  })

  test('a card with no picture is exactly as it was: no picture, no filter, no padding of its own', async ({
    page,
    request,
  }) => {
    await useDesign(request, 'depth-floating')
    await settledDepth(page, '/blog', '0px 20px 28px')
    const card = noPictureCard(page)
    await expect(card).toHaveCount(1)
    await expect(card.locator('img')).toHaveCount(0)
    expect(
      await card.evaluate(
        (el) => el.querySelectorAll('[class*="depth-filter"], [style*="depth-filter"]').length,
      ),
    ).toBe(0)
    await expect(card).toHaveClass(/^group relative flex h-full flex-col$/)
  })

  test('the picture’s filter changes neither the card’s size nor the page’s layout', async ({
    page,
    request,
  }) => {
    await useDesign(request, 'depth-glow')
    await settledDepth(page, '/blog', '0px 0px 14px')
    const card = page
      .locator(CARD)
      .filter({ has: page.locator('img') })
      .first()
    const read = () =>
      card.evaluate((el) => {
        const { width, height } = el.getBoundingClientRect()
        const img = el.querySelector('img')?.getBoundingClientRect()
        return {
          card: [width, height],
          img: [img?.width, img?.height],
          page: document.documentElement.scrollHeight,
        }
      })
    const before = await read()
    await card.locator('img').evaluate((el) => {
      el.style.setProperty('filter', 'none', 'important')
    })
    expect(await read()).toEqual(before)
  })

  test('the picture’s shadow is not cut off by anything that clips, and a clipped one is detected (control)', async ({
    page,
    request,
  }) => {
    await useDesign(request, 'depth-floating')
    await settledDepth(page, '/blog', '0px 20px 28px')
    const img = filtered(page)
    const { clippedBy, edge, strongest, where } = await clipReading(page, img)
    expect(clippedBy, 'nothing around the picture clips').toBe('')
    expect(edge, where).toBeLessThan(Math.max(8, strongest * 0.25))
    // Control: clip the picture to 8px around it, as an overflow-hidden parent would.
    await img.evaluate((el) => {
      const parent = el.parentElement
      if (!parent) return
      parent.style.overflow = 'hidden'
      parent.style.padding = '8px'
    })
    const clipped = await clipReading(page, img)
    expect(clipped.strongest).toBeGreaterThan(12)
    expect(clipped.edge).toBeGreaterThan(clipped.strongest * 0.5)
  })

  test('the whole card is still one link: it opens its post, keeps its focus ring, and its picture takes no clicks of its own', async ({
    page,
    request,
  }) => {
    await useDesign(request, 'depth-floating')
    await settledDepth(page, '/blog', '0px 20px 28px')
    const card = page
      .locator(CARD)
      .filter({ has: page.locator('img') })
      .first()
    await expect(card.locator('a')).toHaveCount(1)
    const link = card.locator('a').first()
    const href = await link.getAttribute('href')
    // The picture's centre belongs to the card's one link.
    const hit = await card.evaluate((el) => {
      const img = el.querySelector('img')?.getBoundingClientRect()
      if (!img) return null
      return (
        document
          .elementFromPoint(img.x + img.width / 2, img.y + img.height / 2)
          ?.closest('a')
          ?.getAttribute('href') ?? null
      )
    })
    expect(hit).toBe(href)
    await link.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(link).toBeFocused()
    expect(await link.evaluate((el) => el.matches(':focus-visible'))).toBe(true)
    expect(await link.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none')
    // A visitor clicks the picture where it is; the stretched link takes the click, so Playwright's own `click` on the
    // picture (which refuses an element another one covers) is not the way to test it.
    const box = await card.locator('img').boundingBox()
    if (!box) throw new Error('The picture has no box.')
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await expect(page).toHaveURL(new RegExp(`${href ?? '/blog/'}$`))
  })

  test('adds nothing the accessibility tree reads, and passes axe', async ({ page, request }) => {
    await useDesign(request, 'depth-glow')
    await settledDepth(page, '/blog', '0px 0px 14px')
    const exposed = () =>
      page
        .locator(`${CARD} img`)
        .evaluateAll((all) =>
          all.map((img) =>
            [
              img.getAttribute('alt'),
              img.getAttribute('role'),
              img.getAttribute('aria-hidden'),
            ].join('|'),
          ),
        )
    const withDepth = await exposed()
    expect(withDepth.length).toBeGreaterThan(0)
    await useDesign(request, 'off')
    await settled(page, '/blog', false)
    expect(await exposed()).toEqual(withDepth.slice(0, (await exposed()).length))
    await useDesign(request, 'depth-glow')
    await settledDepth(page, '/blog', '0px 0px 14px')
    const results = await new AxeBuilder({ page }).include('main').analyze()
    expect(
      results.violations.flatMap(({ id, nodes }) => nodes.map((node) => `${id}: ${node.html}`)),
    ).toEqual([])
  })

  test.describe('at a phone width', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('the shadow shows on every picture and nothing leaves the window', async ({
      page,
      request,
    }) => {
      await useDesign(request, 'depth-floating')
      await settledDepth(page, '/blog', '0px 20px 28px')
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    })
  })

  test('related posts take the same depth, and switching it off restores the plain pictures', async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000)
    const RELATED = 'section[aria-labelledby="related-posts"] article img'
    /** A post page's first article is the post itself, so the related cards' pictures are read on their own. */
    const relatedFilter = async () => {
      await page.goto('/blog/welcome-to-the-blog')
      await page.waitForLoadState('networkidle')
      const img = page.locator(RELATED).first()
      return (await img.count()) === 0
        ? 'none'
        : await img.evaluate((el) => getComputedStyle(el).filter)
    }
    await useDesign(request, 'depth-floating')
    await expect
      .poll(relatedFilter, { timeout: 30_000, intervals: [250, 500, 1000] })
      .toContain('0px 20px 28px')
    await useDesign(request, 'off')
    await expect.poll(relatedFilter, { timeout: 30_000, intervals: [250, 500, 1000] }).toBe('none')
    // The index drops the picture-free post once the posts' cache has refreshed too.
    await expect
      .poll(
        async () => {
          await page.goto('/blog')
          await page.waitForLoadState('networkidle')
          return page.getByRole('link', { name: NO_PICTURE }).count()
        },
        { timeout: 30_000, intervals: [250, 500, 1000] },
      )
      .toBe(0)
    await settledDepth(page, '/blog', null)
  })
})
