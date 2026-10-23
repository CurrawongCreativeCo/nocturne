import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

import { SITE_URL } from './constants'
import { eventDates } from './fixtures/dataset.mjs'

/**
 * Events: the Events section, event pages, the add-to-calendar files and the calendar feed (README,
 * "Events"). The fixtures (tests/e2e/fixtures/dataset.mjs) are dated from the day the suite runs:
 * two past events that must be hidden, and coming up a weekly club (one Tuesday skipped), a
 * workshop, a sold-out supper, a cancelled concert, an online talk and an all-day open day. The
 * gallery's four events are in 2099. `/events` is a CMS page with three Events sections.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const section = (page: Page, heading: string) =>
  page.locator('section', { has: page.getByRole('heading', { level: 2, name: heading }) })

const jsonLd = (page: Page) =>
  page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts.map((script) => JSON.parse(script.textContent) as Record<string, unknown>),
    )

/** The parts of the Event structured data the tests read. */
interface EventLd {
  startDate: string
  endDate: string
  eventStatus: string
  eventAttendanceMode: string
  location: { address: string }
  offers: { availability: string }
  organizer: unknown
}

async function eventJsonLd(page: Page) {
  const found = (await jsonLd(page)).find((data) => data['@type'] === 'Event')
  expect(found, 'an Event in the page’s JSON-LD').toBeTruthy()
  return found as unknown as EventLd
}

/** The headings in a section, once its list has streamed in. */
async function titlesIn(scope: Locator, level = 3) {
  await scope.getByRole('heading', { level }).first().waitFor()
  return scope.getByRole('heading', { level }).allTextContents()
}

const OFFSET_TIME = /^\d{4}-\d{2}-\d{2}T1[01]:00:00\+1[01]:00$/

