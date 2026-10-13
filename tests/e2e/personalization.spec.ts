import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('returning visitor greeting', () => {
  test('first visit shows no greeting, the second visit does', async ({ page, context }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Welcome to Test Co')
    await expect(page.getByText('Welcome back!')).toHaveCount(0)

    // MarkVisited sets the cookie after hydration.
    await expect
      .poll(async () => (await context.cookies()).some((c) => c.name === 'visited'))
      .toBe(true)

    await page.reload()
    await expect(page.getByText('Welcome back!')).toBeVisible()

    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations).toEqual([])
  })

  test('a page without the greeting enabled never shows it', async ({ page, context }) => {
    await context.addCookies([{ name: 'visited', value: '1', url: 'http://localhost:3100' }])
    await page.goto('/about')
    await expect(page.getByText('Welcome back!')).toHaveCount(0)
  })
})
