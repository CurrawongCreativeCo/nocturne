import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * Typed link actions (README, "Link actions"): a link can jump to a section of the page, open a
 * panel or open booking. Section links scroll and respect reduced motion; panel and booking
 * triggers are real buttons that still reach their fallback URL without JavaScript.
 */

const PAGE = '/link-actions'

test.describe('section links', () => {
  test.use({ reducedMotion: 'reduce' })

  test('scroll to the section and clear the sticky header', async ({ page }) => {
    await page.goto(PAGE)
    const link = page.getByRole('link', { name: 'Jump to details' })
    await expect(link).toHaveAttribute('href', '#details')
    await link.click()
    await expect(page).toHaveURL(/#details$/)

    const target = page.locator('#details')
    await expect(target).toBeInViewport()
    // scroll-margin leaves room for the sticky header, so the section isn't hidden under it.
    const top = await target.evaluate((el) => el.getBoundingClientRect().top)
    const header = await page
      .locator('header')
      .first()
      .evaluate((el) => el.getBoundingClientRect().bottom)
    expect(top).toBeGreaterThanOrEqual(header - 1)
  })
})

test.describe('smooth scrolling', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('glides to a section, and only for section links', async ({ page }) => {
    await page.goto(PAGE)
    const positions = await page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const seen: number[] = []
          const tick = () => {
            seen.push(Math.round(window.scrollY))
            if (seen.length < 40) requestAnimationFrame(tick)
            else resolve(seen)
          }
          document.querySelector<HTMLAnchorElement>('a[href="#details"]')?.click()
          tick()
        }),
    )
    // Several in-between positions, not one jump.
    expect(new Set(positions.filter((y) => y > 0)).size).toBeGreaterThan(3)

    await page.goto(PAGE)
    await page.evaluate(() => {
      window.scrollTo(0, 500)
    })
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(500)
  })
})

test.describe('panel and booking buttons', () => {
  test('are buttons that say they open a dialog', async ({ page }) => {
    await page.goto(PAGE)
    const panel = page.getByRole('button', { name: /Open enquiry/ })
    await expect(panel).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(panel).toHaveAccessibleName('Open enquiry (opens Enquire now)')
    await expect(page.getByRole('button', { name: 'Book a visit' })).toHaveAttribute(
      'aria-haspopup',
      'dialog',
    )
  })

  test('a panel button opens its panel instead of following its fallback link', async ({
    page,
  }) => {
    await page.goto(PAGE)
    await page.getByRole('button', { name: /Open enquiry/ }).click()
    await expect(page.getByRole('dialog', { name: 'Enquire now' })).toBeVisible()
    await expect(page).toHaveURL(/\/link-actions#panel-enquire$/)
  })

  test('a booking button nothing claims goes to its fallback URL', async ({ page }) => {
    await page.goto(PAGE)
    await page.getByRole('button', { name: 'Book a visit' }).click()
    await expect(page).toHaveURL(/\/about\??$/)
  })

  test('stays out of the way when an overlay claims the click', async ({ page }) => {
    await page.goto(PAGE)
    // What a booking overlay will do: one delegated listener on the trigger attributes.
    await page.evaluate(() => {
      document.addEventListener('click', (event) => {
        const trigger = (event.target as Element).closest<HTMLElement>('[data-overlay-kind]')
        if (trigger?.dataset.overlayKind !== 'booking') return
        event.preventDefault()
        document.body.dataset.opened = 'booking'
      })
    })
    await page.getByRole('button', { name: 'Book a visit' }).click()
    await expect(page).toHaveURL(/\/link-actions$/)
    await expect(page.locator('body')).toHaveAttribute('data-opened', 'booking')
  })

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false })

    test('the buttons still go to their URL', async ({ page }) => {
      await page.goto(PAGE)
      await page.getByRole('button', { name: 'Book a visit' }).click()
      await expect(page).toHaveURL(/\/about\??$/)
    })
  })
})

test('has no accessibility violations', async ({ page }) => {
  await page.goto(PAGE)
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations).toEqual([])
})
