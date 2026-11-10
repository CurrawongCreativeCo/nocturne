import { readFileSync } from 'node:fs'

import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test'

import { test } from './fixtures/test'
import { edgeReading, geometry } from './picture-depth-helpers'

/**
 * Picture depth on Events Featured (README, "Picture depth and glow"): `/picture-depth-events`. The featured card
 * clips, so a picture with a depth is inset by the room that depth needs, inside the 16:9 space it already has.
 * This checks that the card keeps its size and the text its place, that the picture stays 16:9, that the shadow
 * has faded out before the card's edge (read from the screenshot's pixels; the Team spec holds the control that
 * shows the reading does see a cut-off shadow), and that nothing changes while nothing is chosen or there is no
 * picture.
 */

const PAGE = '/picture-depth-events'
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PHOTO = readFileSync('tests/e2e/fixtures/portrait-photo.jpg')

test.beforeEach(async ({ page }) => {
  // The event's picture is a real photograph here, not the flat colour the fake lake serves every picture.
  await page.route(
    'https://cdn.sanity.io/images/**/0123456789abcdef0123456789abcdef01234567-*',
    (route) => route.fulfill({ contentType: 'image/jpeg', body: PHOTO }),
  )
})

const section = (page: Page, heading: string) =>
  page
    .locator('#main-content section')
    .filter({ has: page.getByRole('heading', { name: heading }) })
const card = (scope: Locator) => scope.locator('article').first()

/** The depth levels, with the room each needs at the side and above the picture (depth-options.ts). */
const LEVELS = [
  ['Events soft', 8, 4],
  ['Events raised', 16, 6],
  ['Events floating', 28, 12],
  ['Events floating strong glow', 34, 24],
  ['Events strong glow only', 22, 22],
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

  test('nothing chosen is today’s card: a flush 16:9 picture, no filter, no inset', async ({
    page,
  }) => {
    for (const heading of ['Events nothing chosen', 'Events flat and glow off']) {
      const c = card(section(page, heading))
      const g = await geometry(c)
      expect(g.img.x, heading).toBeCloseTo(0, 1)
      expect(g.img.y, heading).toBeCloseTo(0, 1)
      expect(g.img.w, heading).toBeCloseTo(g.card.w, 0)
      expect(g.img.h, heading).toBeCloseTo((g.img.w * 9) / 16, 0)
      expect(await c.locator('img').evaluate((el) => getComputedStyle(el).filter), heading).toBe(
        'none',
      )
      expect(
        await c.evaluate((el) => getComputedStyle(el.firstElementChild ?? el).padding),
        heading,
      ).toBe('0px')
    }
  })

  for (const [heading, clearance, top] of LEVELS) {
    test(`${heading}: the card and its text keep their size and place, the picture is inset by ${clearance}px at the side and ${top}px above`, async ({
      page,
    }) => {
      const before = await geometry(card(section(page, 'Events nothing chosen')))
      const c = card(section(page, heading))
      const after = await geometry(c)
      // The card's outer size, the slot the picture lives in and where the text starts: unchanged.
      expect(after.card.w).toBeCloseTo(before.card.w, 1)
      expect(after.card.h).toBeCloseTo(before.card.h, 1)
      expect(after.slot.h).toBeCloseTo(before.slot.h, 1)
      expect(after.textTop).toBeCloseTo(before.textTop, 1)
      // The picture is smaller, inset on each side by the clearance, and still 16:9.
      expect(after.img.x).toBeCloseTo(clearance, 1)
      expect(after.img.w).toBeCloseTo(after.card.w - 2 * clearance, 1)
      expect(after.img.h).toBeCloseTo((after.img.w * 9) / 16, 1)
      expect(after.img.y).toBeCloseTo(Math.min(top, after.slot.h - after.img.h), 1)
      // It keeps the card's corners.
      expect(
        await c.locator('img').evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
      ).not.toBe('0px')
    })
  }

  test('the card’s own surface, ring and shadow are the same with a depth as without', async ({
    page,
  }) => {
    const style = (c: Locator) =>
      c.evaluate((el) => {
        const css = getComputedStyle(el)
        return [css.boxShadow, css.borderRadius, css.backgroundColor, css.overflow, css.position]
      })
    const none = await style(card(section(page, 'Events nothing chosen')))
    for (const [heading] of LEVELS) {
      expect(await style(card(section(page, heading))), heading).toEqual(none)
    }
  })

  test('the whole fade shows: it is gone before the card’s edge', async ({ page }, testInfo) => {
    for (const [heading] of LEVELS) {
      const c = card(section(page, heading))
      await c.scrollIntoViewIfNeeded()
      const { strongest, edge, where } = await edgeReading(page, c)
      expect(strongest, `${heading}: a shadow shows under the picture`).toBeGreaterThan(12)
      expect(
        edge,
        `${heading}: the edge holds ${edge} (${where}) of a shadow ${strongest} strong`,
      ).toBeLessThan(Math.max(8, strongest * 0.25))
      await attach(testInfo, heading, c)
    }
  })

  test('without a picture nothing changes: the date badge stays and no filter or inset is drawn', async ({
    page,
  }) => {
    const none = card(section(page, 'Events no picture nothing chosen'))
    const depth = card(section(page, 'Events no picture floating'))
    await expect(depth.locator('img')).toHaveCount(0)
    const [a, b] = [await none.boundingBox(), await depth.boundingBox()]
    expect(b?.width).toBeCloseTo(a?.width ?? 0, 1)
    expect(b?.height).toBeCloseTo(a?.height ?? 0, 1)
    expect(await depth.evaluate((el) => getComputedStyle(el.firstElementChild ?? el).padding)).toBe(
      '0px',
    )
    expect(
      await depth.evaluate(
        (el) => el.querySelectorAll('[style*="depth-filter"], [class*="depth-filter"]').length,
      ),
    ).toBe(0)
  })

  test('mobile photograph review: Floating with a Strong glow', async ({ page }, testInfo) => {
    for (const heading of ['Events nothing chosen', 'Events floating strong glow']) {
      const c = card(section(page, heading))
      await c.scrollIntoViewIfNeeded()
      await attach(testInfo, `photo ${heading}`, c)
    }
  })
})

