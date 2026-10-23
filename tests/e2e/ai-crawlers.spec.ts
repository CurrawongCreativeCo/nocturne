import { expect, type APIRequestContext, type TestInfo } from '@playwright/test'

import { test } from './fixtures/test'
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

import { FAKE_SANITY_PORT, REVALIDATE_SECRET, SITE_URL } from './constants'

const AI_CRAWLERS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'PerplexityBot', 'CCBot']

// The tests switch the Site settings the fake Content Lake serves, so they run in order, once.
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only')
// test.skip does not stop hooks, and a mobile worker switching the settings would break the desktop run.
const isMobile = (testInfo: TestInfo) => Boolean(testInfo.project.use.isMobile)

/** Serves a settings variant, then expires the cached settings the way the Sanity webhook does. */
async function useSettings(request: APIRequestContext, variant: 'default' | 'aiCrawlersBlocked') {
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

/** The first request after an expiry may still get the old copy while the new one renders. */
const robotsTxt = (request: APIRequestContext) => async () =>
  (await request.get('/robots.txt')).text()

test.afterAll(async ({ request }, testInfo) => {
  if (isMobile(testInfo)) return
  test.setTimeout(30_000)
  await useSettings(request, 'default')
  await expect.poll(robotsTxt(request)).not.toContain('GPTBot')
})

test.describe('AI crawlers allowed (the default)', () => {
  test('robots.txt blocks no AI crawler and still blocks Studio', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text()
    for (const crawler of AI_CRAWLERS) expect(robots).not.toContain(crawler)
    expect(robots).toContain('User-Agent: *\nAllow: /\n')
    expect(robots).toContain('Disallow: /studio')
  })

  test('/llms.txt lists the indexable pages with their descriptions', async ({ request }) => {
    const response = await request.get('/llms.txt')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('text/plain; charset=utf-8')

    const text = await response.text()
    expect(text.startsWith('# Test Co\n\n> Default description for Test Co.\n\n')).toBe(true)
    expect(text).toContain(`- [Home](${SITE_URL}/): Home page description.`)
    expect(text).toContain(`- [Services](${SITE_URL}/services): What we do for clients.`)
    // A page with no description is listed without one.
    expect(text).toMatch(new RegExp(`^- \\[About\\]\\(${SITE_URL}/about\\)$`, 'm'))
    // Nested slugs keep their path; pages hidden from search engines are left out.
    expect(text).toContain(`(${SITE_URL}/services/web/design)`)
    expect(text).not.toContain('/private')
    // Posts follow under a Blog heading, newest first; posts hidden from search engines are left out.
    const blog = text.slice(text.indexOf('## Blog'))
    expect(blog).toContain(
      `- [Welcome to the blog](${SITE_URL}/blog/welcome-to-the-blog): Summary of Welcome to the blog.`,
    )
    expect(blog.indexOf('Welcome to the blog')).toBeLessThan(blog.indexOf('Archive post 9'))
    expect(blog).not.toContain('hidden-post')
    expect(text).not.toContain('localhost')
  })
})

test.describe('AI crawlers switched off in Site settings', () => {
  test.beforeAll(async ({ request }, testInfo) => {
    if (isMobile(testInfo)) return
    test.setTimeout(30_000) // The route waits 3 s for the CDN before expiring anything.
    await useSettings(request, 'aiCrawlersBlocked')
    await expect.poll(robotsTxt(request)).toContain('GPTBot')
  })

  test('robots.txt disallows every AI crawler but keeps search engines allowed', async ({
    request,
  }) => {
    const robots = await (await request.get('/robots.txt')).text()
    const group = AI_CRAWLERS.map((crawler) => `User-Agent: ${crawler}`).join('\n')
    expect(robots).toContain(`${group}\nDisallow: /`)
    // The catch-all group is unchanged, so Googlebot, Bingbot and the rest may still crawl.
    expect(robots).toContain('User-Agent: *\nAllow: /\n')
    expect(robots).toContain('Disallow: /studio')
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`)
    expect(robots).not.toMatch(/User-Agent: (Googlebot|Bingbot)/)
  })

  test('/llms.txt is a 404', async ({ request }) => {
    await expect.poll(async () => (await request.get('/llms.txt')).status()).toBe(404)
  })
})
