import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * The Link list section and the Link page (README, "Link list"). `/links` is a minimal page (no
 * header or footer) with a profile, custom social icons, a large featured link carrying UTM tags,
 * groups, and links that are hidden, not yet due, past their date, or in their window. `/link-list` is
 * an ordinary page with two layouts; the section gallery has one entry per preset.
 *
 * The fixture's dates are in 2020 and 2099, so the server's real clock always gives the same outcome
 * (scheduling is decided on the server at request time, so a browser clock can't move it).
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PRESETS = ['stacked', 'cards', 'editorial', 'compact', 'image-focused', 'glass-rows']

const main = (page: Page) => page.locator('#main-content')
// A link's name is its label, then its description when it has one ("Book a consultation. Thirty minutes").
const link = (page: Page, name: string) =>
  main(page).getByRole('link', {
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`),
  })

/** What each link on the page tells analytics, in page order: its label is the name it is drawn with. */
const drawnLinks = (page: Page) =>
  main(page)
    .locator('li[data-track-event]')
    .evaluateAll((items) =>
      items.map(
        (item) =>
          JSON.parse(item.getAttribute('data-track-props') ?? '{}') as Record<string, unknown>,
      ),
    )
const visibleLinks = async (page: Page) => (await drawnLinks(page)).map((props) => props.label)

test.describe('the Link page', () => {
  test('lists the links in the editor’s order, leaving out hidden and not-yet-due ones', async ({
    page,
    request,
  }) => {
    await page.goto('/links')
    // Scheduled links are decided at request time and stream in after the prerendered page.
    await expect(link(page, 'Spring offer')).toBeVisible()
    expect(await visibleLinks(page)).toEqual([
      'Book a consultation',
      'Read the journal',
      'Spring offer',
      'Shop the range',
      'Gift cards',
    ])

    // Hidden links and links that aren't due never reach the visitor, not even in the page source.
    const html = await (await request.get('/links')).text()
    for (const gone of [
      'Secret link',
      'Opening soon',
      'Last summer',
      'Launch party',
      'example.com/soon',
    ]) {
      expect(html, gone).not.toContain(gone)
    }
    expect(html).toContain('Spring offer')
  })

  test('leaves out a group heading while none of its links are due', async ({ page }) => {
    await page.goto('/links')
    await expect(page.getByRole('heading', { level: 3, name: 'Shop' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Coming up' })).toHaveCount(0)
  })

  test('has no header, footer or announcement, and is still a complete page', async ({ page }) => {
    await page.goto('/links')
    await expect(page.getByRole('banner')).toHaveCount(0)
    await expect(page.getByRole('contentinfo')).toHaveCount(0)
    await expect(page.getByText('Summer sale')).toBeHidden()
    await expect(page.locator('header').first()).toBeHidden()
    await expect(page.locator('footer')).toBeHidden()
    await expect(main(page)).toBeVisible()
    await expect(main(page)).toContainText('© Test Co. Made in Newtown.')
  })

  test('brings the header and footer back when you leave, and takes them away when you return', async ({
    page,
  }) => {
    // Next keeps the page you left, hidden, in the DOM: its marker must not count once it is hidden.
    const push = (path: string) =>
      page.evaluate((to) => {
        ;(
          window as unknown as { next: { router: { push: (href: string) => void } } }
        ).next.router.push(to)
      }, path)

    await page.goto('/about')
    await expect(page.getByRole('banner')).toBeVisible()

    await push('/links')
    await expect(page.getByRole('link', { name: 'Read the journal' })).toBeVisible()
    await expect(page.getByRole('banner')).toHaveCount(0)
    await expect(page.getByRole('contentinfo')).toHaveCount(0)

    await push('/about')
    await expect(page.getByRole('heading', { level: 2, name: 'How we work' })).toBeVisible()
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('contentinfo')).toBeVisible()

    await push('/links')
    await expect(page.getByRole('banner')).toHaveCount(0)
  })

  test('other pages keep their header and footer', async ({ page }) => {
    for (const path of ['/about', '/link-list']) {
      await page.goto(path)
      await expect(page.getByRole('banner')).toBeVisible()
      await expect(page.getByRole('contentinfo')).toBeVisible()
    }
  })

  test('leaves the sticky header sticking on other pages', async ({ page }) => {
    // The shell wraps the header in a box-less [data-site-chrome]: it must not change how it sticks.
    await page.goto('/link-list')
    await page.evaluate(() => {
      window.scrollTo(0, 600)
    })
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300)
    expect((await page.getByRole('banner').boundingBox())?.y).toBe(0)
  })

  test('has one <h1>, then the profile name and group headings in order', async ({ page }) => {
    await page.goto('/links')
    await expect(main(page).locator('h1')).toHaveText('Links')
    const levels = await main(page)
      .locator('h1, h2, h3:visible')
      .evaluateAll((headings) =>
        headings.map((heading) => `${heading.tagName.toLowerCase()} ${heading.textContent}`),
      )
    // The newsletter signup after the list is the pre-launch gate's fixture (prelaunch-gate.spec.ts).
    expect(levels).toEqual(['h1 Links', 'h2 Test Co', 'h3 Shop', 'h2 Be the first to know'])
  })

  test('shows the profile, with the bio under the name', async ({ page }) => {
    await page.goto('/links')
    await expect(main(page).getByRole('heading', { level: 2, name: 'Test Co' })).toBeVisible()
    await expect(main(page).getByText('Small-batch ceramics from the Inner West.')).toBeVisible()
  })

  test('shows the section’s own social icons as named links', async ({ page }) => {
    await page.goto('/links')
    const socials = page.getByRole('navigation', { name: 'Social profiles' })
    await expect(socials.getByRole('link')).toHaveCount(2)
    await expect(socials.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://instagram.com/testco',
    )
    await expect(socials.getByRole('link', { name: 'YouTube' })).toHaveAttribute(
      'href',
      'https://youtube.com/@testco',
    )
  })

  test('adds UTM tags to a website link, and only the tags that were set', async ({ page }) => {
    await page.goto('/links')
    const href = await link(page, 'Book a consultation').getAttribute('href')
    const url = new URL(href ?? '')
    expect(url.origin + url.pathname).toBe('https://example.com/book')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      utm_source: 'instagram',
      utm_medium: 'bio',
      utm_campaign: 'spring',
    })
    await expect(link(page, 'Shop the range')).toHaveAttribute('href', 'https://example.com/shop')
    // A page on this site is never tagged.
    await expect(link(page, 'Read the journal')).toHaveAttribute('href', '/about')
  })

  test('shows one link large: the featured one', async ({ page }) => {
    await page.goto('/links')
    const featured = link(page, 'Book a consultation')
    const ordinary = link(page, 'Read the journal')
    // The scheduled list streams in; DOM presence does not mean its links have been laid out yet.
    await expect(featured).toBeVisible()
    await expect(ordinary).toBeVisible()
    await expect
      .poll(
        async () => {
          const [large, normal] = await Promise.all([
            featured.boundingBox(),
            ordinary.boundingBox(),
          ])
          return (
            large !== null && normal !== null && normal.height > 0 && large.height > normal.height
          )
        },
        { message: 'The featured link should be taller than a visible ordinary link' },
      )
      .toBe(true)
  })

  test('is reached by keyboard: social icons, then the links in order, each with a visible focus', async ({
    page,
  }) => {
    await page.goto('/links')
    const focused: string[] = []
    for (let step = 0; step < 12 && !focused.includes('Gift cards'); step++) {
      await page.keyboard.press('Tab')
      const info = await page.evaluate(() => {
        const element = document.activeElement
        if (!element) return null
        const style = getComputedStyle(element)
        const props = JSON.parse(
          element.closest('[data-track-event]')?.getAttribute('data-track-props') ?? '{}',
        ) as { label?: string }
        return {
          name: element.getAttribute('aria-label') ?? props.label ?? '',
          outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0,
        }
      })
      if (info?.name && info.name !== 'Skip to content') {
        focused.push(info.name)
        expect(info.outline, `focus outline on ${info.name}`).toBe(true)
      }
    }
    expect(focused).toEqual([
      'Instagram',
      'YouTube',
      'Book a consultation',
      'Read the journal',
      'Spring offer',
      'Shop the range',
      'Gift cards',
    ])
  })

  test('opens a link with Enter', async ({ page }) => {
    await page.goto('/links')
    await link(page, 'Read the journal').press('Enter')
    await expect(page).toHaveURL(/\/about$/)
  })
})

test.describe('at 375 px (the Link page is made for a phone first)', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('fits without sideways scrolling, with buttons easy to tap', async ({ page }) => {
    await page.goto('/links')
    await expect(link(page, 'Gift cards')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
    const boxes = await main(page)
      .locator('li[data-track-event] > a')
      .evaluateAll((items) =>
        items.map((item) => {
          const { width, height } = item.getBoundingClientRect()
          return { width, height }
        }),
      )
    expect(boxes).toHaveLength(5)
    for (const { width, height } of boxes) {
      expect(height).toBeGreaterThanOrEqual(44)
      expect(width).toBeGreaterThan(280)
    }
  })

  test('has no accessibility violations', async ({ page }) => {
    await page.goto('/links')
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('link_click analytics', () => {
  /** Stands in for the providers that load once a visitor accepts analytics cookies. */
  async function withProviders(page: Page) {
    await page.addInitScript(() => {
      const events: unknown[][] = []
      ;(window as unknown as { __events: unknown[][] }).__events = events
      Object.assign(window, {
        plausible: (name: string, options: unknown) => events.push(['plausible', name, options]),
        gtag: (...args: unknown[]) => events.push(['gtag', ...args]),
      })
    })
  }

  /** Stops the click leaving the page, after the section's own listener has run. */
  const stayPut = (page: Page) =>
    page.evaluate(() => {
      document.addEventListener('click', (event) => {
        event.preventDefault()
      })
    })

  /** What the providers were sent for a link, not the consent updates the site itself makes. */
  const events = (page: Page) =>
    page.evaluate(() =>
      (window as unknown as { __events: unknown[][] }).__events.filter((event) =>
        event.includes('link_click'),
      ),
    )

  test('sends one event for an outbound click, to the providers that are loaded', async ({
    page,
  }) => {
    await withProviders(page)
    await page.goto('/links')
    await stayPut(page)
    await link(page, 'Book a consultation').click()

    const props = {
      label: 'Book a consultation',
      kind: 'external',
      outbound: true,
      position: 1,
      url: 'https://example.com/book',
      page: '/links',
    }
    expect(await events(page)).toEqual([
      ['plausible', 'link_click', { props }],
      ['gtag', 'event', 'link_click', props],
    ])
  })

  test('says which group and place a link has, and never sends the query string', async ({
    page,
  }) => {
    await withProviders(page)
    await page.goto('/links')
    await stayPut(page)
    await link(page, 'Shop the range').click()
    const [first] = await events(page)
    expect(first?.[2]).toMatchObject({
      props: { label: 'Shop the range', group: 'Shop', position: 4 },
    })
    // The tags on the featured link are not part of what is reported.
    await link(page, 'Book a consultation').click()
    const sent = JSON.stringify(await events(page))
    expect(sent).not.toContain('utm_')
  })

  test('counts a link to a page on this site, marked as not outbound', async ({ page }) => {
    await withProviders(page)
    await page.goto('/links')
    await stayPut(page)
    await link(page, 'Read the journal').click()
    const [first] = await events(page)
    expect(first?.[2]).toMatchObject({ props: { kind: 'page', outbound: false } })
  })

  test('sends nothing, and breaks nothing, when no provider has loaded (no consent)', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/links')
    await stayPut(page)
    await link(page, 'Book a consultation').click()
    expect(errors).toEqual([])
    expect(await page.evaluate(() => 'plausible' in window || 'gtag' in window)).toBe(false)
  })

  test('does not count a click on a social icon or empty space', async ({ page }) => {
    await withProviders(page)
    await page.goto('/links')
    await stayPut(page)
    await page.getByRole('link', { name: 'Instagram' }).click()
    await main(page).click({ position: { x: 2, y: 2 } })
    expect(await events(page)).toEqual([])
  })
})

test.describe('a Link list on an ordinary page', () => {
  test.describe('on a wide screen', () => {
    test.use({ viewport: { width: 1280, height: 900 } })

    test('Cards sit two across', async ({ page }) => {
      await page.goto('/link-list')
      const cards = page.locator('section', {
        has: page.getByRole('heading', { name: 'Where to next' }),
      })
      const tops = await cards
        .locator('li[data-track-event] > a')
        .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)))
      // The featured link spans both columns, above its group's other link. "Shop" is the next group:
      // its two links share a row.
      expect(tops[0]).toBeLessThan(tops[1] ?? 0)
      expect(tops[2]).toBe(tops[3])
    })
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('Cards stack in one column', async ({ page }) => {
      await page.goto('/link-list')
      const cards = page.locator('section', {
        has: page.getByRole('heading', { name: 'Where to next' }),
      })
      const lefts = await cards
        .locator('li[data-track-event] > a')
        .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().left)))
      expect(new Set(lefts).size).toBe(1)
    })
  })

  test('Compact shows pills with the labels only', async ({ page }) => {
    await page.goto('/link-list')
    const compact = page.locator('section', {
      has: page.getByRole('heading', { name: 'Quick links' }),
    })
    await expect(compact.getByRole('link', { name: 'Book a consultation' })).toBeVisible()
    // Descriptions don't fit a pill.
    await expect(compact.getByText('Thirty minutes, free of charge')).toHaveCount(0)
  })

  test('keeps the page’s header and footer, with the section’s title as a heading', async ({
    page,
  }) => {
    await page.goto('/link-list')
    await expect(page.getByRole('heading', { level: 2, name: 'Where to next' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 3, name: 'Shop' }).first()).toBeVisible()
  })

  test('has no accessibility violations', async ({ page }) => {
    await page.goto('/link-list')
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('the six presets in the section gallery', () => {
  for (const preset of PRESETS) {
    test(`${preset} has no accessibility violations and uses Business info’s social icons`, async ({
      page,
    }) => {
      await page.goto('/section-gallery')
      const section = page.locator(`[data-gallery-section="link-list-${preset}"]`)
      await expect(section.getByRole('link', { name: 'Facebook' })).toBeVisible()
      await expect(section.getByRole('link', { name: 'Book a consultation' })).toBeVisible()
      const results = await new AxeBuilder({ page })
        .include(`[data-gallery-section="link-list-${preset}"]`)
        .withTags(WCAG)
        .analyze()
      expect(results.violations).toEqual([])
    })
  }

  test('Image-focused draws a picture on each card; Cards a small one', async ({ page }) => {
    await page.goto('/section-gallery')
    const size = async (id: string) => {
      const section = page.locator(`[data-gallery-section="${id}"]`)
      // Gallery sections far down the page are not laid out until they are near the screen.
      await section.scrollIntoViewIfNeeded()
      return section
        .locator('[data-track-event] a > span')
        .first()
        .evaluate((picture) => picture.getBoundingClientRect().width)
    }
    expect(await size('link-list-image-focused')).toBeGreaterThan(
      (await size('link-list-cards')) * 2,
    )
  })

  test('Editorial ends each row in an arrow', async ({ page }) => {
    await page.goto('/section-gallery')
    const rows = page.locator('[data-gallery-section="link-list-editorial"] [data-track-event] a')
    for (const row of await rows.all()) await expect(row.locator('svg')).toHaveCount(1)
  })
})
