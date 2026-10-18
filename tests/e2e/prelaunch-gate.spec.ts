import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { APP_PORT, APP_PORT_PRELAUNCH } from './constants'
import { waitForHydration } from './hydration'

/**
 * The pre-launch gate (README, "Pre-launch and launch"): a second server from the same build, started
 * with SITE_LAUNCH_OVERRIDE=prelaunch (playwright.config.ts). "/" shows the Link page fixture, the
 * public pages open, and everything else answers 404 with no site header, footer or menu in the HTML.
 * The main server, which is live, must be unaffected.
 */

const PRELAUNCH = `http://localhost:${APP_PORT_PRELAUNCH}`
const LIVE = `http://localhost:${APP_PORT}`
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test.skip(({ isMobile }) => isMobile, 'The gate is the same on every device')

/** The raw HTML, not what is visible: hidden chrome would still be in it. */
const html = async (url: string, init?: { headers?: Record<string, string> }) => {
  const response = await fetch(url, init)
  return { response, body: await response.text() }
}

const CHROME = [
  /<header[\s>]/,
  /<footer[\s>]/,
  /data-site-chrome/,
  /aria-label="Main"/,
  /aria-label="Mobile"/,
]

test.describe('before launch', () => {
  test('"/" shows the temporary page: 200, its canonical is /links, and it is private', async () => {
    const { response, body } = await html(`${PRELAUNCH}/`)
    expect(response.status).toBe(200)
    expect(response.headers.get('x-robots-tag')).toContain('noindex')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(body).toContain('Small-batch ceramics from the Inner West.')
    expect(body).toMatch(/<link rel="canonical" href="[^"]*\/links"/)
    expect(body).not.toContain('prelaunch-view')
    for (const pattern of CHROME) expect(body).not.toMatch(pattern)
  })

  test('"/links" opens too, with the same page', async () => {
    const { response, body } = await html(`${PRELAUNCH}/links`)
    expect(response.status).toBe(200)
    expect(body).toContain('Small-batch ceramics from the Inner West.')
    expect(body).toMatch(/<link rel="canonical" href="[^"]*\/links"/)
  })

  test('keeps a query string on the page it serves', async () => {
    const { response } = await html(`${PRELAUNCH}/?utm_source=instagram`)
    expect(response.status).toBe(200)
  })

  for (const path of [
    '/about',
    '/blog',
    '/blog/hello-world',
    '/search',
    '/team/ann-lee',
    '/links/more',
    '/Links',
    '/home',
    '/ab/anything/about',
  ]) {
    test(`${path} answers 404, noindex, with no header, footer or menu`, async () => {
      const { response, body } = await html(`${PRELAUNCH}${path}`)
      expect(response.status).toBe(404)
      expect(response.headers.get('x-robots-tag')).toContain('noindex')
      expect(response.headers.get('cache-control')).toBe('private, no-store')
      expect(body).toContain('This page isn’t open yet')
      for (const pattern of CHROME) expect(body).not.toMatch(pattern)
      // Nothing from the real page leaks into the answer.
      expect(body).not.toContain('Small-batch ceramics')
    })
  }

  test('the bare view cannot be opened by its own address', async () => {
    for (const path of ['/prelaunch-view/links', '/prelaunch-view', '/prelaunch-view/about']) {
      const { response } = await html(`${PRELAUNCH}${path}`)
      expect(response.status, path).toBe(404)
    }
  })

  test('a made-up draft-mode cookie opens nothing', async () => {
    const { response } = await html(`${PRELAUNCH}/about`, {
      headers: { cookie: '__prerender_bypass=anything' },
    })
    expect(response.status).toBe(404)
  })

  test('a client navigation (RSC request) to a gated page is gated too', async () => {
    const response = await fetch(`${PRELAUNCH}/about?_rsc=abc`, {
      headers: { RSC: '1', 'Next-Router-State-Tree': '%5B%22%22%5D' },
    })
    expect(response.status).toBe(404)
  })

  test('"/" passes axe, has one h1, and no site chrome in the page', async ({ page }) => {
    await page.goto(`${PRELAUNCH}/`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByRole('banner')).toHaveCount(0)
    await expect(page.getByRole('contentinfo')).toHaveCount(0)
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })

  test('the 404 page passes axe', async ({ page }) => {
    await page.goto(`${PRELAUNCH}/about`)
    await expect(
      page.getByRole('heading', { level: 1, name: 'This page isn’t open yet' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute(
      'href',
      '/',
    )
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })

  test('the newsletter signup on "/" submits (the server action survives the rewrite)', async ({
    page,
  }) => {
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': '10.77.0.1' })
    await page.goto(`${PRELAUNCH}/`)
    await waitForHydration(page.getByLabel('Email address'))
    await page.getByLabel('Email address').fill('ann@example.com')
    await page.getByRole('button', { name: 'Subscribe' }).click()
    await expect(
      page.getByRole('status').filter({ hasText: 'Thanks! Check your inbox to confirm.' }),
    ).toBeVisible()
    expect(page.url()).toBe(`${PRELAUNCH}/`)
  })

  test('the signup works without JavaScript too (a plain POST to "/")', async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      extraHTTPHeaders: { 'x-forwarded-for': '10.77.0.2' },
    })
    const page = await context.newPage()
    await page.goto(`${PRELAUNCH}/`)
    await page.getByLabel('Email address').fill('bob@example.com')
    await page.getByRole('button', { name: 'Subscribe' }).click()
    await expect(
      page.getByRole('status').filter({ hasText: 'Thanks! Check your inbox to confirm.' }),
    ).toBeVisible()
    await context.close()
  })
})

test.describe('the live server', () => {
  test('is unaffected: "/" is the real home page and /about opens', async () => {
    const home = await html(`${LIVE}/`)
    expect(home.response.status).toBe(200)
    expect(home.response.headers.get('x-robots-tag')).toBeNull()
    expect(home.body).toMatch(/<header[\s>]/)
    const about = await html(`${LIVE}/about`)
    expect(about.response.status).toBe(200)
    // Nobody can open the bare view by its address, live or not, without it being the page's duplicate.
    const view = await html(`${LIVE}/prelaunch-view/about`)
    expect(view.response.status).toBe(404)
  })
})
