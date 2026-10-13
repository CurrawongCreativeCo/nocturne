import { readFileSync } from 'node:fs'
import path from 'node:path'

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { APP_PORT, RELEASE_ID } from './constants'

/** Next's draft-mode cookie value, fixed per build; lets the test skip the Studio secret handshake. */
const { previewModeId } = (
  JSON.parse(readFileSync(path.join(process.cwd(), '.next/prerender-manifest.json'), 'utf8')) as {
    preview: { previewModeId: string }
  }
).preview

test.describe('content releases', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { name: '__prerender_bypass', value: previewModeId, url: `http://localhost:${APP_PORT}` },
    ])
  })

  test('draft mode with a release perspective renders the release content', async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: 'sanity-preview-perspective',
        value: RELEASE_ID,
        url: `http://localhost:${APP_PORT}`,
      },
    ])
    await page.goto('/about')
    await expect(page.locator('h1')).toHaveText('About (Summer release)')
    await expect(
      page.getByRole('heading', { name: 'Only in the Summer release.', level: 2 }),
    ).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test('a section that throws is replaced by a notice; the rest of the page renders', async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: 'sanity-preview-perspective',
        value: RELEASE_ID,
        url: `http://localhost:${APP_PORT}`,
      },
    ])
    await page.goto('/resilience')
    await expect(
      page.getByRole('alert').filter({ hasText: 'The pricingTable section failed to render.' }),
    ).toBeVisible()
    await expect(page.getByText('Pricing that throws')).toHaveCount(0)
    await expect(page.getByText('Resilience lead.')).toBeVisible()
    await expect(page.getByText('Resilience closing.')).toBeVisible()
  })

  test('without a release perspective the page shows the base content', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('h1')).toHaveText('About')
    await expect(page.getByText('Only in the Summer release.')).toHaveCount(0)
  })
})
