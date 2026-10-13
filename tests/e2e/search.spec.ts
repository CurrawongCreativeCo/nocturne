import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(
    violations.map(({ id, nodes }) => `${id}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([])
}

const status = (page: Page) => page.locator('main [role="status"]')
const dialogStatus = (page: Page) => page.getByRole('dialog').locator('[role="status"]')

test.describe('search page', () => {
  test('is a single-<h1> page with a labelled form and a quiet status', async ({ page }) => {
    await page.goto('/search')
    await expect(page.locator('h1')).toHaveText('Search')
    await expect(page.getByRole('search').getByLabel('Search this site')).toBeVisible()
    await expect(status(page)).toHaveText('')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    await expectNoViolations(page)
  })

  test('finds a page by title and announces the count', async ({ page }) => {
    await page.goto('/search?q=design')
    await expect(status(page)).toHaveText('1 result for “design”.')
    await expect(status(page)).toHaveAttribute('aria-live', 'polite')
    const result = page.locator('main li').first()
    await expect(result.getByRole('heading', { level: 2 })).toHaveText('Web design')
    await expect(result.getByRole('link', { name: 'Web design' })).toHaveAttribute(
      'href',
      '/services/web/design',
    )
    await expect(result).toContainText('Web design services.')
    await expectNoViolations(page)
  })

  test('finds a page by what its sections say, matching word starts', async ({ page }) => {
    await page.goto('/search?q=before+the')
    await expect(page.locator('main li').getByRole('link', { name: 'Shared' })).toBeVisible()
    await expect(page.locator('main li').first()).toContainText(
      'Content before the shared section.',
    )
  })

  test('leaves out pages hidden from search engines', async ({ page }) => {
    await page.goto('/search?q=listed')
    await expect(status(page)).toHaveText('No pages found for “listed”.')
    await expect(page.locator('main li')).toHaveCount(0)
  })

  test('says so when there is nothing to find or too little to search', async ({ page }) => {
    await page.goto('/search?q=zzzzqq')
    await expect(status(page)).toHaveText('No pages found for “zzzzqq”.')
    await page.goto('/search?q=a')
    await expect(status(page)).toHaveText('Enter at least 2 characters.')
    await expect(page.locator('main li')).toHaveCount(0)
  })

  test('caps a long query and treats markup and wildcards as plain text', async ({ page }) => {
    await page.goto(`/search?q=${'x'.repeat(500)}`)
    await expect(status(page)).toHaveText(`No pages found for “${'x'.repeat(80)}”.`)
    await page.goto('/search?q=%3Cb%3Eweb*%3C%2Fb%3E')
    await expect(page.locator('main b')).toHaveCount(0)
    await expectNoViolations(page)
  })

  test('works with JavaScript off', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    const page = await context.newPage()
    await page.goto('/search')
    await page.getByLabel('Search this site').fill('design')
    await page.getByRole('button', { name: 'Search' }).click()
    await expect(page).toHaveURL('/search?q=design')
    await expect(status(page)).toHaveText('1 result for “design”.')
    await context.close()
  })

  test('keyboard only: type, submit, and the live region updates in place', async ({ page }) => {
    await page.goto('/search')
    await page.getByLabel('Search this site').focus()
    await page.keyboard.type('design')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/search?q=design')
    await expect(status(page)).toHaveText('1 result for “design”.')
    // A client navigation: the box keeps focus instead of the page reloading.
    await expect(page.getByLabel('Search this site')).toBeFocused()

    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Web design' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/services/web/design')
    await expect(page.getByRole('heading', { level: 1, name: 'Web design' })).toBeVisible()
  })
})

test.describe('search API', () => {
  test('returns title, path and snippet, and caches at the edge', async ({ request }) => {
    const response = await request.get('/api/search?q=design')
    expect(response.status()).toBe(200)
    expect(response.headers()['cache-control']).toContain('s-maxage=60')
    expect(await response.json()).toEqual({
      results: [
        { title: 'Web design', path: '/services/web/design', snippet: 'Web design services.' },
      ],
    })
  })

  test('refuses a missing or one-character query', async ({ request }) => {
    for (const url of ['/api/search', '/api/search?q=a', '/api/search?q=%20%20']) {
      const response = await request.get(url)
      expect(response.status()).toBe(400)
      expect((await response.json()) as unknown).toMatchObject({ results: [] })
    }
  })
})

test.describe('quick search dialog', () => {
  test('opens from the header link, searches as you type, and follows a result', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Search' }).click()
    const dialog = page.getByRole('dialog', { name: 'Search' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('Search this site')).toBeFocused()

    await dialog.getByLabel('Search this site').pressSequentially('desi')
    await expect(dialogStatus(page)).toHaveText('1 result for “desi”.')
    await dialog.getByRole('link', { name: /Web design/ }).click()
    await expect(page).toHaveURL('/services/web/design')
    await expect(dialog).toBeHidden()
  })

  test('Ctrl/Cmd+K opens it, Escape closes it and returns focus', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Needs a keyboard')
    await page.goto('/about')
    const trigger = page.getByRole('link', { name: 'Search' })
    await trigger.focus()
    const dialog = page.getByRole('dialog', { name: 'Search' })
    await expect(async () => {
      await page.keyboard.press('ControlOrMeta+k')
      await expect(dialog).toBeVisible({ timeout: 500 })
    }).toPass()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('keyboard only: shortcut, type, arrow into results, Enter to go', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Needs a keyboard')
    await page.goto('/about')
    // The shortcut only exists once the page has hydrated, so press it until it takes.
    await expect(async () => {
      await page.keyboard.press('ControlOrMeta+k')
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 500 })
    }).toPass()
    const input = page.getByRole('dialog').getByLabel('Search this site')
    await expect(input).toBeFocused()

    await page.keyboard.type('design')
    await expect(dialogStatus(page)).toHaveText('1 result for “design”.')
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('dialog').getByRole('link', { name: /Web design/ })).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(input).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/services/web/design')
  })

  test('Enter in the box opens the full results page', async ({ page }) => {
    await page.goto('/about')
    await page.getByRole('link', { name: 'Search' }).click()
    await page.getByRole('dialog').getByLabel('Search this site').fill('design')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/search?q=design')
    await expect(status(page)).toHaveText('1 result for “design”.')
  })

  test('asks for more characters, and says when nothing matched', async ({ page }) => {
    await page.goto('/about')
    await page.getByRole('link', { name: 'Search' }).click()
    const input = page.getByRole('dialog').getByLabel('Search this site')
    await input.pressSequentially('d')
    await expect(dialogStatus(page)).toHaveText('Type at least 2 characters to search.')
    await input.fill('zzzzqq')
    await expect(dialogStatus(page)).toHaveText('No pages found for “zzzzqq”.')
  })

  test('waits for a pause in typing before asking the server', async ({ page }) => {
    const queries: string[] = []
    await page.route('**/api/search?*', async (route) => {
      queries.push(new URL(route.request().url()).searchParams.get('q') ?? '')
      await route.continue()
    })
    await page.goto('/about')
    await page.getByRole('link', { name: 'Search' }).click()
    await page.getByRole('dialog').getByLabel('Search this site').pressSequentially('design', {
      delay: 30,
    })
    await expect(dialogStatus(page)).toHaveText('1 result for “design”.')
    expect(queries).toEqual(['design'])
  })

  test('reports a failing search instead of hanging', async ({ page }) => {
    await page.route('**/api/search?*', (route) => route.fulfill({ status: 502, json: {} }))
    await page.goto('/about')
    await page.getByRole('link', { name: 'Search' }).click()
    await page.getByRole('dialog').getByLabel('Search this site').fill('design')
    await expect(dialogStatus(page)).toContainText('Search is unavailable')
  })

  test('has no WCAG 2.2 AA violations while open, empty and with results', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Search' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectNoViolations(page)

    await page.getByRole('dialog').getByLabel('Search this site').fill('design')
    await expect(page.getByRole('dialog').getByRole('link', { name: /Web design/ })).toBeVisible()
    await expectNoViolations(page)
  })
})
