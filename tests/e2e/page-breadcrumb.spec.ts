import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * The page breadcrumb (src/features/studio/components/page-breadcrumb.tsx), tested through
 * /studio-brand-preview because Studio needs a login. Light and dark, with axe.
 */
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SCHEMES = ['light', 'dark'] as const

async function openPreview(page: Page) {
  await page.goto('/studio-brand-preview')
  await expect(page.locator('main[data-ready="true"]')).toBeVisible()
}

const example = (page: Page, scheme: string, id: string) =>
  page.locator(`[data-breadcrumb-scheme="${scheme}"] [data-breadcrumb-example="${id}"]`)

for (const scheme of SCHEMES) {
  test(`breadcrumb is accessible and marks the current page (${scheme})`, async ({ page }) => {
    await openPreview(page)
    const nested = example(page, scheme, 'nested')
    await nested.scrollIntoViewIfNeeded()
    const nav = nested.getByRole('navigation', { name: 'Page location' })
    await expect(nav.getByRole('link', { name: 'services' })).toBeVisible()
    await expect(nav.locator('[aria-current="page"]')).toHaveText('web-design')

    // A missing ancestor is text, not a link.
    const missing = example(page, scheme, 'missing').getByRole('navigation')
    await expect(missing.getByRole('link')).toHaveCount(0)
    await expect(missing.getByText('services')).toBeVisible()

    const results = await new AxeBuilder({ page })
      .include(`[data-breadcrumb-scheme="${scheme}"]`)
      .withTags(WCAG)
      .analyze()
    expect(results.violations).toEqual([])
  })

  test(`narrow pane folds the ancestors into a button (${scheme})`, async ({ page }) => {
    await openPreview(page)
    const narrow = example(page, scheme, 'narrow')
    await narrow.scrollIntoViewIfNeeded()
    const toggle = narrow.getByRole('button', { name: 'Show the pages above this one' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.focus()
    await page.keyboard.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(narrow.getByRole('link', { name: 'web', exact: true })).toBeVisible()
    await expect(narrow.locator('[aria-current="page"]')).toHaveText('web-design')
  })
}
