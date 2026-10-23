import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'

import { test } from './fixtures/test'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test('image headings retain the group name and text fallbacks', async ({ page }) => {
  await page.goto('/link-headings')
  const section = (name: string) =>
    page
      .locator('#main-content section')
      .filter({ has: page.getByRole('heading', { name: `Link heading: ${name}`, exact: true }) })
  const heading = section('image').getByRole('heading', { name: 'Sessions', exact: true })
  const picture = heading.getByRole('img', { name: 'Sessions', exact: true })
  await expect(picture).toBeVisible()
  await expect(heading).toHaveJSProperty('tagName', 'H3')
  await expect(section('image').getByRole('listitem')).toHaveCount(2)
  for (const name of ['missing', 'text']) {
    const fallback = section(name).getByRole('heading', { name: 'Sessions', exact: true })
    await expect(fallback).toHaveText('Sessions')
    await expect(fallback.getByRole('img')).toHaveCount(0)
  }
  const result = await new AxeBuilder({ page }).include('#main-content').withTags(WCAG).analyze()
  expect(result.violations).toEqual([])
})
