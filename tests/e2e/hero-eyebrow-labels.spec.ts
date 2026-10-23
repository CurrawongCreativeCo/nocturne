import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

import { test } from './fixtures/test'

const section = (page: Page, name: string) =>
  page
    .locator('#main-content section')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })

test.beforeEach(async ({ page }) => {
  await page.goto('/hero-labels')
})

test('explicit labels are a named list above the heading with decorative separators', async ({
  page,
}) => {
  const hero = section(page, 'Move your way')
  const list = hero.getByRole('list', { name: 'Eyebrow labels' })
  await expect(list.getByRole('listitem')).toHaveText([
    'Yoga',
    'Pilates',
    'Barre',
    'Restorative movement',
    'Breathwork',
  ])
  await expect(list).toHaveAttribute('data-inline-list', 'bullet')
  await expect(list).toHaveCSS('text-transform', 'uppercase')
  await expect(list.locator('[data-inline-separator]')).toHaveCount(4)
  for (const separator of await list.locator('[data-inline-separator]').all()) {
    await expect(separator).toHaveAttribute('aria-hidden', 'true')
  }
  await expect(hero.getByText('Old eyebrow kept for later')).toHaveCount(0)
  expect(
    await hero.evaluate((root) => {
      const list = root.querySelector('ul')
      const heading = root.querySelector('h1')
      return Boolean(
        list && heading && list.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
      )
    }),
  ).toBe(true)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('p ul, span ul')).toHaveCount(0)
})

test('prose and empty arrays keep the original eyebrow paragraph', async ({ page }) => {
  for (const [heading, text] of [
    ['Words as written', 'Yoga · Pilates · Barre'],
    ['Empty labels keep text', 'A moment for yourself'],
  ] as const) {
    const hero = section(page, heading)
    await expect(hero.getByRole('list', { name: 'Eyebrow labels' })).toHaveCount(0)
    await expect(hero.locator('p').filter({ hasText: text })).toHaveText(text)
  }
})

test('uses the chosen separator and colours in a start-aligned hero', async ({ page }) => {
  const list = section(page, 'Find your practice').getByRole('list', { name: 'Eyebrow labels' })
  await expect(list).toHaveAttribute('data-inline-list', 'dot')
  expect(await list.evaluate((el) => el.style.color)).toBe('var(--color-ink)')
  await expect(list.locator('[data-inline-separator]').first()).toHaveCSS(
    'color',
    'rgb(101, 67, 33)',
  )
  await expect(list.getByRole('listitem').first()).toHaveCSS('flex-grow', '0')
})

test('wraps at 375 px without dangling separators or horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  const list = section(page, 'Move your way').getByRole('list', { name: 'Eyebrow labels' })
  await expect(list).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  const geometry = await list.evaluate((list) => {
    const box = list.getBoundingClientRect()
    const items = [...list.querySelectorAll('li')]
    const rows = new Set(items.map((item) => Math.round(item.getBoundingClientRect().top)))
    const problems = items.flatMap((item, index) => {
      const own = item.getBoundingClientRect()
      const previous = items[index - 1]?.getBoundingClientRect()
      const mark = item.querySelector('[data-inline-separator]')?.getBoundingClientRect()
      if (!mark) return []
      if (!previous || Math.abs(previous.top - own.top) > 2) {
        return mark.right <= box.left + 0.5 ? [] : ['separator starts a line']
      }
      return mark.left >= previous.right - 0.5 && mark.right <= own.left + 0.5
        ? []
        : ['separator outside gap']
    })
    return {
      rows: rows.size,
      problems,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
  expect(geometry.rows).toBeGreaterThan(1)
  expect(geometry.problems).toEqual([])
  expect(geometry.overflow).toBe(0)
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

test('labels stay readable with JavaScript disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  try {
    const page = await context.newPage()
    await page.goto('/hero-labels')
    await expect(section(page, 'Move your way').getByRole('listitem').first()).toBeVisible()
  } finally {
    await context.close()
  }
})
