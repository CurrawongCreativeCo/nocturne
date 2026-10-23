import AxeBuilder from '@axe-core/playwright'
import { expect, type APIRequestContext, type TestInfo } from '@playwright/test'
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

import { FAKE_SANITY_PORT, REVALIDATE_SECRET } from './constants'
import { test } from './fixtures/test'

// The tests start and stop the fixture experiment, so they run in order, once.
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only')
const isMobile = (testInfo: TestInfo) => Boolean(testInfo.project.use.isMobile)

const PAGE = '/ab-test'
/** The experiment's _id in the fixture, and the cookie value format "<id>.<option>". */
const cookie = (option: string) => `ab=experiment-headline.${option}`

/** Starts or stops the fixture experiment, then expires the cached result the way the webhook does. */
async function setExperiment(request: APIRequestContext, state: 'on' | 'off') {
  const control = await request.post(
    `http://localhost:${FAKE_SANITY_PORT}/__fixture/experiment/${state}`,
  )
  expect(control.status()).toBe(204)

  const body = JSON.stringify({ _type: 'experiment', _id: 'experiment-headline' })
  const webhook = await request.post('/api/revalidate', {
    data: body,
    headers: {
      'content-type': 'application/json',
      [SIGNATURE_HEADER_NAME]: await encodeSignatureHeader(body, Date.now(), REVALIDATE_SECRET),
    },
  })
  expect(webhook.status()).toBe(200)
}

const get = (request: APIRequestContext, headers: Record<string, string> = {}) =>
  request.get(PAGE, { headers })

/** The first request after an expiry may still get the old answer while the new one renders. */
const hasCookie = (request: APIRequestContext) => async () =>
  Boolean((await get(request)).headers()['set-cookie']?.includes('ab='))

test.afterAll(async ({ request }, testInfo) => {
  if (isMobile(testInfo)) return
  test.setTimeout(30_000)
  await setExperiment(request, 'off')
  await expect.poll(hasCookie(request)).toBe(false)
})

test.describe('no experiment running (the default)', () => {
  test('pages are unchanged: control content, no cookie, no attributes', async ({
    page,
    request,
  }) => {
    const response = await get(request)
    expect(response.headers()['set-cookie']).toBeUndefined()

    await page.goto(PAGE)
    await expect(page.locator('h1')).toHaveText('Control headline')
    const main = page.locator('main')
    await expect(main).not.toHaveAttribute('data-experiment', /.*/)
    await expect(main).not.toHaveAttribute('data-variant', /.*/)
  })

  test('a visitor cookie from an earlier experiment is ignored', async ({ request }) => {
    const html = await (await get(request, { cookie: cookie('bold') })).text()
    expect(html).toContain('Control headline')
    expect(html).not.toContain('Variant headline')
  })
})

test.describe('experiment running', () => {
  test.beforeAll(async ({ request }, testInfo) => {
    if (isMobile(testInfo)) return
    test.setTimeout(30_000) // The route waits 3 s for the CDN before expiring anything.
    await setExperiment(request, 'on')
    await expect.poll(hasCookie(request)).toBe(true)
  })

  test('a visitor with the control cookie sees the published content', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: 'ab', value: 'experiment-headline.control', url: 'http://localhost:3100' },
    ])
    await page.goto(PAGE)
    await expect(page.locator('h1')).toHaveText('Control headline')
    await expect(page.locator('main')).toHaveAttribute('data-experiment', 'Headline test')
    await expect(page.locator('main')).toHaveAttribute('data-variant', 'control')
    // The address is the page's own, not the internal variant route.
    expect(new URL(page.url()).pathname).toBe(PAGE)
  })

  test('a visitor with the variant cookie sees the variant content', async ({ page, context }) => {
    await context.addCookies([
      { name: 'ab', value: 'experiment-headline.bold', url: 'http://localhost:3100' },
    ])
    await page.goto(PAGE)
    await expect(page.locator('h1')).toHaveText('Variant headline')
    await expect(page.locator('main')).toHaveAttribute('data-experiment', 'Headline test')
    await expect(page.locator('main')).toHaveAttribute('data-variant', 'bold')
    expect(new URL(page.url()).pathname).toBe(PAGE)
  })

  test('the other pages are the same in both options', async ({ page, context }) => {
    for (const option of ['control', 'bold']) {
      await context.addCookies([
        { name: 'ab', value: `experiment-headline.${option}`, url: 'http://localhost:3100' },
      ])
      await page.goto('/')
      await expect(page.locator('h1')).toHaveText('Welcome to Test Co')
      await expect(page.locator('main')).toHaveAttribute('data-variant', option)
    }
  })

  test('a new visitor is assigned an option and keeps it', async ({ playwright, baseURL }) => {
    const seen = new Set<string>()
    // Fresh visitors split roughly 50/50; 40 of them reach both options unless the split is broken.
    for (let i = 0; i < 40; i++) {
      const visitor = await playwright.request.newContext({ baseURL })
      const first = await visitor.get(PAGE)
      const assigned = /ab=experiment-headline\.([\w-]+)/.exec(
        first.headers()['set-cookie'] ?? '',
      )?.[1]
      expect(assigned).toMatch(/^(control|bold)$/)
      seen.add(assigned ?? '')

      // Sticky: the cookie jar is sent back, the same option is served and no new cookie is set.
      const again = await visitor.get(PAGE)
      expect(again.headers()['set-cookie']).toBeUndefined()
      expect(await again.text()).toContain(
        assigned === 'bold' ? 'Variant headline' : 'Control headline',
      )
      await visitor.dispose()
      if (seen.size === 2) break
    }
    expect([...seen].sort()).toEqual(['bold', 'control'])
  })

  test('crawlers always get control and no cookie', async ({ request }) => {
    const response = await get(request, { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' })
    expect(response.headers()['set-cookie']).toBeUndefined()
    expect(await response.text()).toContain('Control headline')
  })

  test('the blog is not part of the experiment', async ({ request }) => {
    const response = await request.get('/blog')
    expect(response.status()).toBe(200)
    expect(response.headers()['set-cookie']).toBeUndefined()
  })

  test('search is not part of the experiment', async ({ request }) => {
    const response = await request.get('/search?q=design')
    expect(response.status()).toBe(200)
    expect(response.headers()['set-cookie']).toBeUndefined()
    expect(await response.text()).toContain('Web design')
  })

  test('sign-in and sign-out are not part of the experiment', async ({ request }) => {
    for (const path of ['/sign-in', '/sign-out']) {
      const response = await request.get(path)
      expect(response.status()).toBe(200)
      expect(response.headers()['set-cookie']).toBeUndefined()
    }
  })

  test('the variant page has no WCAG 2.2 AA violations', async ({ page, context }) => {
    await context.addCookies([
      { name: 'ab', value: 'experiment-headline.bold', url: 'http://localhost:3100' },
    ])
    await page.goto(PAGE)
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(violations.map(({ id }) => id)).toEqual([])
  })
})
