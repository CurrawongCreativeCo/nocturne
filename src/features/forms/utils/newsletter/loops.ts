import type { NewsletterProvider, ProviderOptions } from './types'

export const LOOPS_CREATE_URL = 'https://app.loops.so/api/v1/contacts/create'

interface Options extends ProviderOptions {
  apiKey: string
  /** Mailing list to add the contact to. */
  mailingListId?: string
}

/**
 * Loops sends the confirmation email from a Loop in its dashboard (README, "Newsletter signup"),
 * not from this call: the contact is created as soon as this succeeds.
 */
export function createLoopsProvider({
  apiKey,
  mailingListId,
  fetchImpl = fetch,
}: Options): NewsletterProvider {
  return {
    async subscribe(email) {
      try {
        const response = await fetchImpl(LOOPS_CREATE_URL, {
          method: 'POST',
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            email,
            source: 'website',
            ...(mailingListId && { mailingLists: { [mailingListId]: true } }),
          }),
          signal: AbortSignal.timeout(10_000),
        })
        // 409: the email is already a contact.
        if (response.ok || response.status === 409) return true
        console.error('Loops rejected a newsletter signup', response.status, await response.text())
        return false
      } catch (error) {
        console.error('Newsletter signup through Loops failed', error)
        return false
      }
    },
  }
}
