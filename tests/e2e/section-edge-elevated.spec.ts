import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

import { test } from './fixtures/test'
import {
  backgroundOf,
  frameOf,
  near,
  over,
  pixelsAt,
  roleIn,
  section,
  settled,
  TOLERANCE,
} from './section-edge-pixels'

/**
 * Elevated in a real browser (task 151, Slice 6): a straight boundary with a shadow strip outside the section.
 * What it must do, and what it must not: the shadow paints below the boundary, over what follows (a light or a
 * dark section, the next Elevated section, the footer); it shifts no layout, blocks no click, clips nowhere (not
 * even on a section that clips its own overflow) and makes the page no wider; it is hidden in forced colours and
 * does not depend on mask support; after a shaped edge, the section still takes that edge's overlap.
 *
 * `/edge-elevated`, `/edge-elevated-last` and `/edge-elevated-minimal` are the fixtures. Runs in Chromium in CI;
 * `playwright.webkit.config.ts` runs it in Playwright's WebKit locally (not Safari or an iPhone).
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/** Soft and Deep: how far the shadow reaches (px) and how dark it starts (a share of the ink). globals.css. */
const SHADOWS = {
  soft: { depth: 18, strength: 0.16 },
  deep: { depth: 28, strength: 0.24 },
} as const
type Shadow = keyof typeof SHADOWS

/** The shadow's opacity at `t` (0 at the boundary, 1 at the strip's foot): the Lab's gradient, 35% by 40%. */
const alphaAt = (t: number, strength: number) =>
  t < 0.4
    ? strength + (0.35 * strength - strength) * (t / 0.4)
    : 0.35 * strength * (1 - (t - 0.4) / 0.6)

const strip = (page: Page, id: string) => frameOf(page, id).locator('[data-edge-shadow]')
const HIDE = '[data-edge-shadow] { display: none !important; }'

/** A section's bottom edge in page px, once the layout holds still. */
async function bottomOf(page: Page, id: string) {
  await settled(frameOf(page, id))
  return section(page, id).evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY)
}

/** The page's own ink (the shadow's colour), as sRGB. */
const inkOf = (page: Page) => roleIn(page.locator('main'), '--color-ink')

/** Scrolls so page-y `y` is in the middle of the window, returns the scroll offset. */
async function scrollTo(page: Page, y: number) {
  return page.evaluate((target) => {
    window.scrollTo(0, Math.max(0, target - window.innerHeight / 2))
    return window.scrollY
  }, y)
}

/** The colour at each (x, page-y) point, read from a screenshot of the window. */
async function readAt(page: Page, y: number, points: { x: number; dy: number }[]) {
  const scroll = await scrollTo(page, y)
  const png = await page.screenshot()
  return pixelsAt(
    page,
    png,
    points.map(({ x, dy }) => ({ x, y: y + dy - scroll })),
  )
}

/** That nothing is wider than the window. */
const overflowOf = (page: Page) =>
  page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }))

/**
 * The checks every Elevated section and its follower pass: the shadow's rows are the gradient's blend over the
 * follower, none of it is above the boundary, it takes no room, and a click through it reaches the follower.
 */
