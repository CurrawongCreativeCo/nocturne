import { createHash } from 'node:crypto'

import type { NewsletterProvider, ProviderOptions } from './types'

interface Options extends ProviderOptions {
  /** `<key>-<datacenter>`, e.g. `abc123-us21`. */
  apiKey: string
  listId: string
}

/** The datacenter is the part of the key after the last dash. */
export function mailchimpDatacenter(apiKey: string) {
  const datacenter = apiKey.split('-').at(-1)
  return apiKey.includes('-') && datacenter && /^[a-z]+\d+$/.test(datacenter)
    ? datacenter
    : undefined
}

// Mailchimp refuses these addresses for reasons that would tell the visitor about them (they
// unsubscribed, or were deleted for good), so they count as accepted.
const SILENT_REFUSALS = new Set(['Member In Compliance State', 'Forgotten Email Not Subscribable'])

/**
 * Double opt-in: a new address is added as `pending` and Mailchimp emails a confirmation link. The
 * call is an upsert (PUT), so an existing member is left exactly as they were: no error, no change.
 */
export function createMailchimpProvider({
  apiKey,
  listId,
  fetchImpl = fetch,
}: Options): NewsletterProvider {
  return {
    async subscribe(email) {
      const datacenter = mailchimpDatacenter(apiKey)
      if (!datacenter) {
        console.error('MAILCHIMP_API_KEY has no datacenter suffix (expected …-us21)')
        return false
      }
      const hash = createHash('md5').update(email.toLowerCase()).digest('hex')
      try {
        const response = await fetchImpl(
          `https://${datacenter}.api.mailchimp.com/3.0/lists/${encodeURIComponent(listId)}/members/${hash}`,
          {
            method: 'PUT',
            headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
            body: JSON.stringify({ email_address: email, status_if_new: 'pending' }),
            signal: AbortSignal.timeout(10_000),
          },
        )
        if (response.ok) return true

        const text = await response.text()
        const title = (JSON.parse(text.startsWith('{') ? text : '{}') as { title?: unknown }).title
        if (typeof title === 'string' && SILENT_REFUSALS.has(title)) return true
        console.error('Mailchimp rejected a newsletter signup', response.status, text)
        return false
      } catch (error) {
        console.error('Newsletter signup through Mailchimp failed', error)
        return false
      }
    },
  }
}
