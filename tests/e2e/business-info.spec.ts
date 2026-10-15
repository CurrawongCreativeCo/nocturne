import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { SITE_URL } from './constants'

// The fixture's businessInfo document (tests/e2e/fixtures/dataset.mjs): Newtown NSW, Mon–Fri 8:00 am –
// 5:30 pm, Saturday mornings, closed Sunday, Sydney time.
const FRIDAY_MORNING = new Date('2026-10-16T10:00:00+11:00')
const SUNDAY = new Date('2026-10-18T10:00:00+11:00')

test.describe('business info', () => {
  test('the footer shows the address, contact details and grouped hours', async ({ page }) => {
    await page.goto('/')
    const footer = page.getByRole('contentinfo')

    await expect(footer.getByText('1 King Street')).toBeVisible()
    await expect(footer.getByText('Newtown NSW 2042')).toBeVisible()
    await expect(footer.getByText('ABN 51 824 753 556')).toBeVisible()

    // The number is both the link text and a tel: link in international form.
    const phone = footer.getByRole('link', { name: /\(02\) 9876 5432/ })
    await expect(phone).toHaveText(/\(02\) 9876 5432/)
    await expect(phone).toHaveAttribute('href', 'tel:+61298765432')
    await expect(footer.getByRole('link', { name: /hello@example\.com/ })).toHaveAttribute(
      'href',
      'mailto:hello@example.com',
    )

    const hours = footer.getByRole('heading', { name: 'Opening hours' }).locator('..')
    await expect(hours.getByText('Mon–Fri')).toBeVisible()
    await expect(hours.getByText('8:00 am – 5:30 pm')).toBeVisible()
    await expect(hours.getByText('Sat', { exact: true })).toBeVisible()
    await expect(hours.getByText('9:00 am – 1:00 pm')).toBeVisible()
    await expect(hours.getByText('Sun', { exact: true })).toBeVisible()
    await expect(hours.getByText('Closed', { exact: true })).toBeVisible()
  })

  test('special days: an upcoming one shows, a past one does not', async ({ page }) => {
    await page.goto('/')
    const footer = page.getByRole('contentinfo')
    await expect(footer.getByText('25 Dec')).toBeVisible()
    await expect(footer.getByText('(Christmas Day)')).toBeVisible()
    await expect(footer.getByText('Australia Day')).toHaveCount(0)
  })

  test('the "Open now" badge follows the business time zone, not the browser', async ({ page }) => {
    await page.clock.setFixedTime(FRIDAY_MORNING)
    await page.goto('/')
    await expect(page.getByText('Open now · closes 5:30 pm')).toBeVisible()

    await page.clock.setFixedTime(SUNDAY)
    await page.goto('/')
    await expect(page.getByText('Closed now')).toBeVisible()
  })

  test('structured data is a LocalBusiness with address, hours and profiles', async ({ page }) => {
    await page.goto('/')
    const json = await page.locator('script[type="application/ld+json"]').first().textContent()
    const data = JSON.parse(json ?? '{}') as { '@graph': Record<string, unknown>[] }
    const [business, website] = data['@graph']

    expect(business).toMatchObject({
      '@type': 'ProfessionalService',
      '@id': `${SITE_URL}/#organization`,
      name: 'Test Co',
      legalName: 'Test Co Pty Ltd',
      telephone: '+61298765432',
      email: 'hello@example.com',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '1 King Street',
        addressLocality: 'Newtown',
        addressRegion: 'NSW',
        postalCode: '2042',
        addressCountry: 'AU',
      },
      geo: { '@type': 'GeoCoordinates', latitude: -33.8978, longitude: 151.1788 },
      sameAs: ['https://www.facebook.com/testco'],
      priceRange: '$$',
    })
    const specification = business?.openingHoursSpecification as Record<string, unknown>[]
    expect(specification).toContainEqual({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '08:00',
      closes: '17:30',
    })
    // The past special day is gone; the future one is a closed (midnight to midnight) day.
    expect(specification).toContainEqual({
      '@type': 'OpeningHoursSpecification',
      opens: '00:00',
      closes: '00:00',
      validFrom: '2099-12-25',
      validThrough: '2099-12-25',
    })
    expect(JSON.stringify(specification)).not.toContain('2020-01-26')
    // The WebSite still points at the same publisher id.
    expect(website).toMatchObject({ publisher: { '@id': `${SITE_URL}/#organization` } })
  })

  test('the footer has no accessibility violations', async ({ page }) => {
    await page.goto('/')
    const { violations } = await new AxeBuilder({ page }).include('footer').analyze()
    expect(violations).toEqual([])
  })
})
