import { createHmac } from 'node:crypto'

import { expect, type APIRequestContext } from '@playwright/test'

import { test } from './fixtures/test'

import { SANITY_WRITE_TOKEN, SITE_URL, STRIPE_WEBHOOK_SECRET } from './constants'

/** Signs a payload the way Stripe does (https://docs.stripe.com/webhooks#verify-manually). */
function sign(body: string, { secret = STRIPE_WEBHOOK_SECRET, at = Date.now() / 1000 } = {}) {
  const timestamp = Math.floor(at)
  const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  return `t=${timestamp},v1=${digest}`
}

const event = (type: string, object: Record<string, unknown>) =>
  JSON.stringify({
    id: 'evt_e2e',
    object: 'event',
    type,
    created: Date.now() / 1000,
    data: { object },
  })

function post(request: APIRequestContext, body: string, signature?: string) {
  return request.post('/api/stripe/webhook', {
    data: body,
    headers: {
      'content-type': 'application/json',
      ...(signature && { 'stripe-signature': signature }),
    },
  })
}

interface RecordedMutations {
  authorization: string
  mutations: Record<string, Record<string, unknown>>[]
}
async function mutations(request: APIRequestContext) {
  const response = await request.get('http://localhost:9999/__fixture/mutations')
  return (await response.json()) as RecordedMutations[]
}
async function checkoutRequests(request: APIRequestContext) {
  const response = await request.get('http://localhost:9999/__fixture/stripe-requests')
  return (await response.json()) as Record<string, string>[]
}

test.describe('pricing table', () => {
  test('shows each active plan with formatted amounts, features and one highlighted plan', async ({
    page,
  }) => {
    await page.goto('/pricing')
    await expect(page.getByRole('heading', { level: 2, name: 'Choose your plan' })).toBeVisible()

    const plans = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { level: 3 }) })
    // The archived price's plan is left out.
    await expect(plans).toHaveCount(4)
    await expect(page.getByText('Retired plan')).toHaveCount(0)

    const starter = plans.filter({ has: page.getByRole('heading', { name: 'Starter' }) })
    await expect(starter).toContainText('$9')
    await expect(starter).toContainText('per month')
    await expect(starter.getByRole('listitem')).toHaveText(['One project', 'Email support'])

    // The plan name is overridden in the plan; the amount is in euros, billed yearly.
    const team = plans.filter({ has: page.getByRole('heading', { name: 'Team', exact: true }) })
    await expect(team).toContainText('€290')
    await expect(team).toContainText('per year')

    // Whole yen (a zero-decimal currency) and a price with no interval.
    const lifetime = plans.filter({ has: page.getByRole('heading', { name: 'Lifetime' }) })
    await expect(lifetime).toContainText('¥50,000')
    await expect(lifetime).toContainText('one-time')

    // "Most popular" is text, not just colour, and only one plan has it.
    await expect(page.getByText('Most popular')).toHaveCount(1)
    await expect(
      plans.filter({ has: page.getByRole('heading', { name: 'Pro' }) }).getByText('Most popular'),
    ).toBeVisible()
  })

  test('has exactly one h1 and distinct button names', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.locator('h1')).toHaveCount(1)
    const names = await page
      .getByRole('button')
      .evaluateAll((buttons) =>
        buttons.map((button) => button.textContent.trim()).filter((text) => text.includes('–')),
      )
    expect(names.sort()).toEqual(
      [
        'Get started – Lifetime',
        'Get started – Pro',
        'Get started – Team',
        'Start small – Starter',
      ].sort(),
    )
  })
})

