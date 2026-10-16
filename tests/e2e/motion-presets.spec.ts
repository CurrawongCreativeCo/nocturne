import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * The section animation presets (README, "Section animation") on the `/motion-presets` fixture
 * page: every preset below the fold except the first section, which plays "On load". The
 * resolver's arithmetic is unit-tested (presets.test.ts); this checks what the browser does.
 */

const PAGE = '/motion-presets'
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

/** The element an entrance animates: the section's content container. */
const entrance = (page: Page, id: string) => page.locator(`section#${id} > [data-reveal]`)

const matrix = (page: Page, id: string) =>
  entrance(page, id).evaluate((element) => {
    const { m41, m42 } = new DOMMatrix(getComputedStyle(element).transform)
    return { x: m41, y: m42, opacity: Number(getComputedStyle(element).opacity) }
  })

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('each entrance starts hidden below the fold, then settles in place', async ({ page }) => {
    await page.goto(PAGE)
    for (const id of ['subtle', 'fade', 'slide', 'custom']) {
      const before = await matrix(page, id)
      expect(before.opacity, `${id} starts hidden`).toBe(0)
    }
    for (const id of ['subtle', 'fade', 'slide', 'custom']) {
      await page.locator(`section#${id}`).scrollIntoViewIfNeeded()
      await expect(entrance(page, id)).toHaveCSS('opacity', '1', { timeout: 5000 })
      await expect(entrance(page, id)).toHaveCSS('transform', 'none')
    }
  })

  test('starts each preset from its own offset', async ({ page }) => {
    await page.goto(PAGE)
    // Polled throughout: a slow runner can still be hydrating when the page loads.
    await expect.poll(() => matrix(page, 'subtle')).toMatchObject({ x: 0, y: 12 })
    // Fade has no offset at all.
    await expect.poll(() => matrix(page, 'fade')).toMatchObject({ x: 0, y: 0 })
    // Slide in "from the end" starts to the right, with no vertical offset.
    await expect.poll(() => matrix(page, 'slide')).toMatchObject({ x: 32, y: 0 })
    // Custom: 60 px.
    await expect.poll(() => matrix(page, 'custom')).toMatchObject({ x: 0, y: 60 })
  })

  test('ignores an Advanced option the preset does not use', async ({ page }) => {
    await page.goto(PAGE)
    // Stored Direction "end" and Intensity "bold" belong to other presets: Subtle still just rises 12 px.
    await expect.poll(() => matrix(page, 'leftover')).toMatchObject({ x: 0, y: 12 })
  })

  test('the first section plays on load and is never hidden', async ({ page, request }) => {
    // The server HTML never carries opacity 0 for it, so the heading is there before any script.
    const html = await (await request.get(PAGE)).text()
    const first = html.slice(html.indexOf('id="first"'), html.indexOf('id="subtle"'))
    expect(first).toContain('data-reveal')
    expect(first).not.toMatch(/opacity:\s*0[;"]/)

    await page.goto(PAGE)
    const heading = page.getByRole('heading', { level: 2, name: 'First section, plays on load' })
    await expect(heading).toBeVisible()
    await expect(entrance(page, 'first')).toHaveCSS('opacity', '1')
    await expect(entrance(page, 'first')).toHaveCSS('transform', 'none', { timeout: 5000 })
  })

  test('Float drifts the picture, not the text, and pauses off screen', async ({ page }) => {
    await page.goto(PAGE)
    const floating = page.locator('section#float [data-float]')
    await expect(floating).toHaveCount(1)
    await expect(floating).toHaveCSS('animation-name', 'float-drift')
    // Only the picture is inside it.
    await expect(floating.getByText('The picture drifts')).toHaveCount(0)
    await expect(floating.getByRole('img')).toHaveCount(1)
    // Off screen at the top of the page: paused.
    await expect(floating).toHaveAttribute('data-paused', '')
    await expect(floating).toHaveCSS('animation-play-state', 'paused')

    await page.locator('section#float').scrollIntoViewIfNeeded()
    await expect(floating).not.toHaveAttribute('data-paused')
    await expect(floating).toHaveCSS('animation-play-state', 'running')
    // Transform only.
    await expect
      .poll(() => floating.evaluate((element) => getComputedStyle(element).transform))
      .not.toBe('none')
    // 16 px at md and up; the half-size travel below md is a CSS variable.
    await expect(floating).toHaveCSS('--float-distance', '16px')
  })

  test('Parallax strength sets the picture’s speed, and Strong with Bold stays in range', async ({
    page,
  }) => {
    await page.goto(PAGE)
    const amount = (id: string) =>
      page
        .locator(`section#${id} [style*='--parallax-amount']`)
        .first()
        .evaluate((element) =>
          Number(getComputedStyle(element).getPropertyValue('--parallax-amount')),
        )
    // Subtle beside the text is the original 0.15; Strong 0.45 at Bold is 0.675, held at 0.35 (a 1.15 picture scale, image-travel.ts) for a picture that moves inside its frame.
    // The client sets the amount once it has loaded, so wait for it.
    await expect.poll(() => amount('parallax-subtle')).toBe(0.15)
    await expect.poll(() => amount('parallax-strong')).toBe(0.35)
  })

  test('has no WCAG 2.2 AA violations once everything has played', async ({ page }) => {
    await page.goto(PAGE)
    // Let the page finish hydrating: a section replaced mid-scroll is "not attached to the DOM".
    await page.waitForLoadState('networkidle')
    for (const id of [
      'subtle',
      'fade',
      'slide',
      'custom',
      'leftover',
      'float',
      'parallax-strong',
    ]) {
      await expect(page.locator(`section#${id}`)).toBeAttached()
      await page.locator(`section#${id}`).scrollIntoViewIfNeeded()
    }
    await expect(entrance(page, 'custom')).toHaveCSS('opacity', '1', { timeout: 5000 })
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(violations.map(({ id }) => id)).toEqual([])
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('shows everything in place and stops Float', async ({ page }) => {
    await page.goto(PAGE)
    for (const element of await page.locator('[data-reveal]').all()) {
      await expect(element).toHaveCSS('opacity', '1')
      await expect(element).toHaveCSS('transform', 'none')
    }
    await expect(page.locator('section#float [data-float]')).toHaveCSS('animation-name', 'none')
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false, reducedMotion: 'no-preference' })

  test('keeps the content readable', async ({ page }) => {
    await page.goto(PAGE)
    for (const element of await page.locator('[data-reveal]').all()) {
      await expect(element).toHaveCSS('opacity', '1')
    }
    await expect(page.getByText('Preset slide')).toBeVisible()
    // Float's loop is plain CSS, so it still runs.
    await expect(page.locator('section#float [data-float]')).toHaveCSS(
      'animation-name',
      'float-drift',
    )
  })
})