test.describe('motion on', () => {
  test.use({ reducedMotion: 'no-preference' })

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
  })

  test('the whole card is still one link, and the picture’s inset takes no clicks of its own', async ({
    page,
  }) => {
    for (const heading of ['Events nothing chosen', 'Events floating strong glow']) {
      const c = card(section(page, heading))
      await c.scrollIntoViewIfNeeded()
      const link = c.getByRole('link').first()
      const href = await link.getAttribute('href')
      expect(href, heading).toContain('/events/')
      // The picture's centre, and a point in its inset margin, both land on that link.
      const hits = await c.evaluate((el) => {
        const img = el.querySelector('img')?.getBoundingClientRect()
        const box = el.getBoundingClientRect()
        if (!img) return []
        const at = (x: number, y: number) =>
          document.elementFromPoint(x, y)?.closest('a')?.getAttribute('href') ?? null
        return [
          at(img.x + img.width / 2, img.y + img.height / 2),
          at(box.x + 4, img.y + img.height / 2),
        ]
      })
      expect(hits, heading).toEqual([href, href])
    }
  })

  test('keyboard focus lands on the card’s link, shows a focus ring and moves nothing', async ({
    page,
  }) => {
    const c = card(section(page, 'Events floating strong glow'))
    await c.scrollIntoViewIfNeeded()
    const before = await geometry(c)
    const link = c.getByRole('link').first()
    await link.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(link).toBeFocused()
    expect(await link.evaluate((el) => el.matches(':focus-visible'))).toBe(true)
    // A focus ring is drawn: the link's own outline (the global focus style).
    expect(await link.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none')
    // Nothing moved (to half a pixel: focusing scrolls, and sub-pixel layout is not movement).
    const after = await geometry(c)
    for (const [name, value] of [
      ['card width', after.card.w - before.card.w],
      ['card height', after.card.h - before.card.h],
      ['picture x', after.img.x - before.img.x],
      ['picture y', after.img.y - before.img.y],
      ['picture width', after.img.w - before.img.w],
      ['text top', after.textTop - before.textTop],
    ] as const) {
      expect(Math.abs(value), name).toBeLessThan(0.5)
    }
    expect(await c.locator('img').evaluate((el) => getComputedStyle(el).filter)).toContain(
      '0px 20px 28px',
    )
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
    await section(page, 'Events floating strong glow').scrollIntoViewIfNeeded()
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
        [...el.querySelectorAll('article img')].map((img) =>
          [img.getAttribute('alt'), img.getAttribute('role'), img.getAttribute('aria-hidden')].join(
            '|',
          ),
        ),
      )
    const withDepth = await exposed('Events floating strong glow')
    expect(withDepth.length).toBeGreaterThan(0)
    expect(withDepth).toEqual(await exposed('Events nothing chosen'))
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('server markup', () => {
  test('carries the inset and the shadow in the HTML itself, before any script runs', async ({
    request,
  }) => {
    // The upcoming events stream into the page (Suspense), so without JavaScript they stay in a hidden template:
    // read the HTML the server sent instead.
    const html = await (await request.get(PAGE)).text()
    const section = html.slice(html.indexOf('Events floating strong glow'))
    // Floating with a Strong glow on a 16:9 picture: 24px above, 34px each side, and the rest (14.25px) below.
    expect(section).toContain('padding:24px 34px 14.25px')
    expect(section).toContain('[filter:var(--depth-filter)]')
    expect(section).toContain('--depth-picture-floating')
    // Nothing chosen: none of it.
    const none = html.slice(html.indexOf('Events nothing chosen'), html.indexOf('Events soft'))
    expect(none).not.toContain('depth-filter')
    expect(none).not.toContain('padding:')
  })
})