test.describe('checkout', () => {
  for (const [plan, priceId, mode] of [
    ['Pro', 'price_Pro1', 'subscription'],
    ['Lifetime', 'price_Life1', 'payment'],
  ] as const) {
    test(`${plan} creates a ${mode} Checkout Session and sends the buyer to Stripe`, async ({
      page,
      request,
    }) => {
      await page.goto('/pricing')
      await page.getByRole('button', { name: new RegExp(`– ${plan}$`) }).click()
      await page.waitForURL('**/__stripe/checkout/**')
      await expect(page.getByRole('heading', { name: 'Fake Stripe Checkout' })).toBeVisible()

      const sent = (await checkoutRequests(request)).filter(
        (body) => body['line_items[0][price]'] === priceId,
      )
      expect(sent.length).toBeGreaterThan(0)
      for (const body of sent) {
        expect(body).toMatchObject({
          authorization: 'Bearer sk_test_e2e',
          mode,
          'line_items[0][quantity]': '1',
          // Configured in tests/e2e/constants.ts: a path, resolved against the site, with Stripe's
          // placeholder left unescaped; cancel would otherwise be the page the buyer came from.
          success_url: `${SITE_URL}/thanks?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${SITE_URL}/pricing`,
        })
      }
    })
  }

  test('refuses a price the site doesn’t sell, even if the form is tampered with', async ({
    page,
    request,
  }) => {
    await page.goto('/pricing')
    const before = (await checkoutRequests(request)).length
    // A visitor can edit the hidden field; the server must look the price up itself.
    await page
      .locator('input[name="priceId"]')
      .first()
      .evaluate((input: HTMLInputElement) => {
        input.value = 'price_Old1'
      })
    await page.getByRole('button', { name: /^Start small/ }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'no longer available' })).toBeVisible()
    expect(page.url()).toContain('/pricing')
    expect(
      (await checkoutRequests(request)).some(
        (body) => body['line_items[0][price]'] === 'price_Old1',
      ),
    ).toBe(false)
    expect((await checkoutRequests(request)).length).toBeGreaterThanOrEqual(before)
  })
})

test.describe('Stripe webhook', () => {
  test('rejects a missing, forged, tampered or replayed signature', async ({ request }) => {
    const body = event('price.created', { id: 'price_Forged1' })
    expect((await post(request, body)).status()).toBe(400)
    expect((await post(request, body, sign(body, { secret: 'whsec_wrong' }))).status()).toBe(400)
    expect((await post(request, `${body} `, sign(body))).status()).toBe(400)
    expect((await post(request, body, sign(body, { at: Date.now() / 1000 - 3600 }))).status()).toBe(
      400,
    )
    expect((await mutations(request)).flatMap((m) => m.mutations)).not.toContainEqual(
      expect.objectContaining({
        createOrReplace: expect.objectContaining({ priceId: 'price_Forged1' }),
      }),
    )
  })

  test('acknowledges events it doesn’t use without writing anything', async ({ request }) => {
    const body = event('customer.created', { id: 'cus_E2e1' })
    const response = await post(request, body, sign(body))
    expect(response.status()).toBe(200)
    expect(await response.json()).toMatchObject({ received: true })
    expect(await response.json()).toHaveProperty('ignored')
  })

  test('a price event fetches the price from Stripe and upserts it with the write token', async ({
    request,
  }, { project }) => {
    const priceId = `price_Hook${project.name}1`
    const body = event('price.created', { id: priceId, product: 'prod_Webhook1' })
    const response = await post(request, body, sign(body))
    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({ received: true, synced: [priceId] })

    const written = (await mutations(request)).find((m) =>
      m.mutations.some((mutation) => mutation.createOrReplace?.priceId === priceId),
    )
    expect(written?.authorization).toBe(`Bearer ${SANITY_WRITE_TOKEN}`)
    expect(written?.mutations).toEqual([
      {
        createOrReplace: {
          _id: `stripePrice-${priceId}`,
          _type: 'stripePrice',
          priceId,
          productId: 'prod_Webhook1',
          productName: 'Webhook plan',
          amount: 4200,
          currency: 'usd',
          interval: 'month',
          intervalCount: 1,
          active: true,
        },
      },
    ])
  })

  test('a deleted price is marked inactive rather than deleted', async ({ request }, {
    project,
  }) => {
    const priceId = `price_Gone${project.name}1`
    const body = event('price.deleted', { id: priceId })
    const response = await post(request, body, sign(body))
    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({ received: true, deactivated: priceId })

    const patches = (await mutations(request)).flatMap((m) => m.mutations).map((m) => m.patch)
    expect(patches).toContainEqual(
      expect.objectContaining({
        query: '*[_type == "stripePrice" && priceId == $value]',
        params: { value: priceId },
        set: { active: false },
      }),
    )
  })
})
