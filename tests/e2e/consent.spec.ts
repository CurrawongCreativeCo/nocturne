import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

// A first-time visitor: nothing stored.
test.use({ storageState: { cookies: [], origins: [] } })

/** Hosts of the analytics providers set up in tests/e2e/constants.ts. */
const PROVIDERS = {
  plausible: 'plausible.io',
  posthog: 'us-assets.i.posthog.com',
  google: 'www.googletagmanager.com',
}

/**
 * Stubs every provider (the suite runs offline, and no real analytics service may be called) and
 * records which hosts the page asked for.
 */
async function watchProviders(page: Page) {
  const requested: string[] = []
  await page.route(
    (url) => Object.values(PROVIDERS).includes(url.hostname),
    (route) => {
      requested.push(new URL(route.request().url()).hostname)
      return route.fulfill({ contentType: 'text/javascript', body: '' })
    },
  )
  return requested
}

const banner = (page: Page) => page.getByRole('region', { name: 'Your privacy choices' })

for (const decided of [false, true]) {
  test(`before hydration, the banner is ${decided ? 'hidden for a saved choice' : 'visible on a first visit'}`, async ({
    page,
  }) => {
    await page.route(/\/_next\/static\/chunks\/.*\.js(?:\?|$)/, (route) => route.abort())
    await page.addInitScript(() => {
      // The reveal must wait for the controls' HTML, preventing a partially parsed banner painting.
      const observer = new MutationObserver((records) => {
        for (const { target } of records) {
          if (!(target instanceof HTMLElement) || target.hidden) continue
          if (!target.matches('section[aria-labelledby="consent-title"]')) continue
          target.dataset.controlsAtReveal = String(target.querySelectorAll('button').length)
          observer.disconnect()
        }
      })
      observer.observe(document, { subtree: true, attributes: true, attributeFilter: ['hidden'] })
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          observer.disconnect()
        },
        { once: true },
      )
    })
    if (decided) {
      await page.addInitScript(() => {
        localStorage.setItem(
          'consent',
          JSON.stringify({
            version: 1,
            necessary: true,
            analytics: false,
            marketing: false,
            savedAt: '2026-10-22T00:00:00Z',
          }),
        )
      })
    }
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const region = page.locator('section[aria-labelledby="consent-title"]')
    await expect(region).toHaveCount(1)
    if (decided) await expect(region).toBeHidden()
    else {
      await expect(region).toBeVisible()
      await expect(region).toHaveAttribute('data-controls-at-reveal', '3')
    }
    await expect(
      page.locator('script[src*="plausible"], script[src*="googletagmanager"]'),
    ).toHaveCount(0)
  })
}

test('shows the editable banner on a first visit, with focus inside it and no layout shift', async ({
  page,
}) => {
  await page.goto('/')
  await expect(banner(page)).toBeVisible()
  await expect(banner(page)).toBeFocused()
  await expect(banner(page)).toContainText('Test Co uses analytics cookies only if you allow them.')
  await expect(banner(page).getByRole('link', { name: 'Read the privacy policy' })).toHaveAttribute(
    'href',
    '/about',
  )
  // Not a modal: no dialog role, and the page behind stays reachable.
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('main')).toBeVisible()
  expect(await banner(page).evaluate((el) => getComputedStyle(el).position)).toBe('fixed')
})

test('Accept all and Reject all look the same', async ({ page }) => {
  await page.goto('/')
  const style = (name: string) =>
    banner(page)
      .getByRole('button', { name })
      .evaluate((el) => {
        const { backgroundColor, color, fontSize, fontWeight, width, height, borderWidth } =
          getComputedStyle(el)
        return {
          backgroundColor,
          color,
          fontSize,
          fontWeight,
          borderWidth,
          size: `${width}x${height}`,
        }
      })
  const accept = await style('Accept all')
  const reject = await style('Reject all')
  expect({ ...accept, size: '' }).toEqual({ ...reject, size: '' })
  expect(Math.abs(parseFloat(accept.size) - parseFloat(reject.size))).toBeLessThan(40)
})

test('no analytics request before consent', async ({ page }) => {
  const requested = await watchProviders(page)
  await page.goto('/')
  await page.getByRole('link', { name: 'About' }).first().click()
  await expect(page).toHaveURL('/about')
  await page.waitForLoadState('networkidle')
  expect(requested).toEqual([])
  await expect(
    page.locator('script[src*="plausible"], script[src*="googletagmanager"]'),
  ).toHaveCount(0)
})

