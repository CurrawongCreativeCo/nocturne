import { expect } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * The blurred preview shown while a picture loads is only for pictures that are certainly opaque
 * (src/lib/sanity/image-placeholder.ts): `next/image` draws it as the picture's background, so it
 * would show through a transparent logo or wordmark for good. `/image-placeholders` has a
 * transparent logo as a profile picture and as a wordmark, and an opaque photo, all with a preview.
 * The HTML is checked as served, which is what the first paint uses (the test pictures never load,
 * and `next/image` removes the preview once a picture has loaded or failed).
 */

const images = async (request: Parameters<Parameters<typeof test>[2]>[0]['request']) => {
  const html = await (await request.get('/image-placeholders')).text()
  return [...html.matchAll(/<img[^>]*>/g)].map((match) => match[0])
}
const hasBlur = (tag: string) => tag.includes('background-image:url')

test('a transparent picture and a wordmark are served with no blur behind them', async ({
  request,
}) => {
  const logos = (await images(request)).filter((tag) => /alt="(Logo|Transparent logo)"/.test(tag))
  expect(logos).toHaveLength(2)
  for (const tag of logos) expect(hasBlur(tag)).toBe(false)
})

test('an opaque photo is served with its blur preview', async ({ request }) => {
  const photo = (await images(request)).find((tag) => tag.includes('alt="Photo"'))
  expect(photo && hasBlur(photo)).toBe(true)
})
