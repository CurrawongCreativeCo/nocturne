import { readFileSync } from 'node:fs'

import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * Picture depth on Team (README, "Picture depth and glow"): `/picture-depth-team`, three members with a real
 * photograph. A team card clips, so a flush portrait with a depth is inset by the room that depth needs, inside
 * the space it already has. This checks that the card keeps its size and the text its place, that the shadow has
 * faded out before the card's edge (read from the screenshot's pixels, with a control that shows the reading
 * does see a cut-off shadow), and that nothing changes while nothing is chosen.
 */

const PAGE = '/picture-depth-team'
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PHOTO = readFileSync('tests/e2e/fixtures/portrait-photo.jpg')

test.beforeEach(async ({ page }) => {
  // The members' portraits are a real photograph here, not the flat colour the fake lake serves every picture.
  await page.route(
    'https://cdn.sanity.io/images/**/0123456789abcdef0123456789abcdef01234567-*',
    (route) => route.fulfill({ contentType: 'image/jpeg', body: PHOTO }),
  )
})

const section = (page: Page, heading: string) =>
  page
    .locator('#main-content section')
    .filter({ has: page.getByRole('heading', { name: heading }) })
const cards = (scope: Locator) => scope.locator('div.relative.rounded-card')
const portrait = (card: Locator) => card.locator('img').first()

/** The depth levels, with the room each needs at the side and above the picture (depth-options.ts). */
const LEVELS = [
  ['Team soft', 8, 4],
  ['Team raised', 16, 6],
  ['Team floating', 28, 12],
  ['Team floating strong glow', 34, 24],
  ['Team strong glow only', 22, 22],
] as const

interface Geometry {
  card: { w: number; h: number }
  slot: { h: number }
  img: { x: number; y: number; w: number; h: number }
  textTop: number
}

/** The card's outer size, its portrait slot, the portrait and where the text starts: all relative to the card. */
const geometry = (card: Locator): Promise<Geometry> =>
  card.evaluate((el) => {
    const need = (node: Element | null): Element => {
      if (!node) throw new Error('the card is missing a part')
      return node
    }
    const rect = (node: Element | null) => need(node).getBoundingClientRect()
    const c = rect(el)
    const slot = rect(el.firstElementChild)
    const img = rect(el.querySelector('img'))
    const text = rect(el.querySelector('h2, h3, h4'))
    return {
      card: { w: c.width, h: c.height },
      slot: { h: slot.height },
      img: { x: img.x - c.x, y: img.y - c.y, w: img.width, h: img.height },
      textTop: text.top - c.top,
    }
  })

/**
 * Whether the card's edge shows a shadow that was cut off, read from a screenshot of the card. It compares how
 * tinted the pixels just inside the left, right and top edges are, beside the picture, with how tinted the
 * strongest part of the shadow is (just under the picture). A shadow that has faded out before the edge is a
 * small fraction of that; one the card cuts off is about as strong as the shadow itself. Returns both.
 */
