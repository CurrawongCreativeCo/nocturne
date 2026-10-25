import { expect, type APIRequestContext, type TestInfo } from '@playwright/test'
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

import { APP_PORT, APP_PORT_PRELAUNCH, FAKE_SANITY_PORT, REVALIDATE_SECRET } from './constants'
import { test } from './fixtures/test'

const MARKER = '<meta name="nocturne:marker" content="nocturne-e2e-marker"'
const LIVE = `http://localhost:${APP_PORT}`
const PRELAUNCH = `http://localhost:${APP_PORT_PRELAUNCH}`

// The tests switch the Site settings the fake Content Lake serves, so they run in order, once.
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only')
const isMobile = (testInfo: TestInfo) => Boolean(testInfo.project.use.isMobile)

/** Serves a settings variant, then expires the cached settings the way the Sanity webhook does. */
async function useSettings(request: APIRequestContext, variant: 'default' | 'markerUnset') {
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

/** The raw HTML, not the rendered page: the tag is read the way launch:check reads it. */
const homeHtml = (url: string) => async () => (await fetch(`${url}/`)).text()

test.afterAll(async ({ request }, testInfo) => {
  if (isMobile(testInfo)) return
  test.setTimeout(30_000)
  await useSettings(request, 'default')
  await expect.poll(homeHtml(LIVE)).toContain(MARKER)
})

test.describe('launch verification marker', () => {
  test('the live home page carries the marker from Studio', async () => {
    const html = await homeHtml(LIVE)()
    expect(html).toContain(MARKER)
    expect(html.match(/name="nocturne:marker"/g)).toHaveLength(1)
  })

  test('the pre-launch page carries it too', async () => {
    const html = await homeHtml(PRELAUNCH)()
    expect(html).toContain(MARKER)
  })

  test('is absent once the field is cleared', async ({ request }) => {
    test.setTimeout(30_000)
    await useSettings(request, 'markerUnset')
    await expect.poll(homeHtml(LIVE)).not.toContain('nocturne:marker')
  })
})
