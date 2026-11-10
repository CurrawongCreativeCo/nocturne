import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * Picture depth on the Testimonials' avatars (README, "Picture depth and glow"): `/picture-depth-testimonials`
 * has a grid and a slider with nothing chosen, and with Floating on large, ringed avatars. The filter is on
 * the avatar's outer element, so it follows the circle and its ring; the shadow must never be cut off by the
 * card, the slider's viewport or anything else that clips.
 */

const PAGE = '/picture-depth-testimonials'
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const section = (page: Page, heading: string) =>
  page
    .locator('#main-content section')
    .filter({ has: page.getByRole('heading', { name: heading }) })
const avatars = (scope: Locator) => scope.locator('[data-profile-image]')
const filterOf = (scope: Locator) =>
  avatars(scope)
    .first()
    .evaluate((el) => getComputedStyle(el).filter)

interface Clip {
  /** Shadow pixels past the clipping box: positive is cut off. */
  overflow: { left: number; right: number; top: number; bottom: number }
  clippedBy: string
}

/**
 * How far the avatar's drop-shadow chain reaches past each clipping ancestor (any `overflow` other than
 * visible), measured from the real layout. A blur of radius B is visible out to about B from the avatar's edge.
 * Each shadow is measured on its own: a drop-shadow of a faint shadow is too faint to see, so chained extents
 * are not added together.
 */
const clipsOf = (avatar: Locator): Promise<Clip[]> =>
  avatar.evaluate((el) => {
    const shadows = [
      ...getComputedStyle(el).filter.matchAll(/drop-shadow\(([^]*?)\)(?= drop-shadow|$)/g),
    ]
    const box = el.getBoundingClientRect()
    let bounds = { left: box.left, right: box.right, top: box.top, bottom: box.bottom }
    for (const [, body = ''] of shadows) {
      const numbers = [...body.matchAll(/(-?[\d.]+)px/g)].map((m) => parseFloat(m[1] ?? '0'))
      const [x = 0, y = 0, blur = 0] = numbers.slice(-3)
      bounds = {
        left: Math.min(bounds.left, box.left + x - blur),
        right: Math.max(bounds.right, box.right + x + blur),
        top: Math.min(bounds.top, box.top + y - blur),
        bottom: Math.max(bounds.bottom, box.bottom + y + blur),
      }
    }
    const clips: Clip[] = []
    for (let up = el.parentElement; up; up = up.parentElement) {
      const style = getComputedStyle(up)
      if (style.overflowX === 'visible' && style.overflowY === 'visible') continue
      const rect = up.getBoundingClientRect()
      const inner = {
        left: rect.left + parseFloat(style.borderLeftWidth),
        right: rect.right - parseFloat(style.borderRightWidth),
        top: rect.top + parseFloat(style.borderTopWidth),
        bottom: rect.bottom - parseFloat(style.borderBottomWidth),
      }
      clips.push({
        overflow: {
          left: style.overflowX === 'visible' ? 0 : Math.max(0, inner.left - bounds.left),
          right: style.overflowX === 'visible' ? 0 : Math.max(0, bounds.right - inner.right),
          top: style.overflowY === 'visible' ? 0 : Math.max(0, inner.top - bounds.top),
          bottom: style.overflowY === 'visible' ? 0 : Math.max(0, bounds.bottom - inner.bottom),
        },
        clippedBy: `${up.tagName.toLowerCase()}.${up.className.slice(0, 60)}`,
      })
    }
    return clips
  })

const expectUncut = async (avatar: Locator, label: string) => {
  for (const clip of await clipsOf(avatar)) {
    for (const [side, amount] of Object.entries(clip.overflow)) {
      expect(
        amount,
        `${label}: the ${side} of the shadow is cut off by ${clip.clippedBy}`,
      ).toBeLessThan(0.5)
    }
  }
}

