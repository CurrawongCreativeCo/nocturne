import { expect, type APIRequestContext, type Page, type TestInfo } from '@playwright/test'

import { test } from './fixtures/test'
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

import { FAKE_SANITY_PORT, REVALIDATE_SECRET } from './constants'

// The tests switch the Site settings the fake Content Lake serves, so they run in order, once.
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only')
const isMobile = (testInfo: TestInfo) => Boolean(testInfo.project.use.isMobile)

async function useSettings(request: APIRequestContext, variant: 'default' | 'customBrowserIcon') {
  const control = await request.post(
    `http://localhost:${FAKE_SANITY_PORT}/__fixture/settings/${variant}`,
  )
  expect(control.status()).toBe(204)

  const body = JSON.stringify({ _type: 'siteIdentity', _id: 'siteIdentity' })
  const webhook = await request.post('/api/revalidate', {
    data: body,
    headers: {
      'content-type': 'application/json',
      [SIGNATURE_HEADER_NAME]: await encodeSignatureHeader(body, Date.now(), REVALIDATE_SECRET),
    },
  })
  expect(webhook.status()).toBe(200)
}

interface IconLink {
  rel: string
  href: string
  sizes: string | null
  type: string | null
}

/** Every icon link in <head>, in document order. */
async function iconLinks(page: Page): Promise<IconLink[]> {
  return page
    .locator(
      'head link[rel~="icon"], head link[rel~="apple-touch-icon"], head link[rel~="shortcut"]',
    )
    .evaluateAll((links) =>
      links.map((link) => ({
        rel: link.getAttribute('rel') ?? '',
        href: link.getAttribute('href') ?? '',
        sizes: link.getAttribute('sizes'),
        type: link.getAttribute('type'),
      })),
    )
}

test.afterAll(async ({ request }, testInfo) => {
  if (isMobile(testInfo)) return
  test.setTimeout(30_000)
  await useSettings(request, 'default')
})

test.describe('default icon', () => {
  test('links the Currawong icon files, once each', async ({ page }) => {
    await page.goto('/')
    const links = await iconLinks(page)
    const icons = links.filter((link) => link.rel === 'icon')
    expect(
      icons.map((link) => [new URL(link.href, 'http://x').pathname, link.sizes, link.type]),
    ).toEqual([
      ['/icons/icon-32.png', '32x32', 'image/png'],
      ['/icons/icon-192.png', '192x192', 'image/png'],
      ['/icon.png', '512x512', 'image/png'],
    ])
    const apple = links.filter((link) => link.rel === 'apple-touch-icon')
    expect(apple).toHaveLength(1)
    expect(new URL(apple[0]?.href ?? '', 'http://x').pathname).toBe('/apple-icon.png')
    expect(apple[0]?.sizes).toBe('180x180')
    expect(links.some((link) => link.href.includes('cdn.sanity.io'))).toBe(false)
  })

  test('serves the files as PNGs, and no longer the purple placeholder', async ({ request }) => {
    for (const path of [
      '/icons/icon-32.png',
      '/icons/icon-192.png',
      '/icon.png',
      '/apple-icon.png',
    ]) {
      const response = await request.get(path)
      expect(response.status()).toBe(200)
      expect(response.headers()['content-type']).toBe('image/png')
      if (path === '/icons/icon-32.png')
        expect((await response.body()).byteLength).toBeLessThan(5000)
    }
    expect((await request.get('/icon.svg')).status()).toBe(404)
  })
})

test.describe('custom icon from Site settings', () => {
  test.beforeAll(async ({ request }, testInfo) => {
    if (isMobile(testInfo)) return
    test.setTimeout(30_000)
    await useSettings(request, 'customBrowserIcon')
  })

  test('links Sanity CDN PNGs at 32, 192, 512 and 180 px, with no duplicates', async ({ page }) => {
    // The first request after a revalidation may still get the old copy.
    await expect
      .poll(async () => {
        await page.goto('/')
        return (await iconLinks(page)).some((link) => link.href.includes('cdn.sanity.io'))
      })
      .toBe(true)

    const links = await iconLinks(page)
    expect(links.map((link) => `${link.rel} ${link.sizes}`)).toEqual([
      'icon 32x32',
      'icon 192x192',
      'icon 512x512',
      'apple-touch-icon 180x180',
    ])
    expect(new Set(links.map((link) => link.href)).size).toBe(links.length)
    for (const link of links) {
      const url = new URL(link.href)
      expect(url.hostname).toBe('cdn.sanity.io')
      expect(link.type).toBe('image/png')
      expect(url.searchParams.get('fm')).toBe('png')
      expect(url.searchParams.get('bg')).toMatch(/^[0-9a-f]{6}$/i)
      // The finished size is w plus the padding on both sides.
      const size = Number(link.sizes?.split('x')[0])
      expect(Number(url.searchParams.get('w')) + Number(url.searchParams.get('pad')) * 2).toBe(size)
    }
    // The file-based default is replaced, not added to.
    expect(links.some((link) => link.href.includes('/icon.png'))).toBe(false)
    expect(links.some((link) => link.href.includes('/apple-icon.png'))).toBe(false)
  })

  test('a sub-page gets the same icons', async ({ page }) => {
    // Each page has its own cached copy, so it may take a request to pick up the new settings.
    await expect
      .poll(async () => {
        await page.goto('/about')
        return (await iconLinks(page)).map((link) => new URL(link.href, 'http://x').hostname)
      })
      .toEqual(Array<string>(4).fill('cdn.sanity.io'))
  })
})
