import { expect, test } from '@playwright/test'

test.skip(({ isMobile }) => isMobile, 'Desktop only')

test.describe('/api/ops-notices', () => {
  test('answers 204 with no body when OPS_NOTICES_URL is not set', async ({ request }) => {
    const response = await request.get('/api/ops-notices')
    expect(response.status()).toBe(204)
    expect(await response.text()).toBe('')
  })
})
