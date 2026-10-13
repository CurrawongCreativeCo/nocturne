import type { NewsletterProvider, ProviderOptions } from './types'

export const RESEND_CONTACTS_URL = 'https://api.resend.com/contacts'

interface Options extends ProviderOptions {
  apiKey: string
  /** Segment to add the contact to; without one the contact is only added to the account. */
  segmentId?: string
}

/** Resend has no double opt-in: the contact is subscribed as soon as this succeeds. */
export function createResendProvider({
  apiKey,
  segmentId,
  fetchImpl = fetch,
}: Options): NewsletterProvider {
  return {
    async subscribe(email) {
      try {
        const response = await fetchImpl(RESEND_CONTACTS_URL, {
          method: 'POST',
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            email,
            unsubscribed: false,
            ...(segmentId && { segments: [{ id: segmentId }] }),
          }),
          signal: AbortSignal.timeout(10_000),
        })
        // 409: the contact exists already.
        if (response.ok || response.status === 409) return true
        console.error('Resend rejected a newsletter signup', response.status, await response.text())
        return false
      } catch (error) {
        console.error('Newsletter signup through Resend failed', error)
        return false
      }
    },
  }
}
