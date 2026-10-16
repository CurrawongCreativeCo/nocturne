import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Image design (README, "Image design"): a picture moves inside a still frame, and the decorative
 * frame over it never moves. Reduced motion and no JavaScript get the still, unscaled picture with
 * its frame.
 */

const PAGE = '/framed-images'
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`
const FRAME_FILE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill-rule="evenodd" d="M0 0H100V100H0Z M4 4V96H96V4Z"/></svg>`

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
  // Registered last, so it wins for the custom frame's file.
  await page.route('https://cdn.sanity.io/files/**/*.svg', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: FRAME_FILE }),
  )
})

const section = (page: Page, heading: string) => page.locator(`section:has(h2:text("${heading}"))`)
const box = (scope: Locator) => scope.locator('[data-framed-image]')
const frame = (scope: Locator) => scope.locator('[data-image-frame]')
/** The element Parallax moves: the picture, never the box or the frame. */
const mover = (scope: Locator) => scope.locator("[style*='--parallax-amount']")
/** The scaled wrapper around the <img>. */
const scaler = (scope: Locator) => scope.locator('[data-framed-image-picture]')

const rect = (locator: Locator) =>
  locator.evaluate((el) => {
    const { x, y, width, height } = el.getBoundingClientRect()
    return { x, y, width, height }
  })

const offsetOf = (scope: Locator) =>
  mover(scope).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42)

/** Jumps to a scroll position, then lets two frames pass so Motion has measured it. */
const scrollTo = async (page: Page, y: number) => {
  await page.evaluate(
    (top) =>
      new Promise<void>((resolve) => {
        window.scrollTo(0, top)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve()
          })
        })
      }),
    y,
  )
}

/** Scrolls so the section's top sits `before` px below the top of the screen. */
const scrollSection = async (page: Page, scope: Locator, before: number) => {
  const top = await scope.evaluate((el) => el.getBoundingClientRect().top + scrollY)
  await scrollTo(page, top - before)
}

