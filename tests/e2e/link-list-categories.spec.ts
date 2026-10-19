import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * Service categories and paragraphs (README, "Link list" and "Paragraphs in plain text"):
 * `/link-categories` has a Glass rows list over a photo whose bio still repeats its categories, a
 * list saved before categories existed, a start-aligned list of long capitalised names that stacks on
 * phones, hidden categories, and a section intro with paragraphs and a line break.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const section = (page: Page, name: string) =>
  page.locator('#main-content section').filter({ has: page.getByRole('heading', { name }) })

test.describe('Service categories', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/link-categories')
  })

  test('are a named list of labels, with drawn separators screen readers skip', async ({
    page,
  }) => {
    const list = section(page, 'Still Water Wellness').getByRole('list', { name: 'Services' })
    await expect(list.getByRole('listitem')).toHaveText([
      'Bodywork',
      'Breathwork',
      'Movement',
      'Retreats',
    ])
    // Three separators for four labels: none before the first, none after the last.
    const separators = list.locator('[data-inline-separator]')
    await expect(separators).toHaveCount(3)
    for (const separator of await separators.all()) {
      await expect(separator).toHaveAttribute('aria-hidden', 'true')
    }
    await expect(list.getByRole('listitem').first().locator('[data-inline-separator]')).toHaveCount(
      0,
    )
  })

  test('colour the separators on their own, and keep the words in the text colour', async ({
    page,
  }) => {
    const list = section(page, 'Still Water Wellness').getByRole('list', { name: 'Services' })
    const [separator, words, ink] = await Promise.all([
      list
        .locator('[data-inline-separator]')
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      list.evaluate((el) => getComputedStyle(el).color),
      page
        .getByRole('heading', { name: 'Still Water Wellness' })
        .evaluate((el) => getComputedStyle(el).color),
    ])
    expect(separator).toBe('rgb(138, 109, 29)')
    expect(words).toBe(ink)
  })

  test('sit between the name and the bio, and the bio does not repeat them', async ({ page }) => {
    const profile = section(page, 'Still Water Wellness')
    const bio = profile.getByText('Reconnect to your body and your nature.')
    // The bio's typed first line matched the categories exactly, so it is not drawn twice.
    await expect(profile.getByText('Bodywork • Breathwork')).toHaveCount(0)
    // A single new line is a line break inside the one paragraph.
    await expect(bio.locator('br')).toHaveCount(1)
    const order = await profile.evaluate((root) => {
      const heading = root.querySelector('h2')
      const list = root.querySelector('ul[aria-label="Services"]')
      const paragraph = [...root.querySelectorAll('p')].find((p) =>
        p.textContent.startsWith('Reconnect'),
      )
      if (!heading || !list || !paragraph) return null
      const follows = (a: Node, b: Node) =>
        Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
      return follows(heading, list) && follows(list, paragraph)
    })
    expect(order).toBe(true)
  })

  test('never leave a separator at the start or end of a line, at any width', async ({ page }) => {
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      const problems = await page.locator('ul[aria-label="Services"]').evaluateAll((lists) =>
        lists.flatMap((list) => {
          const box = list.getBoundingClientRect()
          const items = [...list.querySelectorAll(':scope > li')]
          return items.flatMap((item, index) => {
            const separator = item.querySelector<HTMLElement>('[data-inline-separator]')
            if (!separator || getComputedStyle(separator).display === 'none') return []
            const mark = separator.getBoundingClientRect()
            const previous = items[index - 1]?.getBoundingClientRect()
            const own = item.getBoundingClientRect()
            // A label that starts a line has its separator outside the list, where it is clipped.
            if (!previous || Math.abs(previous.top - own.top) > 2) {
              return mark.right <= box.left + 0.5
                ? []
                : [`${item.textContent} starts a line with a separator`]
            }
            // Otherwise the separator is inside the list, in the gap between the two labels.
            const between = mark.left >= previous.right - 0.5 && mark.right <= own.left + 0.5
            return between ? [] : [`${item.textContent}: the separator is not between labels`]
          })
        }),
      )
      expect(problems, `at ${String(width)} px`).toEqual([])
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `no sideways scroll at ${String(width)} px`).toBeLessThanOrEqual(0)
    }
  })

  test('One per line stacks long names on a phone and hides the separators there', async ({
    page,
  }) => {
    const list = section(page, 'Long names').getByRole('list', { name: 'Services' })
    await page.setViewportSize({ width: 375, height: 900 })
    await expect(list).toHaveCSS('flex-direction', 'column')
    await expect(list.locator('[data-inline-separator]').first()).toBeHidden()
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect(list).toHaveCSS('flex-direction', 'row')
    await expect(list.locator('[data-inline-separator]').first()).toBeVisible()
    // Capitals, in Primary, with diamonds in Highlight.
    await expect(list).toHaveCSS('text-transform', 'uppercase')
    expect(await list.evaluate((el) => el.style.color)).toBe('var(--color-accent-text)')
    expect(
      await list
        .locator('[data-inline-separator]')
        .first()
        .evaluate((el) => el.style.color),
    ).toBe('var(--color-highlight)')
  })

  test('hidden categories never reach the page', async ({ page }) => {
    await expect(page.getByText('Never shown')).toHaveCount(0)
    await expect(
      section(page, 'Hidden categories').getByRole('list', { name: 'Services' }),
    ).toHaveCount(0)
  })

  test('the page passes axe at this width', async ({ page }) => {
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('Paragraphs in plain text', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/link-categories')
  })

  test('a list saved before categories keeps its typed bullets as text, in paragraphs', async ({
    page,
  }) => {
    const profile = section(page, 'Saved before categories')
    await expect(profile.getByRole('list', { name: 'Services' })).toHaveCount(0)
    const paragraphs = profile.locator('h2 ~ div > p')
    await expect(paragraphs).toHaveText([
      'Bodywork • Breathwork • Movement • Retreats',
      'Reconnect to your body and your nature. Remember what makes you feel alive!',
    ])
  })

  test('blank lines make paragraphs, extra blank lines add no space, and a new line breaks', async ({
    page,
  }) => {
    const intro = section(page, 'Paragraphs everywhere').locator('header > div')
    await expect(intro.locator('> p')).toHaveCount(2)
    await expect(intro.locator('> p').first().locator('br')).toHaveCount(1)
    const gap = await intro.evaluate((el) => {
      const [first, second] = [...el.querySelectorAll(':scope > p')]
      return (
        (second?.getBoundingClientRect().top ?? 0) - (first?.getBoundingClientRect().bottom ?? 0)
      )
    })
    // 0.75em of the 18 px lead text: one paragraph gap, however many blank lines were typed.
    expect(gap).toBeGreaterThan(10)
    expect(gap).toBeLessThan(16)
  })

  test('no paragraph is ever inside another', async ({ page }) => {
    await expect(page.locator('p p')).toHaveCount(0)
  })
})