async function expectShadow(page: Page, id: string, belowId: string, shadow: Shadow) {
  const { depth, strength } = SHADOWS[shadow]
  const boundary = await bottomOf(page, id)
  const ink = await inkOf(page)
  const followerBg = await backgroundOf(page, section(page, belowId))

  // Geometry: the strip starts at the section's foot and is as deep as the shadow, across the frame.
  const box = await strip(page, id).evaluate((el) => {
    const r = el.getBoundingClientRect()
    const parent = el.parentElement
    if (!parent) throw new Error('The strip has no frame.')
    const frame = parent.getBoundingClientRect()
    return {
      top: r.top + window.scrollY,
      height: r.height,
      left: r.left,
      right: r.right,
      frameLeft: frame.left,
      frameRight: frame.right,
    }
  })
  expect(Math.abs(box.top - boundary), `${id}: the strip starts at the boundary`).toBeLessThan(0.75)
  expect(box.height, `${id}: the strip is as deep as the ${shadow} shadow`).toBeCloseTo(depth, 0)
  expect(box.left, `${id}: from the frame's left`).toBeCloseTo(box.frameLeft, 0)
  expect(box.right, `${id}: to the frame's right`).toBeCloseTo(box.frameRight, 0)

  // The rows: each is the ink at the gradient's opacity over the follower's colour. x is in the margin, clear of text.
  const rows = [2, Math.floor(depth * 0.35), Math.floor(depth * 0.6), depth - 3]
  const read = await readAt(
    page,
    boundary,
    rows.map((dy) => ({ x: 8, dy: dy + 0.5 })),
  )
  rows.forEach((row, i) => {
    const expected = over(ink, alphaAt((row + 0.5) / depth, strength), followerBg)
    expect(
      near(read[i], expected, TOLERANCE + 1),
      `${id}: row ${String(row)} is ${String(read[i])}, expected ${String(expected)}`,
    ).toBe(true)
  })
  // Above the boundary: untouched by the shadow, which is the same pixel with the strip gone.
  const [above] = await readAt(page, boundary, [{ x: 8, dy: -4 }])
  const strips = '[data-edge-shadow]'
  await page.addStyleTag({ content: `${strips} { display: none !important; }` })
  const [aboveWithout] = await readAt(page, boundary, [{ x: 8, dy: -4 }])
  expect(
    near(above, aboveWithout ?? [], 1),
    `${id}: nothing of the shadow above the boundary`,
  ).toBe(true)
  await page.reload()

  // No room taken: the layout is the same with the strip gone.
  const layout = () =>
    page.evaluate(
      ([a, b]) => ({
        height: document.documentElement.scrollHeight,
        bottom: document.querySelector(`section#${String(a)}`)?.getBoundingClientRect().bottom,
        top: document.querySelector(`section#${String(b)}`)?.getBoundingClientRect().top,
      }),
      [id, belowId],
    )
  const shown = await layout()
  await page.addStyleTag({ content: HIDE })
  expect(await layout(), `${id}: the strip shifts nothing`).toEqual(shown)
  expect(shown.top, `${id}: the follower starts where the section ends`).toBeCloseTo(
    shown.bottom ?? -1,
    0,
  )
  await page.reload()

  // A click through the shadow reaches the follower, not the strip.
  const y = boundary + depth / 2
  const scroll = await scrollTo(page, y)
  const x = 60
  const hit = await page.evaluate(
    ([px, py, follower]) => {
      const below = document.querySelector(`section#${String(follower)}`)
      const at = document.elementFromPoint(Number(px), Number(py))
      return {
        inFollower: Boolean(at && below?.contains(at)),
        isStrip: Boolean(at?.closest('[data-edge-shadow]')),
      }
    },
    [x, y - scroll, belowId],
  )
  expect(hit.isStrip, `${id}: the strip is not what is under the pointer`).toBe(false)
  expect(hit.inFollower, `${id}: the follower is what is under the pointer`).toBe(true)
  await page.evaluate((follower) => {
    const below = document.querySelector(`section#${follower}`)
    ;(window as unknown as { __clicks: number }).__clicks = 0
    below?.addEventListener('click', () => {
      ;(window as unknown as { __clicks: number }).__clicks++
    })
  }, belowId)
  await page.mouse.click(x, y - scroll)
  expect(
    await page.evaluate(() => (window as unknown as { __clicks: number }).__clicks),
    `${id}: a click in the shadow reaches the follower`,
  ).toBe(1)
}

/**
 * That the shadow darkens a follower with a picture behind it (so no exact colour is known): the same pixel is
 * darker with the strip drawn than without it. The exact blend is held over solid followers, above.
 */
