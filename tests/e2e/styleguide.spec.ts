import AxeBuilder from '@axe-core/playwright'
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test'

/**
 * The style guide (README, "Style guide"): the sections view with tone, layout and width controls,
 * and the tokens view. The end-to-end build has E2E_GALLERY=1, so both are open here; the preview
 * token rules are unit-tested (src/lib/styleguide-access.test.ts, src/proxy.test.ts). The visual
 * baselines (visual.spec.ts) prove that, with nothing chosen, the gallery renders as it always did.
 */

// Every link re-renders the whole gallery on the server, which is slow while a full run keeps the
// server busy, so this file waits longer than the default.
const expect = baseExpect.configure({ timeout: 20_000 })
test.describe.configure({ timeout: 90_000 })

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const GALLERY = '/section-gallery'
const TOKENS = '/section-gallery/tokens'

const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

const section = (page: Page, id: string) => page.locator(`[data-gallery-section="${id}"]`)
const controls = (page: Page, label: string) =>
  page.getByRole('navigation', { name: `Preview options for ${label}` })

/** How many different columns a set of boxes starts in. */
async function columns(items: Locator) {
  const xs = await items.evaluateAll((elements) =>
    elements.map((element) => Math.round(element.getBoundingClientRect().x)),
  )
  return new Set(xs).size
}