test.describe('the Events section', () => {
  test('lists what is coming up, soonest first, under one <h1>', async ({ page }) => {
    await page.goto('/events')
    await expect(page.locator('#main-content h1')).toHaveText('What’s on')
    expect(await titlesIn(section(page, 'Coming up'))).toEqual([
      'Weekly pottery club',
      'Pottery workshop',
      'Sold-out supper night',
      'Cancelled courtyard concert',
      'Online talk: firing schedules',
      'Spring open day',
      // The section gallery's events, in 2099.
      'Hand-building workshop',
      'Evening glazing session',
      'Open studio day',
      'Glaze chemistry talk',
    ])
  })

  test('hides past events', async ({ page }) => {
    await page.goto('/events')
    await expect(page.getByText('Past open day')).toHaveCount(0)
    await expect(page.getByText('Past winter fair')).toHaveCount(0)
  })

  test('shows only dates still to come', async ({ page }) => {
    await page.goto('/events')
    // evaluateAll doesn't wait, so wait for the list to be there before reading it.
    await expect(section(page, 'Coming up').locator('time').first()).toBeVisible()
    const dates = await section(page, 'Coming up')
      .locator('time')
      .evaluateAll((times) => times.map((time) => time.getAttribute('datetime') ?? ''))
    expect(dates.length).toBeGreaterThan(5)
    // An event under way (the club's session today) may have started up to a few hours ago.
    for (const date of dates) expect(Date.parse(date)).toBeGreaterThan(Date.now() - 6 * 3_600_000)
  })

  test('shows a repeating event once, at its next date', async ({ page }) => {
    await page.goto('/events')
    const row = section(page, 'Coming up')
      .getByRole('listitem')
      .filter({ hasText: 'Weekly pottery club' })
    await expect(row).toHaveCount(1)
    await expect(row).toContainText('Every week')
    await expect(row.locator('time')).toContainText(/^Tue /)
  })

  test('labels cancelled and sold-out events, and links each to its page', async ({ page }) => {
    await page.goto('/events')
    const coming = section(page, 'Coming up')
    await expect(
      coming.getByRole('listitem').filter({ hasText: 'Cancelled courtyard concert' }),
    ).toContainText('Cancelled')
    await expect(
      coming.getByRole('listitem').filter({ hasText: 'Sold-out supper night' }),
    ).toContainText('Sold out')
    // One link per event: the title's link stretches over the row.
    await expect(coming.getByRole('link', { name: 'Pottery workshop' })).toHaveAttribute(
      'href',
      '/events/pottery-workshop',
    )
    await coming.getByRole('link', { name: 'Pottery workshop' }).click()
    await expect(page).toHaveURL('/events/pottery-workshop')
  })

  test('shows venue, summary and category on a row', async ({ page }) => {
    await page.goto('/events')
    const row = section(page, 'Coming up')
      .getByRole('listitem')
      .filter({ hasText: 'Online talk: firing schedules' })
    await expect(row).toContainText('Online')
    await expect(row).toContainText('How long, how hot and why')
    await expect(row).toContainText('Talk')
  })

  test('ends with the "See all events" link and the calendar feed link', async ({ page }) => {
    await page.goto('/events')
    const coming = section(page, 'Coming up')
    await expect(coming.getByRole('link', { name: 'See everything' })).toHaveAttribute(
      'href',
      'https://example.com/everything',
    )
    await expect(coming.getByRole('link', { name: 'Subscribe to the calendar' })).toHaveAttribute(
      'href',
      '/events/feed.ics',
    )
    // A section filtered to one category doesn't offer the feed, which lists them all.
    await expect(page.getByRole('link', { name: 'Subscribe to the calendar' })).toHaveCount(1)
  })

  test('the agenda groups dates by day, shows each date of a series and skips the skipped day', async ({
    page,
  }) => {
    await page.goto('/events')
    const classes = section(page, 'Classes')
    // The agenda streams in per request: wait for its first day.
    const dayHeadings = classes.getByRole('heading', { level: 3 })
    await dayHeadings.first().waitFor()
    const days = await dayHeadings
      .locator('time')
      .evaluateAll((times) => times.map((time) => time.getAttribute('datetime') ?? ''))
    // The club's Tuesdays, without the skipped one, plus the workshop and the supper night.
    const clubDays = days.filter((day) => eventDates.club.includes(day))
    expect(clubDays.length).toBeGreaterThanOrEqual(5)
    // Another class may fall on the skipped Tuesday, so look for the club itself on that day.
    const skippedDay = classes.getByRole('listitem').filter({
      has: page.locator(`time[datetime="${eventDates.skipped}"]`),
    })
    await expect(skippedDay.getByText('Weekly pottery club')).toHaveCount(0)
    expect(days).toEqual([...days].sort())
    expect(new Set(days).size).toBe(days.length)
    await expect(
      classes.getByRole('heading', { level: 4, name: 'Weekly pottery club' }).first(),
    ).toBeVisible()
    await expect(classes.getByText('Past open day')).toHaveCount(0)
    // Times sit in a column beside each entry.
    await expect(classes.getByText('All day')).toHaveCount(0)
    await expect(
      classes.getByText(/\d{1,2}:\d{2} (am|pm) – \d{1,2}:\d{2} (am|pm)/).first(),
    ).toBeVisible()
  })

  test('featured shows the next event large and the rest beside it', async ({ page }) => {
    await page.goto('/events')
    const talks = section(page, 'Talks')
    expect(await titlesIn(talks)).toEqual([
      'Cancelled courtyard concert',
      'Online talk: firing schedules',
    ])
    await expect(talks.locator('article')).toContainText('Cancelled courtyard concert')
    await expect(talks.locator('article')).toContainText('Cancelled')
  })

  test('says so when nothing is coming up', async ({ page }) => {
    await page.goto('/quiet-events')
    await expect(page.locator('#main-content h1')).toHaveText('Quiet events')
    await expect(page.getByText('No upcoming events right now. Check back soon.')).toBeVisible()
  })

  test('the section gallery has the three layouts, and they pass axe', async ({ page }) => {
    await page.goto('/section-gallery')
    for (const id of ['events-list', 'events-agenda', 'events-featured']) {
      const gallery = page.locator(`[data-gallery-section="${id}"]`)
      await expect(gallery.getByRole('heading', { level: 2, name: 'What’s on' })).toBeVisible()
      await expect(gallery.getByText('Hand-building workshop')).toBeVisible()
      const { violations } = await new AxeBuilder({ page })
        .include(`[data-gallery-section="${id}"]`)
        .withTags(WCAG)
        .analyze()
      expect(violations.map(({ id: rule }) => rule)).toEqual([])
    }
  })
})

