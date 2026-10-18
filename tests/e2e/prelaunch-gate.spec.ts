import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  APP_PORT,
  APP_PORT_PRELAUNCH,
  DRAFT_MODE_SECRET,
  PRELAUNCH_PREVIEW_TOKEN,
} from './constants'
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

test.describe('the preview pass', () => {
  const enable = `${PRELAUNCH}/api/draft-mode/enable?sanity-preview-secret=${DRAFT_MODE_SECRET}&sanity-preview-pathname=/about`
  const link = (token?: string) =>
    `${PRELAUNCH}/api/preview-access${token === undefined ? '' : `?token=${token}`}`
  /** Each test counts as its own visitor for the link's rate limit. */
  const asVisitor = (n: number) => ({ 'x-forwarded-for': `10.88.0.${String(n)}` })

  test('draft-mode enable sets the draft cookie and the signed pass, and /about then renders', async ({
    page,
    request,
  }) => {
    const raw = await request.get(enable, { maxRedirects: 0 })
    expect(raw.status()).toBeLessThan(400)
    const cookies = raw.headersArray().filter(({ name }) => name.toLowerCase() === 'set-cookie')
    expect(cookies.some(({ value }) => value.startsWith('__prerender_bypass='))).toBe(true)
    const pass = cookies.find(({ value }) => value.startsWith('site_preview='))?.value ?? ''
    expect(pass).toMatch(/^site_preview=v1\.\d+\.[0-9a-f]{64}; /)
    expect(pass).toContain('HttpOnly')
    expect(pass).toContain('SameSite=Lax')
    expect(pass).toContain('Max-Age=28800')

    await page.goto(enable)
    await expect(page).toHaveURL(`${PRELAUNCH}/about`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const stored = (await page.context().cookies(PRELAUNCH)).find(
      ({ name }) => name === 'site_preview',
    )
    expect(stored).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' })
  })

  test('a pass response is private and not indexed', async ({ page }) => {
    await page.goto(enable)
    const response = await page.request.get(`${PRELAUNCH}/about`)
    expect(response.status()).toBe(200)
    expect(response.headers()['x-robots-tag']).toContain('noindex')
    // What Next.js keeps of the proxy's header on a prerendered page; on Vercel the proxy runs before the CDN cache.
    expect(response.headers()['cache-control']).toContain('no-store')
  })

  test('a forged draft-mode cookie, or a forged or tampered pass, still gets 404', async ({
    request,
  }) => {
    const forged = [
      '__prerender_bypass=anything',
      'site_preview=true',
      `site_preview=v1.9999999999999.${'a'.repeat(64)}`,
    ]
    for (const cookie of forged) {
      const response = await request.get(`${PRELAUNCH}/about`, { headers: { cookie } })
      expect(response.status(), cookie).toBe(404)
    }
  })

  test('the preview link with the right token opens the site; a wrong or missing token gets 404', async ({
    page,
    request,
  }) => {
    for (const [n, url] of [
      [1, link('wrong-token-wrong-token')],
      [2, link()],
      [3, link('')],
    ] as const) {
      const response = await request.get(url, { headers: asVisitor(n), maxRedirects: 0 })
      expect(response.status(), url).toBe(404)
      expect(response.headers()['set-cookie']).toBeUndefined()
    }

    await page.context().setExtraHTTPHeaders(asVisitor(4))
    await page.goto(link(PRELAUNCH_PREVIEW_TOKEN))
    await expect(page).toHaveURL(`${PRELAUNCH}/`)
    const response = await page.goto(`${PRELAUNCH}/about`)
    expect(response?.status()).toBe(200)
  })

  test('exit puts the gate back', async ({ page }) => {
    await page.context().setExtraHTTPHeaders(asVisitor(5))
    await page.goto(link(PRELAUNCH_PREVIEW_TOKEN))
    expect((await page.goto(`${PRELAUNCH}/about`))?.status()).toBe(200)
    await page.goto(`${PRELAUNCH}/api/preview-access/exit`)
    await expect(page).toHaveURL(`${PRELAUNCH}/`)
    expect((await page.goto(`${PRELAUNCH}/about`))?.status()).toBe(404)
  })

  test('draft-mode disable cannot send anyone off the site, and clears the pass', async ({
    page,
    request,
  }) => {
    for (const redirect of [
      '/%5Cevil.example',
      '//evil.example',
      'https://evil.example',
      '/%09/evil.example',
    ]) {
      const response = await request.get(
        `${PRELAUNCH}/api/draft-mode/disable?redirect=${redirect}`,
        {
          maxRedirects: 0,
        },
      )
      const location = new URL(response.headers().location ?? '')
      expect(location.origin, redirect).toBe(PRELAUNCH)
      expect(location.pathname, redirect).toBe(
        redirect === '/%09/evil.example' ? '/%09/evil.example' : '/',
      )
    }

    await page.goto(enable)
    expect((await page.goto(`${PRELAUNCH}/about`))?.status()).toBe(200)
    await page.goto(`${PRELAUNCH}/api/draft-mode/disable?redirect=/%5Cevil.example`)
    await expect(page).toHaveURL(`${PRELAUNCH}/`)
    expect((await page.goto(`${PRELAUNCH}/about`))?.status()).toBe(404)
  })

  test('the live server ignores the pass and has no preview link', async ({ request }) => {
    expect(
      (await request.get(`${LIVE}/api/preview-access?token=${PRELAUNCH_PREVIEW_TOKEN}`)).status(),
    ).toBe(404)
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
