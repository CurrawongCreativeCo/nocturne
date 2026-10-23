import AxeBuilder from '@axe-core/playwright'
import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

import { FAKE_SANITY_PORT, REVALIDATE_SECRET } from './constants'
import { test } from './fixtures/test'

/**
 * The shared social icons (components/ui/social-links.tsx) in the footer, the Location section and
 * team profile pages (README, "Social icons"). The fixture's Business info has one profile
 * (Facebook); Ann Lee has LinkedIn and Instagram as icons, Dev Patel LinkedIn as a text link.
 * The footer switch is off in the fixture, so its tests turn it on in the fake lake and expire the
 * cached settings the way the Sanity webhook does.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function useFooterSocial(request: APIRequestContext, state: 'on' | 'off') {
  const control = await request.post(
    `http://localhost:${FAKE_SANITY_PORT}/__fixture/footer-social/${state}`,
  )
  expect(control.status()).toBe(204)
  const body = JSON.stringify({ _type: 'siteNavigation', _id: 'siteNavigation' })
  const webhook = await request.post('/api/revalidate', {
    data: body,
    headers: {
      'content-type': 'application/json',
      [SIGNATURE_HEADER_NAME]: await encodeSignatureHeader(body, Date.now(), REVALIDATE_SECRET),
    },
  })
  expect(webhook.status()).toBe(200)
}

const axe = (page: Page, include: string) =>
  new AxeBuilder({ page }).include(include).withTags(WCAG).analyze()

test.describe('the footer', () => {
  test.describe.configure({ mode: 'serial' })
  test.skip(({ isMobile }) => isMobile, 'Desktop only')
  test.afterEach(async ({ request }) => {
    await useFooterSocial(request, 'off')
  })

  test('shows no icons until the switch is on', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Facebook' })).toHaveCount(
      0,
    )
  })

  test('shows Business info’s profiles as me-links, reachable by keyboard, with no axe violations', async ({
    page,
    request,
  }) => {
    await useFooterSocial(request, 'on')
    await page.goto('/')
    const footer = page.getByRole('contentinfo')
    const facebook = footer.getByRole('link', { name: 'Facebook' })
    await expect(facebook).toHaveAttribute('href', 'https://www.facebook.com/testco')
    await expect(facebook).toHaveAttribute('rel', 'me')
    await expect(footer.getByRole('navigation', { name: 'Social profiles' })).toBeVisible()
    await expect(footer.locator('[data-social-style="circle"]')).toHaveCount(1)

    await facebook.focus()
    await expect(facebook).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(facebook).not.toBeFocused()

    expect((await axe(page, 'footer')).violations).toEqual([])
  })
})

test.describe('the Location section', () => {
  const section = (page: Page) =>
    page.locator('section', { has: page.getByRole('heading', { level: 2, name: 'Follow along' }) })

  test('shows the icons under the contact details only when the switch is on', async ({ page }) => {
    await page.goto('/location')
    const follow = section(page)
    const contact = follow.getByRole('heading', { name: 'Contact' }).locator('..')
    const facebook = contact.getByRole('link', { name: 'Facebook' })
    await expect(facebook).toHaveAttribute('href', 'https://www.facebook.com/testco')
    await expect(facebook).toHaveAttribute('rel', 'me')
    // The default section has the switch off.
    await expect(
      page
        .locator('section', { has: page.getByRole('heading', { level: 2, name: 'Visit us' }) })
        .getByRole('link', { name: 'Facebook' }),
    ).toHaveCount(0)

    await facebook.focus()
    await expect(facebook).toBeFocused()
    expect((await axe(page, 'main')).violations).toEqual([])
  })
})

test.describe('team profiles', () => {
  test('use icons named "<name> on <network>", without rel=me', async ({ page }) => {
    await page.goto('/team/ann-lee')
    const contact = page.getByRole('region', { name: 'Get in touch' })
    const social = contact.getByRole('navigation', { name: 'Ann Lee on social media' })
    const linkedin = social.getByRole('link', { name: 'Ann Lee on LinkedIn' })
    const instagram = social.getByRole('link', { name: 'Ann Lee on Instagram' })
    await expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/in/ann-lee-example')
    await expect(linkedin).toHaveAttribute('rel', 'noopener')
    await expect(instagram).toHaveAttribute('rel', 'noopener')
    await expect(linkedin).not.toContainText('LinkedIn')

    await linkedin.focus()
    await page.keyboard.press('Tab')
    await expect(instagram).toBeFocused()

    expect((await axe(page, 'main')).violations).toEqual([])
  })

  test('keep visible text links for a member who prefers them', async ({ page }) => {
    await page.goto('/team/dev-patel')
    const contact = page.getByRole('region', { name: 'Get in touch' })
    const link = contact.getByRole('link', { name: 'Dev Patel on LinkedIn' })
    await expect(link).toHaveText('LinkedIn')
    await expect(link).toHaveAttribute('rel', 'noopener')
    await expect(contact.getByRole('navigation')).toHaveCount(0)
  })
})