test.describe('an event page', () => {
  test('shows the event under one <h1>, with its details', async ({ page }) => {
    await page.goto('/events/pottery-workshop')
    await expect(page.locator('#main-content h1')).toHaveText('Pottery workshop')
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.getByText('A relaxed morning on the wheel')).toBeVisible()
    await expect(page.getByText('Bring an apron; we provide the clay and the tea.')).toBeVisible()
    const details = page.getByRole('complementary', { name: 'Event details' })
    await expect(details).toContainText('The Studio')
    await expect(details).toContainText('Newtown NSW 2042')
    await expect(details).toContainText('Limited to 12 people')
    await expect(details).toContainText(/\d{1,2}:00 am – \d{1,2}:00 (am|pm)/)
    await expect(details.getByRole('link', { name: 'Get directions' })).toHaveAttribute(
      'href',
      /^https:\/\/www\.google\.com\/maps\/search\/\?/,
    )
    await expect(details.getByRole('link', { name: 'Book a place' })).toHaveAttribute(
      'href',
      'https://tickets.example.com/pottery',
    )
  })

  test('describes itself as an Event in structured data', async ({ page }) => {
    await page.goto('/events/pottery-workshop')
    const event = await eventJsonLd(page)
    expect(event).toMatchObject({
      '@context': 'https://schema.org',
      name: 'Pottery workshop',
      url: `${SITE_URL}/events/pottery-workshop`,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: 'The Studio' },
      offers: {
        '@type': 'Offer',
        url: 'https://tickets.example.com/pottery',
        availability: 'https://schema.org/InStock',
      },
    })
    // Local time with its offset: 10 or 11 am, +10:00 or +11:00 depending on daylight saving.
    expect(event.startDate).toMatch(OFFSET_TIME)
    expect(event.endDate).toMatch(/^\d{4}-\d{2}-\d{2}T1[23]:00:00\+1[01]:00$/)
    expect(event.location.address).toBe('12 Rose St, Newtown NSW 2042')
    expect(event.organizer).toEqual({ '@id': `${SITE_URL}/#organization` })
  })

  test('has a canonical address and a branded share image', async ({ page, request }) => {
    await page.goto('/events/pottery-workshop')
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(
      `${SITE_URL}/events/pottery-workshop`,
    )
    expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe(
      `${SITE_URL}/api/og/events/pottery-workshop`,
    )
    expect(await page.title()).toBe('Pottery workshop | Test Co')
    const image = await request.get('/api/og/events/pottery-workshop')
    expect(image.status()).toBe(200)
    expect(image.headers()['content-type']).toBe('image/png')
    expect((await request.get('/api/og/events/no-such-event')).status()).toBe(404)
  })

  test('offers Google, Outlook and a calendar file', async ({ page }) => {
    await page.goto('/events/pottery-workshop')
    const calendar = page.getByRole('region', { name: 'Add to calendar' })
    const google = new URL(
      (await calendar.getByRole('link', { name: /Add to Google Calendar/ }).getAttribute('href')) ??
        '',
    )
    expect(google.origin + google.pathname).toBe('https://calendar.google.com/calendar/render')
    expect(google.searchParams.get('text')).toBe('Pottery workshop')
    expect(google.searchParams.get('location')).toBe('The Studio, 12 Rose St, Newtown NSW 2042')
    expect(google.searchParams.get('dates')).toMatch(/^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/)
    expect(google.searchParams.get('ctz')).toBe('Australia/Sydney')
    const outlook = new URL(
      (await calendar.getByRole('link', { name: /Add to Outlook/ }).getAttribute('href')) ?? '',
    )
    expect(outlook.origin + outlook.pathname).toBe(
      'https://outlook.live.com/calendar/0/deeplink/compose',
    )
    expect(outlook.searchParams.get('subject')).toBe('Pottery workshop')
    await expect(calendar.getByRole('link', { name: /\.ics/ })).toHaveAttribute(
      'href',
      '/events/pottery-workshop.ics',
    )
  })

  test('a cancelled event says so, has no offer and no calendar links', async ({ page }) => {
    await page.goto('/events/cancelled-concert')
    await expect(page.getByRole('status')).toHaveText('This event has been cancelled.')
    await expect(page.getByRole('link', { name: 'Get tickets' })).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Add to calendar' })).toHaveCount(0)
    const event = await eventJsonLd(page)
    expect(event.eventStatus).toBe('https://schema.org/EventCancelled')
    expect(event).not.toHaveProperty('offers')
  })

  test('a sold-out event says so and keeps no button, with its offer marked SoldOut', async ({
    page,
  }) => {
    await page.goto('/events/sold-out-dinner')
    await expect(page.getByText('This event is sold out.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Buy tickets' })).toHaveCount(0)
    const event = await eventJsonLd(page)
    expect(event.eventStatus).toBe('https://schema.org/EventScheduled')
    expect(event.offers.availability).toBe('https://schema.org/SoldOut')
  })

  test('an online event shows how to join', async ({ page }) => {
    await page.goto('/events/online-talk')
    const details = page.getByRole('complementary', { name: 'Event details' })
    await expect(details).toContainText('Online')
    await expect(details.getByRole('link', { name: 'Link to join' })).toHaveAttribute(
      'href',
      'https://meet.example.com/firing',
    )
    const event = await eventJsonLd(page)
    expect(event.eventAttendanceMode).toBe('https://schema.org/OnlineEventAttendanceMode')
    expect(event.location).toEqual({
      '@type': 'VirtualLocation',
      url: 'https://meet.example.com/firing',
    })
  })

  test('an all-day event shows dates without times', async ({ page }) => {
    await page.goto('/events/open-day')
    const details = page.getByRole('complementary', { name: 'Event details' })
    await expect(details.locator('time').first()).not.toContainText(/\d:\d{2}/)
    const event = await eventJsonLd(page)
    expect(event.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(event.endDate).toBe(event.startDate)
  })

  test('a repeating event shows its next dates, not the skipped one', async ({ page }) => {
    await page.goto('/events/weekly-pottery-club')
    const details = page.getByRole('complementary', { name: 'Event details' })
    await expect(details.getByText('Next date')).toBeVisible()
    await expect(details).toContainText('Every week')
    await expect(details).toContainText('Coming up')
    // Each date is an instant; the club meets at 10 or 11 am Sydney time, so eleven hours on lands on
    // the same Sydney day whichever side of daylight saving it falls (23:00 UTC the day before, or 00:00).
    const dates = await details
      .getByRole('list')
      .first()
      .locator('time')
      .evaluateAll((times) =>
        times.map((time) =>
          new Date(Date.parse(time.getAttribute('datetime') ?? '') + 11 * 3_600_000)
            .toISOString()
            .slice(0, 10),
        ),
      )
    expect(dates.length).toBeGreaterThanOrEqual(3)
    expect(dates).not.toContain(eventDates.skipped)
    for (const date of dates) expect(eventDates.club).toContain(date)
    // The structured data describes the next date, not the day the series began.
    const event = await eventJsonLd(page)
    expect(event.startDate.slice(0, 10)).toBe(dates[0])
  })

  test('answers 404 for an unknown event and for the feed’s name', async ({ request }) => {
    expect((await request.get('/events/no-such-event')).status()).toBe(404)
    expect((await request.get('/events/feed')).status()).toBe(404)
  })

  test('is in the sitemap, with the other events but not the events page’s own address twice', async ({
    request,
  }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text()
    for (const slug of ['pottery-workshop', 'weekly-pottery-club', 'past-open-day']) {
      expect(sitemap).toContain(`<loc>${SITE_URL}/events/${slug}</loc>`)
    }
    // /events is a CMS page, listed with the others.
    expect(sitemap).toContain(`<loc>${SITE_URL}/events</loc>`)
  })
})

