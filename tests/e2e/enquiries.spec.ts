import { expect, type APIRequestContext, type Page, type TestInfo } from '@playwright/test'

import {
  APP_PORT,
  APP_PORT_ENQUIRIES_OFF,
  FAKE_SANITY_PORT,
  REJECTED_CONSENT,
  SANITY_WRITE_TOKEN,
} from './constants'
import { test } from './fixtures/test'
import { waitForHydration } from './hydration'

/**
 * Stored enquiries (README, "Enquiries"). The main server runs with ENQUIRIES_STORE=1 and a second
 * one, on the same build, with it off. Writes land in the fake Content Lake, which lists them at
 * GET /__fixture/mutations (the same way the Stripe webhook tests read theirs).
 */

interface Recorded {
  authorization?: string
  mutations: { create?: Record<string, unknown> }[]
}

/** Each test sends from its own made-up address: the action rate-limits by IP (see forms.spec.ts). */
function fakeIp({ project, title }: TestInfo) {
  let hash = 0
  for (const char of `${project.name}:${title}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return `10.${(hash >>> 16) & 255}.${(hash >>> 8) & 255}.${hash & 255}`
}

test.beforeEach(async ({ context }, testInfo) => {
  await context.setExtraHTTPHeaders({ 'x-forwarded-for': fakeIp(testInfo) })
})

/** A name no other test (or run) uses, to find this test's write among everyone's. */
const uniqueName = (testInfo: TestInfo) =>
  `Enquirer ${testInfo.project.name} ${testInfo.workerIndex} ${Date.now()}`

async function send(page: Page, url: string, name: string, referer?: string) {
  // The second server's origin hasn't stored a consent choice, so its banner would sit over the form.
  await page.addInitScript((value) => {
    try {
      localStorage.setItem('consent', value)
    } catch {
      // Storage blocked: nothing to remember.
    }
  }, REJECTED_CONSENT)
  await page.goto(url, { referer })
  await waitForHydration(page.getByLabel('Your name'))
  await page.getByLabel('Your name').fill(name)
  await page.getByLabel('Email address').fill('ann@example.com')
  await page.getByLabel('Topic').selectOption('Support')
  await page.getByLabel('Message').fill('Hello there.')
  await page.getByLabel('I agree to be contacted').check()
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'We will reply within two days' }),
  ).toBeVisible()
}

async function enquiriesNamed(request: APIRequestContext, name: string) {
  const response = await request.get(`http://localhost:${FAKE_SANITY_PORT}/__fixture/mutations`)
  const recorded = (await response.json()) as Recorded[]
  return recorded.flatMap(({ authorization, mutations }) =>
    mutations.flatMap(({ create }) =>
      create?._type === 'enquiry' && JSON.stringify(create.fields).includes(name)
        ? [{ authorization, enquiry: create }]
        : [],
    ),
  )
}

/** The one enquiry written for `name`, once it has been. */
async function storedEnquiry(request: APIRequestContext, name: string) {
  await expect.poll(async () => (await enquiriesNamed(request, name)).length).toBe(1)
  const [found] = await enquiriesNamed(request, name)
  if (!found) throw new Error(`No enquiry was written for ${name}`)
  return found
}

test.describe('with ENQUIRIES_STORE=1', () => {
  test('a send writes an enquiry with the answers, page and attribution', async ({
    page,
    request,
  }, testInfo) => {
    const name = uniqueName(testInfo)
    await send(
      page,
      `http://localhost:${APP_PORT}/contact?utm_source=e2e-news&utm_medium=email&utm_term=`,
      name,
      'https://www.google.com/search?q=private+words',
    )

    const { authorization, enquiry } = await storedEnquiry(request, name)

    expect(authorization).toBe(`Bearer ${SANITY_WRITE_TOKEN}`)
    expect(enquiry).toMatchObject({
      _type: 'enquiry',
      form: { _type: 'reference', _ref: 'form-contact', _weak: true },
      formTitle: 'Contact form',
      pagePath: '/contact',
      status: 'new',
      fields: [
        expect.objectContaining({ label: 'Your name', value: name }),
        expect.objectContaining({ label: 'Email address', value: 'ann@example.com' }),
        expect.objectContaining({ label: 'Phone number', value: '' }),
        expect.objectContaining({ label: 'Topic', value: 'Support' }),
        expect.objectContaining({ label: 'Message', value: 'Hello there.' }),
        expect.objectContaining({ label: 'I agree to be contacted', value: 'Yes' }),
        expect.objectContaining({ label: 'Send me the newsletter', value: 'No' }),
      ],
      // The referrer loses its query string; empty UTM values are left out.
      attribution: {
        referrer: 'https://www.google.com/search',
        utmSource: 'e2e-news',
        utmMedium: 'email',
      },
    })
    expect(String(enquiry._id)).toMatch(/^enquiry-[0-9a-f-]{36}$/)
    expect(new Date(String(enquiry.createdAt)).toISOString()).toBe(enquiry.createdAt)
  })

  test('a send with no referrer or campaign stores no attribution', async ({
    page,
    request,
  }, testInfo) => {
    const name = uniqueName(testInfo)
    await send(page, `http://localhost:${APP_PORT}/contact`, name)

    const { enquiry } = await storedEnquiry(request, name)
    expect(enquiry).not.toHaveProperty('attribution')
  })

  test('a submission that fails validation stores nothing', async ({ page, request }, testInfo) => {
    const name = uniqueName(testInfo)
    await page.goto('/contact')
    await page.getByLabel('Your name').fill(name)
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.getByRole('alert', { name: /Please fix/ })).toBeVisible()
    // Nothing is sent until the form is valid, so there is nothing to wait for: look once, a moment later.
    await page.waitForTimeout(500)
    expect(await enquiriesNamed(request, name)).toEqual([])
  })
})

test.describe('with ENQUIRIES_STORE off', () => {
  test('a send is emailed but writes no enquiry', async ({ page, request }, testInfo) => {
    const offName = `${uniqueName(testInfo)} off`
    const onName = `${uniqueName(testInfo)} on`

    await send(page, `http://localhost:${APP_PORT_ENQUIRIES_OFF}/contact`, offName)

    // The write, when there is one, runs just after the response. Send again to the server that
    // stores, and wait for that write: by then the first would have landed if it were going to.
    await send(page, `http://localhost:${APP_PORT}/contact`, onName)
    await storedEnquiry(request, onName)

    expect(await enquiriesNamed(request, offName)).toEqual([])
  })
})
