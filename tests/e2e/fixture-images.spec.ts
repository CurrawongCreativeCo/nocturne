import { expect } from '@playwright/test'

import { FAKE_SANITY_PORT } from './constants'
import { test } from './fixtures/test'

test('the fake Content Lake serves a real PNG and ordinary page pictures decode', async ({
  page,
  request,
}) => {
  const response = await request.get(`http://localhost:${FAKE_SANITY_PORT}/__fixture/picture.png`)
  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toBe('image/png')
  expect((await response.body()).subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  )
  await page.goto('/links')
  const pictures = page.locator('#main-content img')
  expect(await pictures.count()).toBeGreaterThan(0)
  const loaded = await pictures.evaluateAll(async (images) =>
    Promise.all(
      images.map(async (image) => {
        const picture = image as HTMLImageElement
        picture.loading = 'eager'
        await picture.decode().catch(() => undefined)
        return picture.naturalWidth > 0
      }),
    ),
  )
  expect(loaded.every(Boolean)).toBe(true)
})
