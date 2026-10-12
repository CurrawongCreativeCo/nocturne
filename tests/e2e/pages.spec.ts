import { expect, test, type Page } from '@playwright/test'

import { SITE_URL } from './constants'

test.describe('pages', () => {
  test('home renders its sections with the hero as the only <h1>', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText('Welcome to Test Co')
    for (const heading of [
      'Features',
      'Media without an image',
      'Testimonials',
      'FAQ',
      'Brand banner',
    ]) {
      await expect(page.getByRole('heading', { name: heading, level: 2 })).toBeVisible()
    }
  })

  test('a page without a leading hero still has exactly one <h1>', async ({ page }) => {
    await page.goto('/about')
    const h1 = page.locator('h1')
    await expect(h1).toHaveCount(1)
    await expect(h1).toHaveText('About')
  })

  test('links that open a new tab say so to screen readers', async ({ page }) => {
    await page.goto('/about')
    const link = page.getByRole('link', { name: 'External site (opens in a new tab)' })
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('image + text without an image uses a single column', async ({ page }) => {
    await page.goto('/')
    const section = page.locator('section', {
      has: page.getByRole('heading', { name: 'Media without an image' }),
    })
    await expect(section).not.toHaveClass(/grid-cols-2/)
  })

  test('unknown URLs return a 404 page', async ({ page }) => {
    const response = await page.goto('/does-not-exist')
    expect(response?.status()).toBe(404)
    await expect(page).toHaveTitle('Page not found | Test Co')
  })
})

test.describe('metadata', () => {
  const meta = (page: Page, attr: string, value: string) =>
    page.locator(`meta[${attr}="${value}"]`).getAttribute('content')

  test('pages have complete Open Graph and Twitter tags', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Home | Test Co')
    expect(await meta(page, 'property', 'og:title')).toBe('Home | Test Co')
    expect(await meta(page, 'property', 'og:description')).toBe('Home page description.')
    expect(await meta(page, 'property', 'og:site_name')).toBe('Test Co')
    expect(await meta(page, 'property', 'og:url')).toBe(SITE_URL)
    expect(await meta(page, 'property', 'og:type')).toBe('website')
    expect(await meta(page, 'name', 'twitter:card')).toBe('summary_large_image')
    expect(await meta(page, 'name', 'twitter:title')).toBe('Home | Test Co')
  })

  test('a page without its own description falls back to the site description', async ({
    page,
  }) => {
    await page.goto('/about')
    expect(await meta(page, 'name', 'description')).toBe('Default description for Test Co.')
    expect(await meta(page, 'property', 'og:description')).toBe('Default description for Test Co.')
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(
      `${SITE_URL}/about`,
    )
  })

  test('structured data describes the organization and website', async ({ page }) => {
    await page.goto('/')
    const json = await page.locator('script[type="application/ld+json"]').textContent()
    const data = JSON.parse(json ?? '{}') as {
      '@graph': { '@type': string; name: string; url: string }[]
    }
    expect(data['@graph'].map((node) => node['@type'])).toEqual(['Organization', 'WebSite'])
    expect(data['@graph'][0]).toMatchObject({ name: 'Test Co', url: `${SITE_URL}/` })
  })
})
