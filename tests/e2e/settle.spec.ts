import { expect, test } from '@playwright/test'

import { settleImagesAndFonts } from './settle'

/**
 * The wait the screenshot specs share (settle.ts): a picture nobody answers fails fast and says which
 * one, instead of hanging until the test timeout; a picture that answers, even with an error, settles.
 */
test.skip(({ isMobile }) => isMobile, 'The helper is the same on every device')

const ONE_PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
)

test('waits for pictures that load', async ({ page }) => {
  await page.route('http://pictures.test/ok.gif', (route) =>
    route.fulfill({ contentType: 'image/gif', body: ONE_PIXEL_GIF }),
  )
  await page.setContent('<img src="http://pictures.test/ok.gif" loading="lazy" alt="">')
  await settleImagesAndFonts(page, { limitMs: 2000 })
})

test('lets a picture that answers with an error settle', async ({ page }) => {
  await page.route('http://pictures.test/missing.gif', (route) => route.fulfill({ status: 404 }))
  await page.setContent('<img src="http://pictures.test/missing.gif" alt="">')
  await settleImagesAndFonts(page, { limitMs: 2000 })
})

test('fails fast, naming the picture, when a request is never answered', async ({ page }) => {
  await page.route('http://pictures.test/never.gif', () => new Promise(() => undefined))
  // The load event waits for the picture too, so only wait for the document.
  await page.setContent('<img src="http://pictures.test/never.gif" alt="">', {
    waitUntil: 'domcontentloaded',
  })
  const started = Date.now()
  await expect(settleImagesAndFonts(page, { limitMs: 500 })).rejects.toThrow(
    /did not finish loading within 500 ms[\s\S]*picture http:\/\/pictures\.test\/never\.gif[\s\S]*page\.route/,
  )
  expect(Date.now() - started).toBeLessThan(5000)
})
