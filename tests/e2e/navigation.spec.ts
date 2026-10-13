import { expect, test, type APIResponse } from '@playwright/test'
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

import { REVALIDATE_SECRET, SITE_URL } from './constants'

test.describe('mobile menu', () => {
  test.skip(({ isMobile }) => !isMobile, 'Mobile only')

  test('closes after following a link', async ({ page }) => {
    await page.goto('/')
    const menu = page.locator('header details')
    await page.locator('header summary').click()
    await expect(menu).toHaveAttribute('open', '')
    await page
      .getByRole('navigation', { name: 'Mobile' })
      .getByRole('link', { name: 'About' })
      .click()
    await expect(page).toHaveURL('/about')
    await expect(menu).not.toHaveAttribute('open')
  })

  test('closes on Escape and returns focus to the menu button', async ({ page }) => {
    await page.goto('/')
    const menu = page.locator('header details')
    await page.locator('header summary').click()
    await expect(menu).toHaveAttribute('open', '')
    await page.keyboard.press('Escape')
    await expect(menu).not.toHaveAttribute('open')
    await expect(page.locator('header summary')).toBeFocused()
  })
})

test('browsers follow Studio redirects', async ({ page }) => {
  // Next.js repeats an identical Location header on redirects from cached pages
  // (vercel/next.js#82117). Real browsers must still land on the destination.
  await page.goto('/About-Us.html')
  await expect(page).toHaveURL('/about')
  await expect(page.locator('h1')).toHaveText('About')
})

test.describe('HTTP behavior', () => {
  // Server responses don't depend on the browser; run them once.
  test.skip(({ isMobile }) => isMobile, 'Desktop only')

  test('redirects from Studio, ignoring case and trailing slashes', async ({ request }) => {
    // Next.js repeats an identical Location header on cached redirects (vercel/next.js#82117);
    // browsers accept identical copies, so the check is that every value agrees.
    const locations = (response: APIResponse) =>
      new Set(
        response
          .headersArray()
          .filter(({ name }) => name.toLowerCase() === 'location')
          .map(({ value }) => value),
      )

    const permanent = await request.get('/About-Us.html', { maxRedirects: 0 })
    expect(permanent.status()).toBe(308)
    expect(locations(permanent)).toEqual(new Set(['/about']))

    const temporary = await request.get('/promo', { maxRedirects: 0 })
    expect(temporary.status()).toBe(307)
    expect(locations(temporary)).toEqual(new Set(['https://example.com/sale']))

    const followed = await request.get('/ABOUT-US.HTML')
    expect(followed.url()).toMatch(/\/about$/)
  })

  test('sends security headers, with framing limits on the site but not /studio', async ({
    request,
  }) => {
    const site = (await request.get('/')).headers()
    expect(site['strict-transport-security']).toContain('max-age=')
    expect(site['x-content-type-options']).toBe('nosniff')
    expect(site['x-frame-options']).toBe('SAMEORIGIN')
    expect(site['content-security-policy']).toBe("frame-ancestors 'self'")
    expect(site['x-powered-by']).toBeUndefined()

    const studio = (await request.get('/studio')).headers()
    expect(studio['x-frame-options']).toBeUndefined()
    expect(studio['strict-transport-security']).toContain('max-age=')
  })

  test('robots.txt and the sitemap use the production URL', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text()
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`)
    expect(robots).toContain('Disallow: /studio')

    const sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).toContain(`<loc>${SITE_URL}/</loc>`)
    expect(sitemap).toContain(`<loc>${SITE_URL}/about</loc>`)
  })

  test('the revalidate webhook rejects bad signatures and accepts Sanity-signed ones', async ({
    request,
  }) => {
    test.setTimeout(30_000) // The route waits 3 s for the CDN before expiring anything.
    const body = JSON.stringify({ _type: 'page', _id: 'page-home' })

    const forged = await request.post('/api/revalidate', {
      data: body,
      headers: {
        'content-type': 'application/json',
        [SIGNATURE_HEADER_NAME]: await encodeSignatureHeader(body, Date.now(), 'wrong-secret'),
      },
    })
    expect(forged.status()).toBe(401)

    const signed = await request.post('/api/revalidate', {
      data: body,
      headers: {
        'content-type': 'application/json',
        [SIGNATURE_HEADER_NAME]: await encodeSignatureHeader(body, Date.now(), REVALIDATE_SECRET),
      },
    })
    expect(signed.status()).toBe(200)
    expect(await signed.json()).toEqual({ revalidated: true, tag: 'page' })
  })

  test('a redirect webhook only expires the cache when Edge Config sync is not configured', async ({
    request,
  }) => {
    test.setTimeout(30_000)
    const body = JSON.stringify({ _type: 'redirect', _id: 'redirect-promo' })
    const response = await request.post('/api/revalidate', {
      data: body,
      headers: {
        'content-type': 'application/json',
        [SIGNATURE_HEADER_NAME]: await encodeSignatureHeader(body, Date.now(), REVALIDATE_SECRET),
      },
    })
    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({ revalidated: true, tag: 'redirect' })
  })
})
