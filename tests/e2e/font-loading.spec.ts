import { expect } from '@playwright/test'

import { test } from './fixtures/test'

test('public pages preload their Inter font without the unused Studio heading font', async ({
  request,
  isMobile,
}) => {
  test.skip(isMobile, 'The response headers are the same on every device')
  for (const url of ['/', '/about', '/hero-parts', '/links']) {
    const response = await request.get(url)
    const hints = response.headers().link ?? ''
    const fonts = hints.split(',').filter((hint) => hint.includes('as="font"'))
    expect(fonts, url).toHaveLength(1)
    expect(fonts[0]).toContain('.woff2')
  }
})
