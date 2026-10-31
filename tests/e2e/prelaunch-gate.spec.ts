import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'

import {
  SITE_URL,
  APP_PORT,
  APP_PORT_PRELAUNCH,
  DRAFT_MODE_SECRET,
  PRELAUNCH_PREVIEW_TOKEN,
} from './constants'
import { test } from './fixtures/test'
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

// Not a bare `<header>`: sections use one for their own heading (the newsletter signup does). The
// site's header and footer always sit inside [data-site-chrome].
const CHROME = [/<footer[\s>]/, /data-site-chrome/, /aria-label="Main"/, /aria-label="Mobile"/]

test.describe('before launch', () => {
  test('"/" shows the temporary page: 200, its canonical is /links, and it is private', async () => {
    const { response, body } = await html(`${PRELAUNCH}/`)
    expect(response.status).toBe(200)
    expect(response.headers.get('x-robots-tag')).toContain('noindex')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(body).toContain('Small-batch ceramics from the Inner West.')
    expect(body).toMatch(/<link rel="canonical" href="[^"]*\/links"/)
    // Next's router data names the rewritten route (as it names /ab/… for A/B tests); no link,
    // canonical or form may send anyone to that address.
    expect(body).not.toMatch(/(?:href|content|action)="[^"]*prelaunch-view/)
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
    '/services/emergency-plumbing',
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
    // Next answers an RSC request for a not-found page with 200 and the 404 inside the payload (and
    // first 307s a made-up `_rsc` cache key to its own), so check what comes back, not the status.
    const response = await fetch(`${PRELAUNCH}/about?_rsc=abc`, { headers: { RSC: '1' } })
    const body = await response.text()
    expect(response.headers.get('content-type')).toContain('text/x-component')
    expect(body).toContain('This page isn’t open yet')
    expect(body).not.toContain('External site')
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

  // Not the gate: the live Link page answers the same plain POST with only Next's resume data (no HTML)
  // because the page has request-time parts (dated links, the launch date). /contact, which has none,
  // works without JavaScript (forms.spec.ts). Turn this back on when that is fixed.
  test.fixme('the signup works without JavaScript too (a plain POST to "/")', async ({
    browser,
  }) => {
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
    expect(pass).toMatch(/SameSite=Lax/i)
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
      // "/<tab>/evil.example" is "//evil.example" to a browser, so it is refused like the rest.
      expect(location.pathname, redirect).toBe('/')
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

test.describe('machine-readable files before launch', () => {
  const get = (path: string, headers: Record<string, string> = {}) =>
    html(`${PRELAUNCH}${path}`, { headers })

  test('/sitemap.xml lists only /links, and nothing else', async () => {
    const { response, body } = await get('/sitemap.xml')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('xml')
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
    expect(locs).toEqual([`${SITE_URL}/links`])
  })

  test('/sitemap/0.xml is the same file; the other numbers answer 404', async () => {
    expect((await get('/sitemap/0.xml')).body).toContain(`${SITE_URL}/links`)
    expect((await get('/sitemap/1.xml')).response.status).toBe(404)
  })

  test('/robots.txt keeps the rules and points at /sitemap.xml', async () => {
    const { response, body } = await get('/robots.txt')
    expect(response.status).toBe(200)
    expect(body).toContain('Disallow: /studio')
    expect(body).toContain('Disallow: /api/')
    expect(body).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`)
    expect(body).not.toContain('/sitemap/0.xml')
  })

  test('/llms.txt lists only the public pages', async () => {
    const { response, body } = await get('/llms.txt')
    expect(response.status).toBe(200)
    expect(body).toContain(`(${SITE_URL}/links)`)
    expect(body).not.toContain('/about')
    expect(body).not.toContain('/blog')
  })

  test('the feed, search and an event calendar file answer 404', async () => {
    for (const path of [
      '/feed.xml',
      '/api/search?q=a',
      '/events/pottery-workshop.ics',
      '/events/feed.ics',
      '/api/events/feed',
      '/api/events/pottery-workshop/ics',
    ]) {
      expect((await get(path)).response.status, path).toBe(404)
    }
  })

  test('share images: only for a public page', async () => {
    expect((await get('/api/og/about')).response.status).toBe(404)
    expect((await get('/api/og/events/pottery-workshop')).response.status).toBe(404)
    expect((await get('/api/og')).response.status).toBe(404)
    const links = await get('/api/og/links')
    expect(links.response.status).toBe(200)
    expect(links.response.headers.get('content-type')).toContain('image')
  })

  test('no unfinished page is named: structured data on "/" is the site-level business only', async () => {
    const { body } = await get('/')
    const blocks = [
      ...body.matchAll(/<script type="application\/ld\+json"[^>]*>([^<]+)<\/script>/g),
    ]
    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.[1]).not.toContain('BreadcrumbList')
  })

  test('a preview pass holder gets the normal files', async ({ request }) => {
    const raw = await request.get(
      `${PRELAUNCH}/api/preview-access?token=${PRELAUNCH_PREVIEW_TOKEN}`,
      { maxRedirects: 0, headers: { 'x-forwarded-for': '10.88.0.20' } },
    )
    const pass = raw.headersArray().find(({ name }) => name.toLowerCase() === 'set-cookie')?.value
    const cookie = (pass ?? '').split(';')[0] ?? ''
    expect(cookie).toMatch(/^site_preview=/)

    const sitemap = await get('/sitemap.xml', { cookie })
    expect(sitemap.response.status).toBe(200)
    expect(sitemap.body).toContain(`${SITE_URL}/about`)
    expect((await get('/feed.xml', { cookie })).response.status).toBe(200)
    expect((await get('/api/og/about', { cookie })).response.status).toBe(200)
  })
})

test.describe('the live server', () => {
  test('serves the normal machine-readable files', async () => {
    const sitemap = await html(`${LIVE}/sitemap.xml`)
    expect(sitemap.response.status).toBe(200)
    expect(sitemap.body).toContain(`${SITE_URL}/about`)
    expect((await html(`${LIVE}/feed.xml`)).response.status).toBe(200)
    expect((await html(`${LIVE}/robots.txt`)).body).toContain('Sitemap:')
    expect((await html(`${LIVE}/api/og/about`)).response.status).toBe(200)
  })

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