async function expectShadowOver(page: Page, id: string, belowId: string) {
  const boundary = await bottomOf(page, id)
  const [shown] = await readAt(page, boundary, [{ x: 8, dy: 4.5 }])
  await page.addStyleTag({ content: HIDE })
  const [hidden] = await readAt(page, boundary, [{ x: 8, dy: 4.5 }])
  const drop = (hidden ?? []).reduce((sum, value, i) => sum + (value - (shown?.[i] ?? value)), 0)
  expect(
    drop,
    `${belowId}: darker with the shadow (${String(shown)} against ${String(hidden)})`,
  ).toBeGreaterThanOrEqual(3)
  expect(
    (hidden ?? []).every((value, i) => value >= (shown?.[i] ?? value)),
    `${belowId}: no channel is lighter`,
  ).toBe(true)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/edge-elevated')
})

test.describe('Elevated in the browser', () => {
  test.skip(({ isMobile }) => isMobile, 'Reads pixels at desktop widths')

  test('paints its Soft shadow below the boundary, over a light follower', async ({ page }) => {
    await expectShadow(page, 'ev-light', 'ev-light-below', 'soft')
  })

  test('paints its Deep shadow below the boundary, over a dark follower, where it all but disappears', async ({
    page,
  }, testInfo) => {
    // The shadow is ink at up to 24%, so over a near-black section it moves the colour by a few levels.
    await expectShadow(page, 'ev-dark', 'ev-dark-below', 'deep')
    const ink = await inkOf(page)
    const bg = await backgroundOf(page, section(page, 'ev-dark-below'))
    const darkest = over(ink, alphaAt(0.02, SHADOWS.deep.strength), bg)
    testInfo.annotations.push({
      type: 'shadow on the dark follower',
      description: `the follower is ${String(bg)}, its first row ${String(darkest)}: a change of at most ${String(Math.max(...bg.map((c, i) => Math.abs(c - (darkest[i] ?? 0)))))} levels`,
    })
  })

  test('is outside a section that clips its own overflow, so it is not clipped', async ({
    page,
  }) => {
    const clip = section(page, 'ev-clip')
    expect(await clip.evaluate((el) => getComputedStyle(el).overflow)).toBe('hidden')
    // The strip is not inside it, and its rows still paint below the boundary.
    expect(await clip.locator('[data-edge-shadow]').count()).toBe(0)
    await expectShadow(page, 'ev-clip', 'ev-clip-below', 'soft')
  })

  test('falls on the next Elevated section, which sits one stacking step lower', async ({
    page,
  }) => {
    const { depth, strength } = SHADOWS.soft
    const boundary = await bottomOf(page, 'ev-chain-1')
    const ink = await inkOf(page)
    const altBg = await backgroundOf(page, section(page, 'ev-chain-2'))
    const [row] = await readAt(page, boundary, [{ x: 8, dy: 4.5 }])
    expect(
      near(row, over(ink, alphaAt(4.5 / depth, strength), altBg), TOLERANCE + 1),
      `the first shadow over the second section: ${String(row)}`,
    ).toBe(true)
    // …and the second has its own, over the follower after it.
    await expectShadow(page, 'ev-chain-2', 'ev-chain-below', 'deep')
    const z = (id: string) =>
      frameOf(page, id).evaluate((el) => Number(getComputedStyle(el).zIndex))
    expect(await z('ev-chain-1')).toBeGreaterThan(await z('ev-chain-2'))
  })

  test('after a shaped edge, still takes that edge’s overlap, and pulls nothing up itself', async ({
    page,
  }) => {
    const wrapper = section(page, 'ev-after-shaped').locator(
      'xpath=ancestor::div[@data-edge-above]',
    )
    await expect(wrapper).toHaveCount(1)
    const band = await frameOf(page, 'ev-shaped').evaluate((el) => {
      const probe = document.createElement('div')
      probe.style.height = 'var(--edge-h)'
      el.append(probe)
      const h = probe.getBoundingClientRect().height
      probe.remove()
      return h
    })
    const margin = await wrapper.evaluate((el) => parseFloat(getComputedStyle(el).marginTop))
    expect(margin, 'pulled up under the wave by its height').toBeCloseTo(-band, 0)
    // The Elevated section itself pulls nothing up: the section after it has no follower wrapper.
    const after = section(page, 'ev-after-elevated')
    await expect(after.locator('xpath=ancestor::div[@data-edge-above]')).toHaveCount(0)
    expect(
      await after.evaluate((el) =>
        parseFloat(getComputedStyle(el.parentElement as Element).marginTop),
      ),
    ).toBe(0)
    // Its shadow still paints below its boundary, over the follower.
    await expectShadow(page, 'ev-after-shaped', 'ev-after-elevated', 'soft')
  })

  test('ignores the settings of a cut stored under it: it is drawn as Elevated, with no mask or extra room', async ({
    page,
  }) => {
    const frame = frameOf(page, 'ev-stale')
    expect(await frame.getAttribute('data-section-elevated')).toBe('soft')
    expect(await frame.getAttribute('data-section-edge-frame')).toBeNull()
    const style = await section(page, 'ev-stale').evaluate((el) => {
      const s = getComputedStyle(el)
      return {
        mask: s.getPropertyValue('mask-image') || s.getPropertyValue('-webkit-mask-image'),
        paddingBottom: s.paddingBottom,
      }
    })
    expect(style.mask === 'none' || style.mask === '').toBe(true)
    // The same bottom padding as a plain section of the same spacing.
    const plain = await section(page, 'ev-light-below').evaluate(
      (el) => getComputedStyle(el).paddingBottom,
    )
    expect(style.paddingBottom).toBe(plain)
    await expectShadow(page, 'ev-stale', 'ev-stale-below', 'soft')
  })

  test('makes the page no wider, and stays under the sticky header', async ({ page }) => {
    const { scrollWidth, clientWidth, bodyScrollWidth } = await overflowOf(page)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    expect(bodyScrollWidth).toBeLessThanOrEqual(clientWidth)
    await page.addStyleTag({
      content:
        '[data-site-chrome] header { background: rgb(240, 200, 10) !important; backdrop-filter: none !important; }',
    })
    const header = page.locator('[data-site-chrome] header').first()
    const headerBox = await header.boundingBox()
    if (!headerBox) throw new Error('No header.')
    const boundary = await bottomOf(page, 'ev-light')
    // The boundary and its shadow are scrolled up under the header.
    await page.evaluate(
      ([y, h]) => {
        window.scrollTo(0, Number(y) - Number(h) / 2)
      },
      [boundary, headerBox.y + headerBox.height / 2],
    )
    const drawn = await header.screenshot()
    await page.addStyleTag({ content: HIDE })
    expect(
      (await header.screenshot()).equals(drawn),
      'the header looks the same without the shadows',
    ).toBe(true)
  })
})