test.describe('motion on', () => {
  test.use({ reducedMotion: 'no-preference' })

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
  })

  test('nothing chosen draws no filter on any avatar', async ({ page }) => {
    for (const heading of ['Grid nothing chosen', 'Slider nothing chosen']) {
      const scope = section(page, heading)
      for (const avatar of await avatars(scope).all()) {
        expect(await avatar.evaluate((el) => getComputedStyle(el).filter), heading).toBe('none')
      }
    }
  })

  test('Flat with Glow off is the same as nothing chosen', async ({ page }) => {
    expect(await filterOf(section(page, 'Grid flat and glow off'))).toBe('none')
  })

  test('Floating with a soft glow filters every avatar in the grid, and none of the neighbours', async ({
    page,
  }) => {
    const scope = section(page, 'Grid floating')
    const all = await avatars(scope).all()
    expect(all).toHaveLength(3)
    for (const avatar of all) {
      const filter = await avatar.evaluate((el) => getComputedStyle(el).filter)
      expect(filter.split('drop-shadow(').length - 1).toBe(3)
      expect(filter).toContain('0px 20px 28px')
    }
    expect(await filterOf(section(page, 'Grid nothing chosen'))).toBe('none')
  })

  test('Raised on a large ringed avatar follows the ring, and a glow alone has no shadow', async ({
    page,
  }) => {
    const raised = section(page, 'Grid raised ring')
    expect(await filterOf(raised)).toContain('0px 4px 6px')
    await expect(raised.locator('[data-profile-image] .image-ring').first()).toHaveCount(1)
    const glow = await filterOf(section(page, 'Grid glow only'))
    expect(glow.split('drop-shadow(').length - 1).toBe(1)
    expect(glow).toMatch(/0px 0px 14px/)
  })

  test('the filter changes neither the avatar’s box nor the card’s or page’s layout', async ({
    page,
  }) => {
    const scope = section(page, 'Grid floating')
    const read = () =>
      scope.evaluate((el) => {
        const first = el.querySelector('[data-profile-image]')?.getBoundingClientRect()
        const card = el.querySelector('figure')?.getBoundingClientRect()
        return {
          avatar: [first?.x, first?.y, first?.width, first?.height],
          card: [card?.x, card?.y, card?.width, card?.height],
          page: document.documentElement.scrollHeight,
        }
      })
    const before = await read()
    await scope.evaluate((el) => {
      for (const avatar of el.querySelectorAll<HTMLElement>('[data-profile-image]')) {
        avatar.style.setProperty('filter', 'none', 'important')
      }
    })
    expect(await read()).toEqual(before)
  })

  test('no avatar’s shadow is cut off in the grid', async ({ page }) => {
    for (const heading of ['Grid floating', 'Grid raised ring', 'Grid glow only']) {
      for (const [n, avatar] of (await avatars(section(page, heading)).all()).entries()) {
        await expectUncut(avatar, `${heading} ${n + 1}`)
      }
    }
  })

  test('no avatar’s shadow is cut off in the slider: first, middle and last slides', async ({
    page,
  }) => {
    const scope = section(page, 'Slider floating')
    const next = scope.getByRole('button', { name: 'Next slide' })
    await expect(next).toBeVisible()
    await scope.scrollIntoViewIfNeeded()
    const slides = scope.locator('[aria-roledescription="slide"]')
    const settle = async () => {
      const track = slides.first().locator('..')
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
    const stops: string[] = []
    for (let step = 0; step < 8; step++) {
      await settle()
      const visible = await slides.evaluateAll((els) =>
        els.map((el, i) => (el.matches('[inert]') ? -1 : i)).filter((i) => i >= 0),
      )
      stops.push(visible.join(','))
      for (const index of visible) {
        await expectUncut(
          slides.nth(index).locator('[data-profile-image]'),
          `Slider floating, slide ${index + 1} (stop ${step + 1})`,
        )
      }
      if (await next.isDisabled()) break
      await next.click()
    }
    // It really did visit the first, middle and last positions.
    expect(stops.length).toBeGreaterThanOrEqual(3)
    expect(stops[0]).toMatch(/^0/)
    expect(await next.isDisabled()).toBe(true)
  })

  test.describe('the slider’s extra room below (bleed)', () => {
    const slider = (page: Page) => section(page, 'Slider floating')
    const viewportOf = (scope: Locator) =>
      scope.locator('[aria-roledescription="carousel"] > div').first()

    test('changes no slide width, scroll distance or page layout, only what is not clipped', async ({
      page,
    }) => {
      const scope = slider(page)
      await expect(scope.getByRole('button', { name: 'Next slide' })).toBeVisible()
      const read = () =>
        scope.evaluate((el) => {
          const first = el.querySelector('[aria-roledescription="slide"]')
          const track = first?.parentElement
          const nodes = [...el.querySelectorAll('button')].map((b) => b.getBoundingClientRect().top)
          return {
            slideWidth: first?.getBoundingClientRect().width,
            trackClient: track?.clientWidth,
            trackScroll: track?.scrollWidth,
            sectionHeight: el.getBoundingClientRect().height,
            controlsTop: nodes[0],
            page: document.documentElement.scrollHeight,
            pageWidth: document.documentElement.scrollWidth,
          }
        })
      const bleeding = await read()
      // The same slider with the default room: the figures must not change.
      await viewportOf(scope).evaluate((el) => {
        el.classList.remove('-mx-3', '-mt-3', '-mb-6', 'px-3', 'pt-3', 'pb-6')
        el.classList.add('-m-3', 'p-3')
      })
      expect(await read()).toEqual(bleeding)
      expect(bleeding.pageWidth).toBeLessThanOrEqual(await page.evaluate(() => innerWidth))
    })

    test('leaves the arrows and dots reachable by the pointer, and by the keyboard', async ({
      page,
    }) => {
      const scope = slider(page)
      const next = scope.getByRole('button', { name: 'Next slide' })
      await expect(next).toBeVisible()
      await scope.scrollIntoViewIfNeeded()
      // The viewport reaches below the slides, but the arrows are drawn above it.
      expect(
        await next.evaluate((el) => {
          const { x, y, width, height } = el.getBoundingClientRect()
          const hit = document.elementFromPoint(x + width / 2, y + height / 2)
          return hit !== null && el.contains(hit)
        }),
      ).toBe(true)
      await next.focus()
      await expect(next).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(scope.getByText('Slide 2 of 6', { exact: false })).toBeAttached()
      await page.keyboard.press('ArrowLeft')
      await expect(scope.getByText('Slide 1 of 6', { exact: false })).toBeAttached()
    })

    test('still drags', async ({ page }) => {
      const scope = slider(page)
      await expect(scope.getByRole('button', { name: 'Next slide' })).toBeVisible()
      await scope.scrollIntoViewIfNeeded()
      const slide = scope.locator('[aria-roledescription="slide"]:not([inert])').first()
      const box = (await slide.boundingBox()) ?? { x: 0, y: 0, width: 300, height: 100 }
      const y = box.y + box.height / 2
      const before = await slide.locator('..').evaluate((el) => getComputedStyle(el).transform)
      await page.mouse.move(box.x + box.width - 20, y)
      await page.mouse.down()
      await page.mouse.move(box.x + 40, y, { steps: 10 })
      await page.mouse.up()
      await expect
        .poll(() => slide.locator('..').evaluate((el) => getComputedStyle(el).transform))
        .not.toBe(before)
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
      await slider(page).scrollIntoViewIfNeeded()
      await expect(slider(page).getByRole('button', { name: 'Next slide' })).toBeVisible()
      await page.waitForTimeout(500)
      const total = await page.evaluate(() =>
        (window as unknown as { __shifts: number[] }).__shifts.reduce((a, b) => a + b, 0),
      )
      expect(problems).toEqual([])
      expect(total).toBeLessThan(0.01)
    })
  })

  test('adds nothing the accessibility tree reads, and passes axe', async ({ page }) => {
    // The same avatars are exposed the same way with the filter as without it.
    const exposed = (heading: string) =>
      section(page, heading).evaluate((el) =>
        [...el.querySelectorAll('[data-profile-image], [data-profile-image] *')].map((node) =>
          [
            node.tagName,
            node.getAttribute('role'),
            node.getAttribute('aria-hidden'),
            node.getAttribute('aria-label'),
            node.getAttribute('tabindex'),
            node.hasAttribute('alt') ? 'alt' : '',
          ].join('|'),
        ),
      )
    const withFilter = await exposed('Grid floating')
    expect(withFilter.length).toBeGreaterThan(0)
    expect(withFilter).toEqual(await exposed('Grid nothing chosen'))
    await expect(section(page, 'Grid floating').getByRole('img')).toHaveCount(
      await section(page, 'Grid nothing chosen').getByRole('img').count(),
    )
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('keeps the shadow on grid and slider avatars', async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    for (const heading of ['Grid floating', 'Slider floating']) {
      expect(await filterOf(section(page, heading)), heading).toContain('0px 20px 28px')
    }
  })
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('draws the shadow from the server’s markup, before the slider scripts anything', async ({
    page,
  }) => {
    await page.goto(PAGE)
    for (const heading of ['Grid floating', 'Slider floating']) {
      expect(await filterOf(section(page, heading)), heading).toContain('0px 20px 28px')
    }
  })
})
