import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * The Link list's Design options (README, "Link list"): arrow styles, the profile picture's size and
 * border, colours from the theme, social icon styles and position, wordmarks in place of text, and a
 * Cover the screen background apart from the section's height. `/link-design` sets nearly every
 * option on a Cards list; `/link-screen` is a long Glass rows list over a Cover the screen photo.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const ROW = '#main-content li[data-track-event] > a'

test.describe('Link list design', () => {
  test('arrows: External link draws ↗ for other websites and → for pages on this one, in the chosen colour', async ({
    page,
  }) => {
    await page.goto('/link-design')
    const shop = page.locator(ROW).filter({ hasText: 'Shop the range' })
    const about = page.locator(ROW).filter({ hasText: 'About the studio' })
    await expect(shop.locator('[data-link-arrow="external"] path')).toHaveAttribute(
      'd',
      'M8 16 16 8m-6 0h6v6',
    )
    await expect(about.locator('[data-link-arrow="external"] path')).toHaveAttribute(
      'd',
      'M5 12h14m-5-5 5 5-5 5',
    )
    // Arrow colour: Primary, through the token so it follows the tone.
    const colour = await shop
      .locator('[data-link-arrow]')
      .evaluate((svg) => svg.parentElement?.style.color)
    expect(colour).toBe('var(--color-accent-text)')
  })

  test('arrows: Glass rows and an unset arrow style get the chevron', async ({ page }) => {
    await page.goto('/link-screen')
    const arrows = page.locator(`${ROW} [data-link-arrow]`)
    await expect(arrows).toHaveCount(14)
    await expect(arrows.first()).toHaveAttribute('data-link-arrow', 'chevron')
  })

  test('arrows: an invalid custom colour is ignored, so the icon keeps its own', async ({
    page,
  }) => {
    await page.goto('/link-design')
    const styled = await page
      .locator(ROW)
      .first()
      .evaluate((row) =>
        [...row.querySelectorAll<HTMLElement>('[style]')].map((el) => el.style.color),
      )
    expect(styled.join(' ')).not.toContain('not-a-colour')
  })

  test('profile: a large picture with a thick ring and a see-through gap', async ({ page }) => {
    await page.goto('/link-design')
    const picture = page.locator('[data-profile-image="circle"]')
    await expect(picture).toHaveAttribute('data-profile-border', 'line')
    const box = await picture.locator('img').boundingBox()
    // Large on Cards is 128 px on a phone, 144 px from 640 px up (Medium is 96 px).
    expect(box?.width).toBeGreaterThanOrEqual(128)
    // Ring 6 px + gap 6 px on each side, so the ring never overlaps the picture.
    const wrapper = await picture.boundingBox()
    expect(Math.round((wrapper?.width ?? 0) - (box?.width ?? 0))).toBe(24)
    const ring = await picture
      .locator('.image-ring')
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(ring).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('profile: a decorative frame surrounds the picture inside the same box', async ({
    page,
  }) => {
    await page.goto('/link-screen')
    const framed = page.locator('[data-profile-border="frame"]')
    await expect(framed.locator('[data-image-frame="custom"]')).toHaveCount(1)
    const [outer, inner] = await Promise.all([
      framed.boundingBox(),
      framed.locator('img').first().boundingBox(),
    ])
    // Medium on Minimal is 96 px; the picture sits 14% in from each edge.
    expect(Math.round(outer?.width ?? 0)).toBe(96)
    expect(inner?.width).toBeLessThan(outer?.width ?? 0)
  })

  test('colours: name and bio take their own colours; Custom passes only a valid hex', async ({
    page,
  }) => {
    await page.goto('/link-design')
    const name = page.getByRole('heading', { name: 'Test Co', exact: true })
    expect(await name.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(122, 31, 92)')
    const bio = page.getByText('Small-batch ceramics.')
    expect(await bio.evaluate((el) => (el as HTMLElement).style.color)).toBe('var(--color-ink)')
  })

  test('social icons: round buttons below the links, labelled, 44 px targets, keyboard reachable', async ({
    page,
  }) => {
    await page.goto('/link-design')
    const nav = page.getByRole('navigation', { name: 'Social profiles' })
    await expect(nav.locator('ul')).toHaveAttribute('data-social-style', 'circle')
    // Below the links.
    const [list, icons] = await Promise.all([
      page.locator('#main-content ul').first().boundingBox(),
      nav.boundingBox(),
    ])
    expect(icons?.y ?? 0).toBeGreaterThan(list?.y ?? 0)
    const instagram = nav.getByRole('link', { name: 'Instagram' })
    await expect(instagram).toHaveAttribute('href', 'https://instagram.com/testco')
    await expect(instagram).toHaveAttribute('rel', 'me')
    const box = await instagram.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
    expect(await instagram.evaluate((el) => getComputedStyle(el).borderRadius)).not.toBe('0px')
    await instagram.focus()
    await expect(instagram).toBeFocused()
  })

  test('social icons: frosted glass to match Glass rows', async ({ page }) => {
    await page.goto('/link-screen')
    const icon = page.getByRole('navigation', { name: 'Social profiles' }).getByRole('link')
    await expect(icon).toHaveClass(/glass-row/)
    expect(await icon.evaluate((el) => getComputedStyle(el).backdropFilter)).toMatch(/blur/)
  })

  test('wordmarks: the heading and the name keep their text as the picture’s alt text', async ({
    page,
  }) => {
    await page.goto('/link-design')
    // The heading drawn as an image is still a heading, named by its text.
    const heading = page.getByRole('heading', { name: 'Find us online' })
    await expect(heading.locator('img')).toHaveAttribute('alt', 'Find us online')
    await page.goto('/link-screen')
    const name = page.getByRole('heading', { name: 'Sunrise Community Care' })
    await expect(name.locator('img')).toHaveAttribute('alt', 'Sunrise Community Care')
    // Not announced twice: no visible copy of the text beside it.
    await expect(page.getByText('Sunrise Community Care', { exact: true })).toHaveCount(0)
  })

  test('Cover the screen: the photo is the window’s size, and stays so down a long list', async ({
    page,
  }) => {
    await page.goto('/link-screen')
    const viewport = page.viewportSize()
    const layer = page.locator('[data-screen-layer]')
    const section = page.locator('#main-content section').first()
    const sectionBox = await section.boundingBox()
    // A long list: the section is taller than the window, so it still scrolls.
    expect(sectionBox?.height ?? 0).toBeGreaterThan(viewport?.height ?? 0)
    const before = await layer.boundingBox()
    expect(Math.round(before?.height ?? 0)).toBeLessThanOrEqual((viewport?.height ?? 0) + 120)
    expect(before?.height ?? 0).toBeLessThan(sectionBox?.height ?? 0)
    // Scrolled halfway, the photo is still in view at the top of the window.
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight / 3)
    })
    await expect.poll(async () => Math.round((await layer.boundingBox())?.y ?? -1)).toBe(0)
    // The content is not centred: it starts at the top, as without the option.
    expect(await section.evaluate((el) => getComputedStyle(el).justifyContent)).not.toBe('center')
  })

  test('Cover the screen: on a Minimal page the picture reaches past the page’s ends, for iOS overscroll', async ({
    page,
  }) => {
    const clip = (path: string) =>
      page.goto(path).then(() =>
        page
          .locator('#main-content section [data-screen-backdrop]')
          .first()
          .evaluate((el) => getComputedStyle(el).clipPath),
      )
    // The only section: above and below, nothing but the page's own background (the browser
    // shortens equal top and bottom insets to one).
    expect(await clip('/link-screen')).toMatch(/^inset\(-\d+px 0px\)$/)
    // The first of two sections: above it only; the next section follows below.
    expect(await clip('/link-overrides')).toMatch(/^inset\(-\d+px 0px 0px\)$/)
  })

  test('both pages pass axe', async ({ page }) => {
    for (const path of ['/link-design', '/link-screen']) {
      await page.goto(path)
      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
      expect(results.violations, path).toEqual([])
    }
  })
})