test.describe('Elevated as the last section', () => {
  test.skip(({ isMobile }) => isMobile, 'Reads pixels at desktop widths')

  test('on a normal page falls on the footer, with no band under it', async ({ page }) => {
    await page.goto('/edge-elevated-last')
    await expect(page.locator('[data-edge-backdrop]')).toHaveCount(0)
    const footer = page.locator('[data-site-chrome] footer').first()
    const boundary = await bottomOf(page, 'evl-last')
    const footerTop = await footer.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
    // The footer begins where the section ends (no band pulled up, none drawn), and the strip falls on it.
    expect(Math.abs(footerTop - boundary)).toBeLessThan(2)
    const { depth, strength } = SHADOWS.soft
    const ink = await inkOf(page)
    const footerBg = await backgroundOf(page, footer)
    const row = 6
    const [px] = await readAt(page, boundary, [{ x: 8, dy: row + 0.5 }])
    const expected = over(ink, alphaAt((row + 0.5) / depth, strength), footerBg)
    expect(
      near(px, expected, TOLERANCE + 1),
      `over the footer: ${String(px)} vs ${String(expected)}`,
    ).toBe(true)
    const { scrollWidth, clientWidth } = await overflowOf(page)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })

  test('on a Minimal page is not drawn past the page’s end, but is drawn between sections, and keeps the screen backdrop’s clip', async ({
    page,
  }) => {
    await page.goto('/edge-elevated-minimal')
    const last = section(page, 'evm-last')
    await settled(frameOf(page, 'evm-last'))
    const display = (id: string) => strip(page, id).evaluate((el) => getComputedStyle(el).display)
    // Nothing follows the last section, so its shadow has nothing to fall on; a section in the middle keeps its own.
    expect(await display('evm-last')).toBe('none')
    expect(await display('evm-middle')).not.toBe('none')
    // So the page ends where the last section ends: the shadow adds no scroll height or width.
    const height = () => page.evaluate(() => document.documentElement.scrollHeight)
    const shown = await height()
    const { scrollWidth, clientWidth } = await overflowOf(page)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    // The middle section's shadow falls on the last section, as on any page (read before the strips are hidden).
    await expectShadowOver(page, 'evm-middle', 'evm-last')
    // …which hides them, and the page is exactly as tall without them as with them.
    expect(await height(), 'the shadows add no page height').toBe(shown)
    // The last section is found as the last: its backdrop reaches past the page's end (S3), as before.
    const bottomClip = await last.evaluate((el) => {
      const backdrop = el.querySelector('[data-screen-backdrop]')
      return backdrop
        ? getComputedStyle(backdrop).getPropertyValue('--screen-backdrop-bottom').trim()
        : null
    })
    expect(bottomClip).toMatch(/^-100lvh$/)
  })
})

