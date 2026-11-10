import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test'

import { test } from './fixtures/test'
import { clipReading } from './picture-depth-helpers'

/**
 * Picture depth on the Gallery (README, "Picture depth and glow"): `/picture-depth-gallery`. Grid and Slider draw
 * every tile through FramedImage, so the filter is on the tile's still box inside its button. The button, its
 * name, the hover zoom and the lightbox are the Gallery's own and must be untouched. Nothing that clips (the
 * slider's viewport) may cut the shadow off: that is read from two screenshots, with and without the filter, and a
 * control with too little room shows the reading does see a cut.
 */

const PAGE = '/picture-depth-gallery'
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PATTERN = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><circle cx="80" cy="60" r="40" fill="#0b6e4f"/></svg>`

test.beforeEach(async ({ page }) => {
  // The transparent picture is a circle on nothing, so a shadow that follows pixels, not the box, would show.
  await page.route(
    'https://cdn.sanity.io/images/**/fedcba9876543210fedcba9876543210fedcba98-*',
    (route) => route.fulfill({ contentType: 'image/svg+xml', body: PATTERN }),
  )
})

const section = (page: Page, heading: string) =>
  page
    .locator('#main-content section')
    .filter({ has: page.getByRole('heading', { name: heading, exact: true }) })
const tiles = (scope: Locator) => scope.locator('[data-framed-image]')
const buttons = (scope: Locator) => scope.locator('button[aria-haspopup="dialog"]')
const filterOf = (tile: Locator) => tile.evaluate((el) => getComputedStyle(el).filter)

const LEVELS = [
  ['Gallery soft', '0px 1px 2px'],
  ['Gallery raised', '0px 4px 6px'],
  ['Gallery floating', '0px 20px 28px'],
  ['Gallery floating strong glow', '0px 0px 14px'],
  ['Gallery strong glow only', '0px 0px 14px'],
] as const

const attach = async (testInfo: TestInfo, name: string, target: Locator) => {
  await testInfo.attach(name, { body: await target.screenshot(), contentType: 'image/png' })
}

test.describe('motion off (the page as a screenshot sees it)', () => {
  test.use({ reducedMotion: 'reduce' })

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready)
  })

  test('nothing chosen draws no filter on any tile', async ({ page }) => {
    for (const heading of [
      'Gallery nothing chosen',
      'Gallery flat and glow off',
      'Gallery slider nothing chosen',
    ]) {
      const all = await tiles(section(page, heading)).all()
      expect(all.length, heading).toBeGreaterThan(0)
      for (const tile of all) expect(await filterOf(tile), heading).toBe('none')
    }
  })

  for (const [heading, expected] of LEVELS) {
    test(`${heading}: every tile carries the shadow, and nothing else about it changes`, async ({
      page,
    }) => {
      const scope = section(page, heading)
      const plain = section(page, 'Gallery nothing chosen')
      const all = await tiles(scope).all()
      expect(all).toHaveLength(6)
      const rect = (tile: Locator) =>
        tile.evaluate((el) => {
          const { width, height } = el.getBoundingClientRect()
          return [Math.round(width * 10) / 10, Math.round(height * 10) / 10]
        })
      const same = await rect(tiles(plain).first())
      for (const tile of all) {
        expect(await filterOf(tile)).toContain(expected)
        // The tile is the size it was, and its button holds it exactly.
        expect(await rect(tile)).toEqual(same)
      }
    })
  }

  test('a circle, a transparent picture and a cropped one all take the shadow on their still box', async ({
    page,
  }, testInfo) => {
    const circle = tiles(section(page, 'Gallery circle floating')).first()
    expect(await filterOf(circle)).toContain('0px 20px 28px')
    expect(await circle.evaluate((el) => el.getAttribute('data-framed-image'))).toBe('circle')
    const odd = section(page, 'Gallery transparent and cropped')
    const all = await tiles(odd).all()
    expect(all).toHaveLength(3)
    // Every tile is a box with its own background, so the shadow follows the box (not the circle drawn on it).
    for (const tile of all) {
      expect(await filterOf(tile)).toContain('0px 0px 14px')
      expect(
        await tile.evaluate((el) => getComputedStyle(el.firstElementChild ?? el).overflow),
      ).toBe('hidden')
    }
    await attach(testInfo, 'transparent and cropped', odd)
  })

  test('the filter changes neither the grid’s layout nor the page’s', async ({ page }) => {
    const scope = section(page, 'Gallery floating strong glow')
    const read = () =>
      scope.evaluate((el) => ({
        tiles: [...el.querySelectorAll('[data-framed-image]')].map((tile) => {
          const { x, y, width, height } = tile.getBoundingClientRect()
          return [x, y, width, height]
        }),
        height: el.getBoundingClientRect().height,
        page: document.documentElement.scrollHeight,
      }))
    const before = await read()
    await scope.evaluate((el) => {
      for (const tile of el.querySelectorAll<HTMLElement>('[data-framed-image]')) {
        tile.style.setProperty('filter', 'none', 'important')
      }
    })
    expect(await read()).toEqual(before)
  })

  test('a grid tile’s shadow is not cut off by anything that clips', async ({ page }, testInfo) => {
    for (const [heading] of LEVELS) {
      const scope = section(page, heading)
      for (const index of [0, 2, 3, 5]) {
        const { clippedBy, edge, strongest, where } = await clipReading(
          page,
          tiles(scope).nth(index),
        )
        expect(clippedBy, `${heading}: nothing in the grid clips`).toBe('')
        expect(edge, `${heading} ${where}`).toBeLessThan(Math.max(8, strongest * 0.25))
      }
    }
    await attach(
      testInfo,
      'grid floating strong glow',
      section(page, 'Gallery floating strong glow'),
    )
  })

  test('mobile review: the grid with Floating and a Strong glow, and the slider', async ({
    page,
  }, testInfo) => {
    await attach(testInfo, 'unset grid', section(page, 'Gallery nothing chosen'))
    await attach(
      testInfo,
      'floating strong glow slider',
      section(page, 'Gallery slider floating strong glow'),
    )
  })
})

test.describe('motion on', () => {
  test.use({ reducedMotion: 'no-preference' })

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
  })

  test('the hover zoom still zooms inside the tile’s shape, and the shadow stays on the still box', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'A touch screen has no hover')
    const scope = section(page, 'Gallery floating strong glow')
    const tile = tiles(scope).first()
    await tile.scrollIntoViewIfNeeded()
    const box = (await tile.boundingBox()) ?? { x: 0, y: 0, width: 1, height: 1 }
    const before = await filterOf(tile)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await expect
      .poll(() => tile.locator('img').evaluate((el) => getComputedStyle(el).scale))
      .not.toBe('none')
    const after = await tile.boundingBox()
    expect(after?.width).toBeCloseTo(box.width, 1)
    expect(after?.height).toBeCloseTo(box.height, 1)
    expect(await filterOf(tile)).toBe(before)
    expect(await tile.evaluate((el) => getComputedStyle(el).transform)).toBe('none')
  })

  test('each tile is still one button with its own name and focus ring, and the lightbox opens and closes', async ({
    page,
  }) => {
    const scope = section(page, 'Gallery floating strong glow')
    const first = buttons(scope).first()
    await expect(first).toHaveAccessibleName(/^Open image 1 of 6/)
    await first.scrollIntoViewIfNeeded()
    await first.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(first).toBeFocused()
    expect(await first.evaluate((el) => el.matches(':focus-visible'))).toBe(true)
    expect(await first.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none')
    // The button is not filtered: only the still box inside it is.
    expect(await first.evaluate((el) => getComputedStyle(el).filter)).toBe('none')
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // The lightbox shows the picture itself: no tile shadow in it.
    expect(
      await dialog.evaluate(
        (el) => el.querySelectorAll('[style*="depth-filter"], [class*="depth-filter"]').length,
      ),
    ).toBe(0)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(first).toBeFocused()
  })

  test('the page has no horizontal overflow, with the slider’s extra room included', async ({
    page,
  }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('hydrates without warnings and without a layout shift', async ({ page }) => {
    const problems: string[] = []
    page.on('console', (message) => {
      if (/hydrat/i.test(message.text())) problems.push(message.text())
    })
    await page.addInitScript(() => {
      const shifts: number[] = []
      ;(window as unknown as { __shifts: number[] }).__shifts = shifts
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as {
          value: number
          hadRecentInput: boolean
        }[]) {
          if (!entry.hadRecentInput) shifts.push(entry.value)
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    await section(page, 'Gallery slider floating strong glow').scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    const total = await page.evaluate(() =>
      (window as unknown as { __shifts: number[] }).__shifts.reduce((a, b) => a + b, 0),
    )
    expect(problems).toEqual([])
    expect(total).toBeLessThan(0.01)
  })

  test('adds nothing the accessibility tree reads, and passes axe', async ({ page }) => {
    const exposed = (heading: string) =>
      section(page, heading).evaluate((el) =>
        [...el.querySelectorAll('img, button')].map((node) =>
          [
            node.tagName,
            node.getAttribute('alt'),
            node.getAttribute('role'),
            node.getAttribute('aria-hidden'),
          ].join('|'),
        ),
      )
    const withDepth = await exposed('Gallery floating')
    expect(withDepth.length).toBeGreaterThan(0)
    // The same pictures, differently named, are exposed the same way.
    const strip = (rows: string[]) =>
      rows.map((row) => row.replace(/Gallery [a-z-]+ ?[a-z-]* picture \d/, 'P'))
    expect(strip(withDepth)).toEqual(strip(await exposed('Gallery soft')))
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('slider', () => {
  test.use({ reducedMotion: 'no-preference' })

  const slider = (page: Page) => section(page, 'Gallery slider floating strong glow')
  const plainSlider = (page: Page) => section(page, 'Gallery slider nothing chosen')
  const settle = async (scope: Locator) => {
    const track = scope.locator('[aria-roledescription="slide"]').first().locator('..')
    let last = ''
    await expect
      .poll(async () => {
        const now = await track.evaluate((el) => getComputedStyle(el).transform)
        const same = now === last
        last = now
        return same
      })
      .toBe(true)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    await expect(slider(page).getByRole('button', { name: 'Next slide' })).toBeVisible()
  })

  test('no slide’s shadow is cut off: first, middle and last positions', async ({ page }) => {
    const scope = slider(page)
    const next = scope.getByRole('button', { name: 'Next slide' })
    await scope.scrollIntoViewIfNeeded()
    const slides = scope.locator('[aria-roledescription="slide"]')
    const stops: string[] = []
    for (let step = 0; step < 8; step++) {
      await settle(scope)
      const visible = await slides.evaluateAll((els) =>
        els.map((el, i) => (el.matches('[inert]') ? -1 : i)).filter((i) => i >= 0),
      )
      stops.push(visible.join(','))
      for (const index of visible) {
        const { clippedBy, edge, edges, strongest, where } = await clipReading(
          page,
          slides.nth(index).locator('[data-framed-image]'),
        )
        expect(clippedBy).toContain('div.')
        // Above and below there is room to spare: nothing of the shadow may be left at those edges (a faint
        // pale rectangle shows otherwise). The sides are limited by the page gutter (below).
        expect(edges.top, `slide ${index + 1} at stop ${step + 1}: top edge`).toBeLessThan(4)
        expect(edges.bottom, `slide ${index + 1} at stop ${step + 1}: bottom edge`).toBeLessThan(4)
        expect(
          edge,
          `slide ${index + 1} at stop ${step + 1}: the edge holds ${edge} (${where}) of a shadow ${strongest} strong`,
        ).toBeLessThan(Math.max(8, strongest * 0.25))
      }
      if (await next.isDisabled()) break
      await next.click()
    }
    expect(stops.length).toBeGreaterThanOrEqual(3)
    expect(await next.isDisabled()).toBe(true)
  })

  test('the same reading sees a cut-off shadow when the slider has only its own 12px (control)', async ({
    page,
  }) => {
    const scope = slider(page)
    await scope.scrollIntoViewIfNeeded()
    await settle(scope)
    await scope
      .locator('[aria-roledescription="carousel"] > div')
      .first()
      .evaluate((el) => {
        el.style.margin = '-12px'
        el.style.padding = '12px'
      })
    const { edge, strongest } = await clipReading(
      page,
      scope.locator('[aria-roledescription="slide"] [data-framed-image]').first(),
    )
    expect(strongest).toBeGreaterThan(12)
    expect(
      edge,
      'a cut-off shadow is about as strong at the edge as the shadow itself',
    ).toBeGreaterThan(strongest * 0.5)
  })

  test('the slider keeps its slide width, scroll distance and height, and still moves, drags and takes keys', async ({
    page,
  }) => {
    const read = (scope: Locator) =>
      scope.evaluate((el) => {
        const first = el.querySelector('[aria-roledescription="slide"]')
        const track = first?.parentElement
        return {
          slideWidth: first?.getBoundingClientRect().width,
          scroll: (track?.scrollWidth ?? 0) - (track?.clientWidth ?? 0),
          height: el.getBoundingClientRect().height,
        }
      })
    const [a, b] = [await read(plainSlider(page)), await read(slider(page))]
    expect(b.slideWidth).toBeCloseTo(a.slideWidth ?? 0, 1)
    expect(b.scroll).toBeCloseTo(a.scroll, 1)
    expect(b.height).toBeCloseTo(a.height, 1)
    const scope = slider(page)
    const track = scope.locator('[aria-roledescription="slide"]').first().locator('..')
    const transform = () => track.evaluate((el) => getComputedStyle(el).transform)
    await scope.scrollIntoViewIfNeeded()
    const start = await transform()
    await scope.getByRole('button', { name: 'Next slide' }).click()
    await expect.poll(transform).not.toBe(start)
    const previous = scope.getByRole('button', { name: 'Previous slide' })
    await expect(previous).toBeEnabled()
    await previous.focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowLeft')
    const slide = scope.locator('[aria-roledescription="slide"]:not([inert])').first()
    const box = (await slide.boundingBox()) ?? { x: 0, y: 0, width: 300, height: 100 }
    const before = await transform()
    await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + 40, box.y + box.height / 2, { steps: 10 })
    await page.mouse.up()
    await expect.poll(transform).not.toBe(before)
  })
})

test.describe('masonry', () => {
  test.use({ reducedMotion: 'reduce' })

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready)
  })

  const NAMES = (scope: Locator) =>
    buttons(scope).evaluateAll((all) =>
      all.map((button) => button.getAttribute('aria-label')?.replace(/: .*/, '') ?? ''),
    )
  const RECTS = (scope: Locator) =>
    buttons(scope).evaluateAll((all) =>
      all.map((button) => {
        const { x, y, width, height } = button.getBoundingClientRect()
        return [
          Math.round(x * 10) / 10,
          Math.round(y * 10) / 10,
          Math.round(width * 10) / 10,
          Math.round(height * 10) / 10,
        ]
      }),
    )
  const offsetOf = async (scope: Locator) => (await scope.boundingBox())?.y ?? 0

  test('nothing chosen draws no filter on any tile', async ({ page }) => {
    for (const heading of ['Gallery masonry nothing chosen', 'Gallery masonry flat and glow off']) {
      const all = await buttons(section(page, heading)).all()
      expect(all.length, heading).toBeGreaterThan(0)
      for (const button of all) expect(await filterOf(button), heading).toBe('none')
    }
  })

  test('Floating and Floating with a Strong glow put the shadow on every tile’s button', async ({
    page,
  }) => {
    for (const [heading, expected] of [
      ['Gallery masonry floating', '0px 20px 28px'],
      ['Gallery masonry floating strong glow', '0px 0px 14px'],
    ] as const) {
      const all = await buttons(section(page, heading)).all()
      expect(all).toHaveLength(6)
      for (const button of all) expect(await filterOf(button), heading).toContain(expected)
    }
  })

  test('the columns, the order and every tile’s size and place are exactly what they were', async ({
    page,
  }) => {
    const plain = section(page, 'Gallery masonry nothing chosen')
    const depth = section(page, 'Gallery masonry floating strong glow')
    expect(await NAMES(depth)).toEqual(await NAMES(plain))
    // Same content, same width: each tile sits where the unset one does, relative to its section.
    const [a, b] = [await RECTS(plain), await RECTS(depth)]
    const [ay, by] = [await offsetOf(plain), await offsetOf(depth)]
    expect(b.length).toBe(a.length)
    for (const [i, rect] of b.entries()) {
      const was = a[i] ?? []
      expect(rect[0], `tile ${i + 1} x`).toBeCloseTo(was[0] ?? 0, 0)
      expect(rect[2], `tile ${i + 1} width`).toBeCloseTo(was[2] ?? 0, 0)
      expect(rect[3], `tile ${i + 1} height`).toBeCloseTo(was[3] ?? 0, 0)
      expect((rect[1] ?? 0) - by, `tile ${i + 1} y`).toBeCloseTo((was[1] ?? 0) - ay, 0)
    }
  })

  test('the filter changes neither the layout nor the page', async ({ page }) => {
    const scope = section(page, 'Gallery masonry floating strong glow')
    const read = () =>
      scope.evaluate((el) => ({
        tiles: [...el.querySelectorAll('button')].map((b) => {
          const { x, y, width, height } = b.getBoundingClientRect()
          return [x, y, width, height]
        }),
        height: el.getBoundingClientRect().height,
        page: document.documentElement.scrollHeight,
      }))
    const before = await read()
    await scope.evaluate((el) => {
      for (const b of el.querySelectorAll<HTMLElement>('button')) {
        b.style.setProperty('filter', 'none', 'important')
      }
    })
    expect(await read()).toEqual(before)
  })

  test('each tile is still one button with its own name, and its focus ring is as visible as before', async ({
    page,
  }, testInfo) => {
    const ring = (b: Locator) =>
      b.evaluate((el) => {
        const css = getComputedStyle(el)
        return [css.outlineStyle, css.outlineWidth, css.outlineOffset, css.outlineColor]
      })
    const plain = buttons(section(page, 'Gallery masonry nothing chosen')).first()
    const depth = buttons(section(page, 'Gallery masonry floating strong glow')).first()
    await expect(depth).toHaveAccessibleName(/^Open image 1 of 6/)
    await expect(depth).toHaveRole('button')
    // Each button's ring is read while it has the focus.
    const rings: string[][] = []
    for (const button of [plain, depth]) {
      await button.scrollIntoViewIfNeeded()
      await button.focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Tab')
      await expect(button).toBeFocused()
      expect(await button.evaluate((el) => el.matches(':focus-visible'))).toBe(true)
      rings.push(await ring(button))
    }
    // The same ring (style, width, offset and colour) drawn on a filtered button as on a plain one.
    expect(rings[0]?.[0]).not.toBe('none')
    expect(rings[1]).toEqual(rings[0])
    await attach(testInfo, 'masonry focus ring, floating strong glow', depth)
  })

  test('clicking or pressing Enter on a tile opens that picture in the lightbox, which has no tile shadow', async ({
    page,
  }) => {
    const scope = section(page, 'Gallery masonry floating strong glow')
    const third = buttons(scope).nth(2)
    await third.scrollIntoViewIfNeeded()
    await third.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(
      await dialog.evaluate(
        (el) => el.querySelectorAll('[style*="depth-filter"], [class*="depth-filter"]').length,
      ),
    ).toBe(0)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(third).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(third).toBeFocused()
  })

  test('a tile’s shadow is not cut off by anything that clips, and a transparent or cropped picture’s follows its box', async ({
    page,
  }, testInfo) => {
    const scope = section(page, 'Gallery masonry floating strong glow')
    for (const index of [0, 1, 3, 5]) {
      const { clippedBy, edge, strongest, where } = await clipReading(
        page,
        buttons(scope).nth(index),
      )
      expect(clippedBy, 'nothing around a masonry tile clips').toBe('')
      expect(edge, where).toBeLessThan(Math.max(8, strongest * 0.25))
    }
    const odd = section(page, 'Gallery masonry transparent and cropped')
    const all = await buttons(odd).all()
    expect(all).toHaveLength(3)
    for (const button of all) {
      expect(await filterOf(button)).toContain('0px 0px 14px')
      // The button has its own background: the shadow follows the tile, not the circle drawn on it.
      expect(await button.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
        'rgba(0, 0, 0, 0)',
      )
    }
    await attach(testInfo, 'masonry floating strong glow', scope)
    await attach(testInfo, 'masonry transparent and cropped', odd)
  })

  test('the same reading sees a cut-off shadow when a tile is clipped (control)', async ({
    page,
  }) => {
    const scope = section(page, 'Gallery masonry floating strong glow')
    const first = buttons(scope).first()
    await first.scrollIntoViewIfNeeded()
    // Clip the tile to 8px around it, as an overflow-hidden parent would: far less than its shadow needs.
    await first.locator('..').evaluate((li) => {
      li.style.overflow = 'hidden'
      li.style.padding = '8px'
    })
    const { clippedBy, edge, strongest } = await clipReading(page, first)
    expect(clippedBy).toContain('li.')
    expect(strongest).toBeGreaterThan(12)
    expect(
      edge,
      'a cut-off shadow is about as strong at the edge as the shadow itself',
    ).toBeGreaterThan(strongest * 0.5)
  })
})

test.describe('server markup', () => {
  test.use({ javaScriptEnabled: false })

  test('draws the shadow from the server’s markup alone, with the slider still a scroll-snap list', async ({
    page,
  }) => {
    await page.goto(PAGE)
    for (const heading of ['Gallery floating strong glow', 'Gallery slider floating strong glow']) {
      expect(await filterOf(tiles(section(page, heading)).first()), heading).toContain(
        '0px 20px 28px',
      )
    }
  })
})