test.describe('sections view', () => {
  test('is the plain gallery until something is chosen', async ({ page }) => {
    await page.goto(GALLERY)
    await expect(page.locator('[data-styleguide-frame]')).toHaveCount(0)
    await expect(page.locator('iframe')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Reset to the page as authored' })).toHaveCount(0)
    const widths = page.getByRole('list', { name: 'Preview width' })
    await expect(widths.getByRole('link', { name: 'Full' })).toHaveAttribute('aria-current', 'true')
    await expect(section(page, 'hero-overlay').locator('p').first()).toHaveText('hero (overlay)')
  })

  test('switches a section tone, and back', async ({ page }) => {
    await page.goto(GALLERY)
    const id = 'media-text-image-left'
    const frame = section(page, id).locator('section').first()
    await expect(frame).toHaveAttribute('data-tone', 'surface')

    await controls(page, 'mediaText (image left)').getByRole('link', { name: 'Dark' }).click()
    await expect(page).toHaveURL(new RegExp(`tone\\.${id}=inverse`))
    await expect(frame).toHaveAttribute('data-tone', 'inverse')
    await expect(section(page, id).locator('p').first()).toHaveText(
      'mediaText (image left, inverse section)',
    )
    // Only that section changed.
    await expect(
      section(page, 'media-text-image-right').locator('section').first(),
    ).toHaveAttribute('data-tone', 'surface')

    await page
      .getByRole('navigation', { name: /^Preview options for mediaText \(image left/ })
      .getByRole('link', { name: 'As authored' })
      .first()
      .click()
    await expect(frame).toHaveAttribute('data-tone', 'surface')
  })

  test('switches a layout, and offers none where a section has one', async ({ page }) => {
    await page.goto(GALLERY)
    await expect(section(page, 'features-grid-3-columns').locator('ul > li')).toHaveCount(6)
    const grid = controls(page, 'featuresGrid (3 columns)')
    await grid.getByRole('link', { name: '4', exact: true }).click()
    await expect(section(page, 'features-grid-3-columns').locator('p').first()).toHaveText(
      'featuresGrid (4 columns)',
    )

    // A FAQ has no layouts, so its controls hold a tone only.
    await expect(controls(page, 'faq').getByRole('link', { name: 'Dark' })).toBeVisible()
    await expect(controls(page, 'faq').getByText('Layout')).toHaveCount(0)
  })

  test('ignores a layout or tone the section does not have', async ({ page }) => {
    const response = await page.goto(`${GALLERY}?layout.faq=split&tone.faq=neon&width=999`)
    expect(response?.status()).toBe(200)
    await expect(page.locator('[data-styleguide-frame]')).toHaveCount(0)
    await expect(section(page, 'faq').locator('p').first()).toHaveText('faq')
  })

  test('keeps what was chosen in the link, and resets it', async ({ page }) => {
    await page.goto(`${GALLERY}?width=375&tone.faq=alt`)
    await expect(page.locator('[data-styleguide-frame="375"]').first()).toBeVisible()
    await expect(page.getByRole('link', { name: '375 px' })).toHaveAttribute('aria-current', 'true')
    // Choosing another width keeps the tone.
    await page.getByRole('link', { name: '768 px' }).click()
    await expect(page).toHaveURL(/width=768/)
    await expect(page).toHaveURL(/tone\.faq=alt/)
    await page.getByRole('link', { name: 'Reset to the page as authored' }).click()
    await expect(page).toHaveURL(/\/section-gallery$/)
    await expect(page.locator('[data-styleguide-frame]')).toHaveCount(0)
  })

  test('has no WCAG 2.2 AA violations in the controls and a framed section', async ({ page }) => {
    await page.goto(`${GALLERY}?width=375`)
    const results = await new AxeBuilder({ page })
      .withTags(WCAG)
      .include('nav[aria-label="Style guide"]')
      .include('[data-styleguide-controls]')
      .include('[data-styleguide-frame] [data-gallery-section="faq"]')
      .analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('width frames', () => {
  test.skip(({ isMobile }) => isMobile, 'The frames cannot be wider than a phone window')

  const items = (page: Page) => section(page, 'features-grid-3-columns').locator('ul > li')

  test('lay a section out for the chosen width, not the window', async ({ page }) => {
    // Three columns on the 1280 px desktop window...
    await page.goto(GALLERY)
    await expect.poll(() => columns(items(page))).toBe(3)

    // ...two in a tablet frame, one in a phone frame, three again in a laptop frame.
    for (const [width, expected] of [
      [768, 2],
      [375, 1],
      [1280, 3],
    ] as const) {
      await page.goto(`${GALLERY}?width=${width}`)
      const frame = page.locator(`[data-styleguide-frame="${width}"]`).first()
      await expect(frame).toBeVisible()
      const box = await frame.boundingBox()
      expect(box?.width).toBeCloseTo(Math.min(width, page.viewportSize()?.width ?? width), -1)
      await expect.poll(() => columns(items(page)), { message: `${width} px` }).toBe(expected)
    }
  })

  test('are containers, not iframes', async ({ page }) => {
    await page.goto(`${GALLERY}?width=375`)
    await expect(page.locator('iframe')).toHaveCount(0)
    const frame = page.locator('[data-styleguide-frame]').first()
    await expect(frame).toHaveCSS('container-type', 'inline-size')
    await expect(frame).toHaveCSS('container-name', 'styleguide')
  })
})

test.describe('tokens view', () => {
  test('has one h1, the colours with their contrast, and passes every pair', async ({ page }) => {
    await page.goto(TOKENS)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1, name: 'Design tokens' })).toBeVisible()
    await expect(page.getByRole('status')).toHaveText('Every pair meets WCAG 2.2 AA.')

    const table = page.getByRole('table', { name: /^Contrast ratios/ })
    const text = table.getByRole('row', { name: /^Text on page/ })
    await expect(text).toContainText('4.5:1 text')
    await expect(text).toContainText('Pass')
    await expect(table.getByText('Fails AA')).toHaveCount(0)
    // Black on white style numbers: the ink on the page is near-black on white.
    await expect(text.getByRole('cell').nth(1)).toHaveText(/^\d{2}\.\d{2}:1$/)

    for (const name of ['surface-alt', 'ink-muted', 'accent-text', 'danger-ink']) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
    }
  })

  test('shows the type scale, spacing, radii, shadows and motion tokens', async ({ page }) => {
    await page.goto(TOKENS)
    for (const heading of ['Colour', 'Type', 'Spacing, radii and shadows', 'Motion']) {
      await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible()
    }
    await expect(page.getByText('text-display', { exact: true })).toBeVisible()
    await expect(page.getByText('36–60 px · line 1.05 · tracking -0.025em')).toBeVisible()
    await expect(page.getByText('section-y-compact')).toBeVisible()
    await expect(page.getByText('rounded-card')).toBeVisible()
    await expect(page.getByText('shadow-raised')).toBeVisible()
  })

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    await page.goto(TOKENS)
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('shows the motion samples still, at the end of their movement', async ({ page }) => {
      await page.goto(TOKENS)
      await expect(page.getByRole('button', { name: /samples$/ })).toBeHidden()
      await expect(page.getByText('Your device asks for less motion')).toBeVisible()
      const bar = page.locator('[data-motion-sample="slow"]')
      await expect(bar).toHaveCSS('scale', '1')
      await expect(bar).toHaveCSS('opacity', '1')
      // globals.css shortens every transition to a hair under reduced motion.
      const seconds = await bar.evaluate((el) =>
        parseFloat(getComputedStyle(el).transitionDuration),
      )
      expect(seconds).toBeLessThan(0.001)
    })
  })

  test.describe('with motion allowed', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('plays and resets the samples on the tokens’ own durations', async ({ page }) => {
      await page.goto(TOKENS)
      await expect(page.getByText('Your device asks for less motion')).toBeHidden()
      const bar = page.locator('[data-motion-sample="slow"]')
      await expect(bar).toHaveCSS('transition-duration', '0.6s')
      await expect(bar).toHaveCSS('opacity', '0.3')

      const play = page.getByRole('button', { name: 'Play samples' })
      await play.click()
      await expect(page.getByRole('button', { name: 'Reset samples' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      await expect(bar).toHaveCSS('opacity', '1')
      await expect(bar).toHaveCSS('scale', '1')

      await page.getByRole('button', { name: 'Reset samples' }).click()
      await expect(bar).toHaveCSS('opacity', '0.3')
    })
  })
})

test.describe('never indexed', () => {
  for (const path of [GALLERY, TOKENS]) {
    test(`${path} says noindex in its header and its markup`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.headers()['x-robots-tag']).toContain('noindex')
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    })
  }

  test('the sitemap does not list the style guide', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).toContain('<loc>')
    expect(sitemap).not.toContain('section-gallery')
  })
})
