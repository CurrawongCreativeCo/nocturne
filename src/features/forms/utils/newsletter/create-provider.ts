import type { ProviderConfig } from './config'
import { createLoopsProvider } from './loops'
import { createMailchimpProvider } from './mailchimp'
import { createResendProvider } from './resend'
import type { NewsletterProvider } from './types'

export function createProvider(config: ProviderConfig): NewsletterProvider {
  switch (config.provider) {
    case 'resend':
      return createResendProvider(config)
    case 'loops':
      return createLoopsProvider(config)
    case 'mailchimp':
      return createMailchimpProvider(config)
  }
}