test.describe('calendar files', () => {
  test('an event downloads as a calendar file', async ({ request }) => {
    const response = await request.get('/events/pottery-workshop.ics')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('text/calendar; charset=utf-8')
    expect(response.headers()['content-disposition']).toBe(
      'attachment; filename="pottery-workshop.ics"',
    )
    const body = await response.text()
    const lines = body.split('\r\n')
    expect(lines[0]).toBe('BEGIN:VCALENDAR')
    expect(lines.at(-2)).toBe('END:VCALENDAR')
    expect(lines).toContain('VERSION:2.0')
    expect(lines).toContain('SUMMARY:Pottery workshop')
    expect(lines).toContain('URL:https://example.com/events/pottery-workshop')
    // Commas in the address are escaped.
    expect(lines).toContain('LOCATION:The Studio\\, 12 Rose St\\, Newtown NSW 2042')
    expect(lines).toContain('STATUS:CONFIRMED')
    expect(
      lines.some((line) => /^DTSTART;TZID=Australia\/Sydney:\d{8}T1[01]0000$/.test(line)),
    ).toBe(true)
    expect(lines.some((line) => /^DTEND;TZID=Australia\/Sydney:\d{8}T1[23]0000$/.test(line))).toBe(
      true,
    )
    // The time zone is defined, so any app shows 10 am as 10 am.
    expect(lines).toContain('BEGIN:VTIMEZONE')
    expect(lines).toContain('TZID:Australia/Sydney')
    expect(body).toContain('BEGIN:DAYLIGHT')
    // No line is longer than 75 bytes.
    for (const line of lines) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75)
  })

  test('a repeating event is one entry with a repeat rule and its skipped day', async ({
    request,
  }) => {
    const lines = (await (await request.get('/events/weekly-pottery-club.ics')).text()).split(
      '\r\n',
    )
    expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(1)
    const until = eventDates.until.replaceAll('-', '')
    expect(lines.some((line) => line.startsWith(`RRULE:FREQ=WEEKLY;BYDAY=TU;UNTIL=${until}`))).toBe(
      true,
    )
    const skipped = eventDates.skipped.replaceAll('-', '')
    expect(
      lines.some((line) =>
        new RegExp(`^EXDATE;TZID=Australia/Sydney:${skipped}T1[01]0000$`).test(line),
      ),
    ).toBe(true)
  })

  test('a cancelled event is marked cancelled and an all-day one is written as dates', async ({
    request,
  }) => {
    expect(await (await request.get('/events/cancelled-concert.ics')).text()).toContain(
      'STATUS:CANCELLED',
    )
    const lines = (await (await request.get('/events/open-day.ics')).text()).split('\r\n')
    expect(lines.some((line) => /^DTSTART;VALUE=DATE:\d{8}$/.test(line))).toBe(true)
    expect(lines.some((line) => /^DTEND;VALUE=DATE:\d{8}$/.test(line))).toBe(true)
    expect(lines).not.toContain('BEGIN:VTIMEZONE')
  })

  test('an unknown event has no file', async ({ request }) => {
    expect((await request.get('/events/no-such-event.ics')).status()).toBe(404)
  })

  test('the feed lists every upcoming event and none that have finished', async ({ request }) => {
    const response = await request.get('/events/feed.ics')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('text/calendar; charset=utf-8')
    const body = await response.text()
    const lines = body.split('\r\n')
    expect(lines).toContain('X-WR-CALNAME:Test Co events')
    for (const title of [
      'Weekly pottery club',
      'Pottery workshop',
      'Sold-out supper night',
      'Cancelled courtyard concert',
      'Online talk: firing schedules',
      'Spring open day',
      'Hand-building workshop',
    ]) {
      expect(
        lines.some((line) => line === `SUMMARY:${title.replace(/,/g, '\\,')}`),
        title,
      ).toBe(true)
    }
    expect(body).not.toContain('Past open day')
    expect(body).not.toContain('Past winter fair')
    // Six on the page's side, four from the gallery.
    expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(10)
    // One definition of the zone for all of them.
    expect(lines.filter((line) => line === 'BEGIN:VTIMEZONE')).toHaveLength(1)
    expect(lines).toContain('STATUS:CANCELLED')
    for (const line of lines) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75)
  })
})

test.describe('accessibility', () => {
  // /events and /events/pottery-workshop are in accessibility.spec.ts.
  for (const path of [
    '/events/cancelled-concert',
    '/events/sold-out-dinner',
    '/events/online-talk',
    '/events/open-day',
    '/events/weekly-pottery-club',
    '/quiet-events',
  ]) {
    test(`no WCAG 2.2 AA violations on ${path}`, async ({ page }) => {
      await page.goto(path)
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
      expect(
        violations.map(
          ({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`,
        ),
      ).toEqual([])
    })
  }

  test('every link and the calendar controls are reachable by keyboard', async ({ page }) => {
    await page.goto('/events/pottery-workshop')
    const calendar = page.getByRole('region', { name: 'Add to calendar' })
    await calendar.getByRole('link', { name: /Add to Google Calendar/ }).focus()
    await expect(calendar.getByRole('link', { name: /Add to Google Calendar/ })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(calendar.getByRole('link', { name: /Add to Outlook/ })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(calendar.getByRole('link', { name: /\.ics/ })).toBeFocused()
  })
})