test.describe('Elevated on a phone', () => {
  test.skip(({ isMobile }) => isMobile, 'Sets its own viewport')
  test.use({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 1 })

  test('is the same shadow, and makes the page no wider', async ({ page }) => {
    await page.goto('/edge-elevated')
    await expectShadow(page, 'ev-light', 'ev-light-below', 'soft')
    await page.goto('/edge-elevated')
    await expectShadow(page, 'ev-dark', 'ev-dark-below', 'deep')
    await page.goto('/edge-elevated')
    const { scrollWidth, clientWidth } = await overflowOf(page)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
})

test.describe('fallbacks', () => {
  test('hides the shadow in forced colours: the straight boundary shows', async ({
    page,
    browserName,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    const supported = await page.evaluate(() => matchMedia('(forced-colors: active)').matches)
    test.skip(!supported, `${browserName} can't emulate forced colours`)
    const strips = page.locator('[data-edge-shadow]')
    expect(await strips.count()).toBeGreaterThan(0)
    for (const display of await strips.evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).display),
    ))
      expect(display).toBe('none')
  })

  test('does not depend on mask support: no rule for a browser without masks reaches it', async ({
    page,
  }) => {
    // Every rule inside an `@supports not (mask-image …)` block, applied, must leave the strip drawn.
    const selectors = await page.evaluate(() => {
      const found: string[] = []
      for (const sheet of document.styleSheets)
        for (const rule of sheet.cssRules)
          if (
            rule instanceof CSSSupportsRule &&
            rule.conditionText.trim().startsWith('not') &&
            rule.conditionText.includes('mask-image')
          )
            for (const inside of rule.cssRules)
              if (inside instanceof CSSStyleRule) found.push(inside.selectorText)
      return found
    })
    expect(selectors.length, 'the no-mask rules exist (the control)').toBeGreaterThan(0)
    const reached = await page.evaluate((list) => {
      const strips = [...document.querySelectorAll('[data-edge-shadow]')]
      return strips.filter((el) => list.some((selector) => el.matches(selector))).length
    }, selectors)
    expect(reached).toBe(0)
    // And the proof by use: with those rules in force, the strips are still drawn.
    const texts = await page.evaluate(() => {
      for (const sheet of document.styleSheets)
        for (const rule of sheet.cssRules)
          if (
            rule instanceof CSSSupportsRule &&
            rule.conditionText.trim().startsWith('not') &&
            rule.conditionText.includes('mask-image')
          )
            return [...rule.cssRules].map((inside) => inside.cssText)
      return []
    })
    await page.addStyleTag({ content: texts.join('\n') })
    for (const display of await page
      .locator('[data-edge-shadow]')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).display)))
      expect(display).not.toBe('none')
  })
})

test('has no WCAG 2.2 AA violations', async ({ page }) => {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(violations.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([])
})