test.describe('motion on', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('the picture moves while its frame and box stay put', async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    const scope = section(page, 'Built-in frame')
    await expect(frame(scope)).toBeVisible()

    // The frame's place inside its box, and the picture's, at three scroll positions.
    const sample = async () => {
      const [outer, overlay, inner] = await Promise.all([
        rect(box(scope)),
        rect(frame(scope)),
        rect(scaler(scope)),
      ])
      return {
        frame: {
          x: overlay.x - outer.x,
          y: overlay.y - outer.y,
          w: overlay.width,
          h: overlay.height,
        },
        picture: { y: inner.y - outer.y },
        offset: await offsetOf(scope),
      }
    }

    const samples = []
    for (const before of [650, 450, 250]) {
      await scrollSection(page, scope, before)
      await scrollTo(page, (await page.evaluate(() => scrollY)) + 1)
      samples.push(await sample())
    }

    // The frame never moves inside its box, however far the page scrolls...
    for (const next of samples.slice(1)) expect(next.frame).toEqual(samples[0]?.frame)
    // ...while the picture does: both its transform and its place behind the frame change.
    expect(new Set(samples.map(({ offset }) => Math.round(offset))).size).toBeGreaterThan(1)
    expect(new Set(samples.map(({ picture }) => Math.round(picture.y))).size).toBeGreaterThan(1)
    // The box and the frame carry no transform of their own.
    expect(await box(scope).evaluate((el) => getComputedStyle(el).transform)).toBe('none')
    expect(await frame(scope).evaluate((el) => getComputedStyle(el).transform)).toBe('none')
  })

  test('the picture always covers its frame, so no edge shows', async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    const scope = section(page, 'Built-in frame')
    let moved = false
    for (const before of [800, 600, 450, 300, 150, 0, -150, -300]) {
      await scrollSection(page, scope, before)
      await scrollTo(page, (await page.evaluate(() => scrollY)) + 1)
      const [outer, inner] = [await rect(box(scope)), await rect(scaler(scope))]
      moved ||= (await offsetOf(scope)) !== 0
      // The picture's box already includes its transform and its scale; 0.5px for rounding.
      expect(inner.y).toBeLessThanOrEqual(outer.y + 0.5)
      expect(inner.y + inner.height + 0.5).toBeGreaterThanOrEqual(outer.y + outer.height)
      expect(inner.x).toBeLessThanOrEqual(outer.x + 0.5)
      expect(inner.x + inner.width + 0.5).toBeGreaterThanOrEqual(outer.x + outer.width)
    }
    expect(moved).toBe(true)
  })

  test('scales the picture by 1.05 to 1.15, and by less on a phone, where it travels half as far', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(PAGE)
    const scope = section(page, 'Built-in frame')
    await expect(scaler(scope)).toBeAttached()
    const desktop = parseFloat(await scaler(scope).evaluate((el) => getComputedStyle(el).scale))
    // Medium parallax: 6 % travel each way, scaled by twice that.
    expect(desktop).toBeCloseTo(1.12, 2)
    expect(desktop).toBeGreaterThanOrEqual(1.05)
    expect(desktop).toBeLessThanOrEqual(1.15)

    await page.setViewportSize({ width: 390, height: 800 })
    const phone = parseFloat(await scaler(scope).evaluate((el) => getComputedStyle(el).scale))
    expect(phone).toBeCloseTo(1.06, 2)
    expect(phone).toBeLessThan(desktop)
  })

  test('a section’s own parallax moves the picture inside its frame, not the frame', async ({
    page,
  }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    const scope = section(page, 'Section parallax')
    // One mover in the section, and it is inside the still box.
    await expect(mover(scope)).toHaveCount(1)
    await expect(box(scope).locator("[style*='--parallax-amount']")).toHaveCount(1)
    await scrollSection(page, scope, 500)
    await scrollTo(page, (await page.evaluate(() => scrollY)) + 100)
    await expect.poll(() => offsetOf(scope)).not.toBe(0)
    expect(await box(scope).evaluate((el) => getComputedStyle(el).transform)).toBe('none')
  })

  test('a circle is always square, and clips the moving picture', async ({ page }) => {
    await page.goto(PAGE)
    const scope = section(page, 'Circle with parallax')
    const outer = await rect(box(scope))
    expect(Math.abs(outer.width - outer.height)).toBeLessThan(1)
    await expect(box(scope).locator('> div').first()).toHaveClass(/rounded-full/)
    await expect(frame(scope)).toHaveCount(0)
  })

  test('a custom frame is a masked, token-coloured div: never inlined', async ({ page }) => {
    await page.goto(PAGE)
    const scope = section(page, 'Approved custom frame')
    const custom = frame(scope)
    await expect(custom).toHaveAttribute('data-image-frame', 'custom')
    expect(await custom.evaluate((el) => el.tagName)).toBe('DIV')
    const style = await custom.evaluate((el) => {
      const computed = getComputedStyle(el)
      return {
        mask: computed.maskImage,
        background: computed.backgroundColor,
        size: computed.maskSize,
      }
    })
    expect(style.mask).toContain('https://cdn.sanity.io/files/test/test/')
    expect(style.size).toBe('100% 100%')
    // Filled with a token colour, not transparent.
    expect(style.background).not.toBe('rgba(0, 0, 0, 0)')
    // The uploaded file is not in the document as markup.
    expect(await scope.locator('svg').count()).toBe(0)
    await expect(custom).toHaveAttribute('aria-hidden', 'true')
    expect(await custom.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
  })

  test('a frame ignores the pointer and is hidden from assistive technology', async ({ page }) => {
    await page.goto(PAGE)
    const overlay = frame(section(page, 'Built-in frame'))
    await expect(overlay).toHaveAttribute('aria-hidden', 'true')
    expect(await overlay.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
  })

  test('a frame without motion leaves the picture still and unscaled', async ({ page }) => {
    await page.goto(PAGE)
    const scope = section(page, 'No motion')
    await expect(frame(scope)).toBeVisible()
    await expect(mover(scope)).toHaveCount(0)
    await expect(scaler(scope)).toHaveCount(0)
  })

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    await page.goto(PAGE)
    // Content sections fade up as they arrive: let each finish before axe measures its contrast.
    for (const element of await page.locator('[data-reveal]').all()) {
      await element.scrollIntoViewIfNeeded()
      await expect(element).toHaveCSS('opacity', '1')
    }
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(violations.map(({ id }) => id)).toEqual([])
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the picture is still and unscaled, and the frame is there', async ({ page }) => {
    await page.goto(PAGE)
    const scope = section(page, 'Built-in frame')
    await expect(frame(scope)).toBeVisible()
    await scrollSection(page, scope, 300)
    await page.mouse.wheel(0, 200)
    await page.waitForTimeout(300)
    expect(await mover(scope).evaluate((el) => getComputedStyle(el).transform)).toBe('none')
    expect(await mover(scope).evaluate((el) => el.getAttribute('style') ?? '')).not.toContain(
      'transform',
    )
    expect(await scaler(scope).evaluate((el) => getComputedStyle(el).scale)).toBe('none')
  })
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false, reducedMotion: 'no-preference' })

  test('the picture is in the HTML, unscaled, inside its frame', async ({ page }) => {
    await page.goto(PAGE)
    const scope = section(page, 'Built-in frame')
    await expect(scope.locator('img')).toHaveCount(1)
    await expect(frame(scope)).toBeVisible()
    expect(await mover(scope).evaluate((el) => getComputedStyle(el).transform)).toBe('none')
    expect(await scaler(scope).evaluate((el) => getComputedStyle(el).scale)).toBe('none')
  })
})