const edgeReading = async (page: Page, card: Locator) => {
  const png = (await card.screenshot()).toString('base64')
  const box = await geometry(card)
  return page.evaluate(
    async ([data, img]) => {
      const image = new Image()
      image.src = `data:image/png;base64,${data}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no canvas')
      ctx.drawImage(image, 0, 0)
      const scale = image.width / (img.cardWidth || image.width)
      const at = (x: number, y: number) => [
        ...ctx.getImageData(Math.round(x * scale), Math.round(y * scale), 1, 1).data.slice(0, 3),
      ]
      // The card's own background, from a spot in its text area.
      const background = at(img.cardWidth / 2, img.cardHeight - 6)
      const diff = (x: number, y: number) =>
        Math.max(...at(x, y).map((value, i) => Math.abs(value - (background[i] ?? 0))))
      // The strongest of the shadow: just below the picture, along its middle.
      let strongest = 0
      for (let dy = 1; dy <= 8; dy++) {
        for (let x = img.x + img.w * 0.3; x <= img.x + img.w * 0.7; x += 6) {
          strongest = Math.max(strongest, diff(x, img.y + img.h + dy))
        }
      }
      // The edges, beside the picture, in the first pixel inside the card's 1px ring. 8/255 (about 3%) is the
      // tint the room for each depth was measured to (depth-options.ts), the same as the ring's own.
      let edge = 0
      for (let y = img.y + 8; y <= img.y + img.h - 8; y += 4) {
        edge = Math.max(edge, diff(1, y), diff(img.cardWidth - 2, y))
      }
      for (let x = img.x + 8; x <= img.x + img.w - 8; x += 4) edge = Math.max(edge, diff(x, 1))
      return { strongest, edge }
    },
    [
      png,
      {
        x: box.img.x,
        y: box.img.y,
        w: box.img.w,
        h: box.img.h,
        cardWidth: box.card.w,
        cardHeight: box.card.h,
      },
    ] as const,
  )
}

const attach = async (testInfo: TestInfo, name: string, card: Locator) => {
  await testInfo.attach(name, { body: await card.screenshot(), contentType: 'image/png' })
}

test.describe('motion off (the page as a screenshot sees it)', () => {
  test.use({ reducedMotion: 'reduce' })

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready)
  })

  test('nothing chosen is today’s card: a flush portrait, no filter, no inset', async ({
    page,
  }) => {
    for (const heading of [
      'Team nothing chosen',
      'Team flat and glow off',
      'Team slider nothing chosen',
    ]) {
      const card = cards(section(page, heading)).first()
      const g = await geometry(card)
      expect(g.img.x, heading).toBeCloseTo(0, 1)
      expect(g.img.y, heading).toBeCloseTo(0, 1)
      expect(g.img.w, heading).toBeCloseTo(g.card.w, 0)
      expect(await portrait(card).evaluate((el) => getComputedStyle(el).filter), heading).toBe(
        'none',
      )
      expect(
        await card.evaluate((el) => getComputedStyle(el.firstElementChild ?? el).padding),
        heading,
      ).toBe('0px')
    }
  })

  for (const [heading, clearance, top] of LEVELS) {
    test(`${heading}: the card and its text keep their size and place, the portrait is inset by ${clearance}px at the side and ${top}px above`, async ({
      page,
    }) => {
      const before = await geometry(cards(section(page, 'Team nothing chosen')).first())
      const card = cards(section(page, heading)).first()
      const after = await geometry(card)
      // The card's outer size, the slot the portrait lives in and where the text starts: unchanged.
      expect(after.card.w).toBeCloseTo(before.card.w, 1)
      expect(after.card.h).toBeCloseTo(before.card.h, 1)
      expect(after.slot.h).toBeCloseTo(before.slot.h, 1)
      expect(after.textTop).toBeCloseTo(before.textTop, 1)
      // The portrait is smaller, inset on each side by the clearance, and still square.
      expect(after.img.x).toBeCloseTo(clearance, 1)
      expect(after.img.w).toBeCloseTo(after.card.w - 2 * clearance, 1)
      expect(after.img.h).toBeCloseTo(after.img.w, 1)
      expect(after.img.y).toBeCloseTo(top, 1)
      // It keeps the card's corners.
      expect(
        await portrait(card).evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
      ).not.toBe('0px')
    })
  }

  test('the whole fade shows: it is gone before the card’s edge, and a cut-off shadow would not be', async ({
    page,
  }, testInfo) => {
    for (const [heading] of LEVELS) {
      const card = cards(section(page, heading)).first()
      await card.scrollIntoViewIfNeeded()
      const { strongest, edge } = await edgeReading(page, card)
      // There is a real shadow to compare with, and the edge holds a small fraction of it.
      expect(strongest, `${heading}: a shadow shows under the picture`).toBeGreaterThan(12)
      expect(
        edge,
        `${heading}: the edge holds ${edge} of a shadow ${strongest} strong`,
      ).toBeLessThan(Math.max(8, strongest * 0.25))
      await attach(testInfo, heading, card)
    }
  })

  test('the same reading sees a shadow the card cuts off (control)', async ({ page }) => {
    // Floating with too little room: the picture is inset by 6px, not 28, so the card clips the shadow.
    const card = cards(section(page, 'Team floating strong glow')).first()
    await card.evaluate((el) => {
      const slot = el.firstElementChild as HTMLElement
      slot.style.padding = '3px 6px 9px'
    })
    await card.scrollIntoViewIfNeeded()
    const { strongest, edge } = await edgeReading(page, card)
    expect(strongest).toBeGreaterThan(12)
    expect(
      edge,
      'a cut-off shadow is about as strong at the edge as the shadow itself',
    ).toBeGreaterThan(strongest * 0.5)
  })

  test('a circle that is already inset keeps its own room, and its shadow is filtered', async ({
    page,
  }) => {
    const card = cards(section(page, 'Team circle floating')).first()
    const g = await geometry(card)
    const plain = await geometry(cards(section(page, 'Team nothing chosen')).first())
    expect(g.img.x).toBeCloseTo(24, 1)
    expect(g.card.w).toBeCloseTo(plain.card.w, 1)
    expect(await portrait(card).evaluate((el) => getComputedStyle(el).filter)).toContain(
      '0px 20px 28px',
    )
  })

  test('the list draws its portraits as before, with the filter and no inset', async ({ page }) => {
    const none = cards(section(page, 'Team list nothing chosen')).first()
    const glow = cards(section(page, 'Team list floating strong glow')).first()
    const [a, b] = [await geometry(none), await geometry(glow)]
    expect(b.card.h).toBeCloseTo(a.card.h, 1)
    expect(b.img.w).toBeCloseTo(a.img.w, 1)
    expect(b.img.x).toBeCloseTo(a.img.x, 1)
    expect(
      await glow.locator('[data-profile-image]').evaluate((el) => getComputedStyle(el).filter),
    ).toContain('0px 20px 28px')
    expect(
      await none.locator('[data-profile-image]').evaluate((el) => getComputedStyle(el).filter),
    ).toBe('none')
  })

  test('mobile photograph review: Floating with a Strong glow, grid and slider', async ({
    page,
  }, testInfo) => {
    for (const heading of ['Team floating strong glow', 'Team slider floating strong glow']) {
      const card = cards(section(page, heading)).first()
      await card.scrollIntoViewIfNeeded()
      await attach(testInfo, `photo ${heading}`, card)
    }
    const before = cards(section(page, 'Team nothing chosen')).first()
    await attach(testInfo, 'photo unset', before)
  })
})

test.describe('motion on', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('the slider keeps its width, scroll distance and controls, and still moves', async ({
    page,
  }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    const none = section(page, 'Team slider nothing chosen')
    const glow = section(page, 'Team slider floating strong glow')
    for (const scope of [none, glow])
      await expect(scope.getByRole('button', { name: 'Next slide' })).toBeVisible()
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
    const [a, b] = [await read(none), await read(glow)]
    expect(b.slideWidth).toBeCloseTo(a.slideWidth ?? 0, 1)
    expect(b.scroll).toBeCloseTo(a.scroll, 1)
    expect(b.height).toBeCloseTo(a.height, 1)
    // It still moves: Next, then the keyboard back.
    const next = glow.getByRole('button', { name: 'Next slide' })
    await next.scrollIntoViewIfNeeded()
    const before = await glow
      .locator('[aria-roledescription="slide"]')
      .first()
      .locator('..')
      .evaluate((el) => getComputedStyle(el).transform)
    await next.click()
    await expect
      .poll(() =>
        glow
          .locator('[aria-roledescription="slide"]')
          .first()
          .locator('..')
          .evaluate((el) => getComputedStyle(el).transform),
      )
      .not.toBe(before)
    // Focus is inside the slider (the arrow it last used is now disabled, so the other takes it); the keyboard moves it back.
    const previous = glow.getByRole('button', { name: 'Previous slide' })
    await expect(previous).toBeEnabled()
    await previous.focus()
    await page.keyboard.press('ArrowLeft')
    await expect(glow.getByText('Slide 1 of 4', { exact: false })).toBeAttached()
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
    await section(page, 'Team slider floating strong glow').scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    const total = await page.evaluate(() =>
      (window as unknown as { __shifts: number[] }).__shifts.reduce((a, b) => a + b, 0),
    )
    expect(problems).toEqual([])
    expect(total).toBeLessThan(0.01)
  })

  test('adds nothing the accessibility tree reads, and passes axe', async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    const exposed = (heading: string) =>
      section(page, heading).evaluate((el) =>
        [...el.querySelectorAll('img')].map((img) =>
          [img.getAttribute('alt'), img.getAttribute('role'), img.getAttribute('aria-hidden')].join(
            '|',
          ),
        ),
      )
    const withDepth = await exposed('Team floating strong glow')
    expect(withDepth.length).toBeGreaterThan(0)
    expect(withDepth.map((value) => value.replace(/Portrait of [\w ]+/, 'P'))).toEqual(
      (await exposed('Team nothing chosen')).map((value) =>
        value.replace(/Portrait of [\w ]+/, 'P'),
      ),
    )
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('draws the inset and the shadow from the server’s markup alone', async ({ page }) => {
    await page.goto(PAGE)
    const card = cards(section(page, 'Team floating strong glow')).first()
    const g = await geometry(card)
    expect(g.img.x).toBeCloseTo(34, 1)
    expect(await portrait(card).evaluate((el) => getComputedStyle(el).filter)).toContain(
      '0px 20px 28px',
    )
  })
})