test('Accept all loads each provider, with Google consent defaults denied first', async ({
  page,
}) => {
  const requested = await watchProviders(page)
  await page.goto('/')
  await banner(page).getByRole('button', { name: 'Accept all' }).click()
  await expect(banner(page)).toBeHidden()

  await expect.poll(() => new Set(requested).size).toBe(3)
  expect(new Set(requested)).toEqual(new Set(Object.values(PROVIDERS)))

  const dataLayer = await page.evaluate(() =>
    (window as unknown as { dataLayer: ArrayLike<unknown>[] }).dataLayer.map((entry) =>
      Array.from(entry),
    ),
  )
  expect(dataLayer[0]).toEqual([
    'consent',
    'default',
    {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    },
  ])
  expect(dataLayer[1]?.slice(0, 2)).toEqual(['consent', 'update'])
})

test('Reject all keeps analytics off and the choice persists', async ({ page }) => {
  const requested = await watchProviders(page)
  await page.goto('/')
  await banner(page).getByRole('button', { name: 'Reject all' }).click()
  await expect(banner(page)).toBeHidden()

  await page.reload()
  await page.getByRole('link', { name: 'About' }).first().click()
  await expect(page).toHaveURL('/about')
  await page.waitForLoadState('networkidle')
  await expect(banner(page)).toBeHidden()
  expect(requested).toEqual([])

  const stored = await page.evaluate(() => localStorage.getItem('consent'))
  expect(JSON.parse(stored ?? 'null')).toMatchObject({ analytics: false, marketing: false })
})

test('Choose saves an individual selection', async ({ page }) => {
  const requested = await watchProviders(page)
  await page.goto('/')
  const choose = banner(page).getByRole('button', { name: 'Choose' })
  await choose.click()
  await expect(choose).toHaveAttribute('aria-expanded', 'true')
  await expect(banner(page).getByRole('checkbox', { name: 'Necessary' })).toBeDisabled()
  await banner(page).getByRole('checkbox', { name: 'Analytics' }).check()
  await banner(page).getByRole('button', { name: 'Save choices' }).click()
  await expect(banner(page)).toBeHidden()
  await expect.poll(() => requested.length).toBeGreaterThan(0)

  const stored = await page.evaluate(() => localStorage.getItem('consent'))
  expect(JSON.parse(stored ?? 'null')).toMatchObject({ analytics: true, marketing: false })
})

test('the footer link reopens the banner; withdrawing stops analytics after a reload', async ({
  page,
}) => {
  const requested = await watchProviders(page)
  await page.goto('/')
  await banner(page).getByRole('button', { name: 'Accept all' }).click()
  await expect.poll(() => requested.length).toBeGreaterThan(0)

  const settings = page.getByRole('button', { name: 'Cookie settings' })
  await settings.click()
  await expect(banner(page)).toBeFocused()
  await expect(banner(page).getByRole('checkbox', { name: 'Analytics' })).toBeChecked()

  // Escape closes it without changing the choice and hands focus back.
  await page.keyboard.press('Escape')
  await expect(banner(page)).toBeHidden()
  await expect(settings).toBeFocused()

  await settings.click()
  requested.length = 0
  await banner(page).getByRole('button', { name: 'Reject all' }).click()
  await page.waitForLoadState('load')
  await expect(banner(page)).toBeHidden()
  const stored = await page.evaluate(() => localStorage.getItem('consent'))
  expect(JSON.parse(stored ?? 'null')).toMatchObject({ analytics: false })
  await page.waitForLoadState('networkidle')
  expect(requested).toEqual([])
})

test('the banner works from the keyboard', async ({ page }) => {
  await page.goto('/')
  await expect(banner(page)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(banner(page).getByRole('link', { name: 'Read the privacy policy' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(banner(page).getByRole('button', { name: 'Accept all' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(banner(page).getByRole('button', { name: 'Reject all' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(banner(page)).toBeHidden()
  // Tab carries on from where the banner was: the skip link is next.
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
})

test('the banner does not move the page', async ({ page }) => {
  await page.goto('/')
  const heading = page.locator('h1')
  await expect(banner(page)).toBeVisible()
  const before = await heading.boundingBox()
  await banner(page).getByRole('button', { name: 'Choose' }).click()
  await expect(banner(page).getByRole('checkbox', { name: 'Analytics' })).toBeVisible()
  expect(await heading.boundingBox()).toEqual(before)
})

for (const open of [false, true]) {
  test(`no WCAG 2.2 AA violations with the banner open${open ? ' and Choose expanded' : ''}`, async ({
    page,
  }) => {
    await page.goto('/')
    await expect(banner(page)).toBeVisible()
    if (open) await banner(page).getByRole('button', { name: 'Choose' }).click()
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(
      violations.map(
        ({ id, nodes }) => `${id}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`,
      ),
    ).toEqual([])
  })
}
