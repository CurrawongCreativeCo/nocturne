'use server'

import { headers } from 'next/headers'

import { newsletterLimiter } from './rate-limiter'
import type { FormState } from '../types'
import { getClientIp } from '../utils/client-ip'
import { getNewsletterConfig } from '../utils/newsletter/config'
import { createProvider } from '../utils/newsletter/create-provider'
import { EMAIL_FIELD } from '../utils/newsletter/email-field'
import { TEST_TURNSTILE_TOKEN, verifyTurnstile } from '../utils/turnstile'
import { validateSubmission } from '../utils/validate'

const TURNSTILE_FIELD = 'cf-turnstile-response'

const failure = (message: string, values: Record<string, string> = {}): FormState => ({
  status: 'error',
  message,
  fieldErrors: {},
  values,
})

/**
 * Handles a newsletter signup, from `useActionState` or a plain HTML POST. Same order as
 * `submitForm`: the cheap checks first, so a bad address never spends a rate-limit slot or a
 * Turnstile token. The result never depends on whether the address was already subscribed, and the
 * success message is the section's own, rendered by the form: the server sends none.
 */
export async function subscribeNewsletter(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const config = getNewsletterConfig()
  if (!config.ready) {
    console.error(`The newsletter is not configured. Missing: ${config.missing.join(', ')}`)
    return failure('Signing up isn’t possible right now. Please try again later.')
  }

  const { values, errors } = validateSubmission([EMAIL_FIELD], formData)
  if (Object.keys(errors).length > 0) {
    return { status: 'error', fieldErrors: errors, values }
  }

  const ip = getClientIp(await headers())
  const limit = newsletterLimiter.take(ip)
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterMs / 60_000)
    return failure(
      `You’ve tried to sign up several times in a short while. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      values,
    )
  }

  const answer = formData.get(TURNSTILE_FIELD)
  const token = typeof answer === 'string' ? answer : ''
  const human = config.testMode
    ? token === TEST_TURNSTILE_TOKEN
    : await verifyTurnstile({ secret: config.turnstileSecretKey, token, ip })
  if (!human) {
    return failure(
      'We couldn’t confirm you’re not a robot. Wait for the check above the button to finish, then try again. The check needs JavaScript.',
      values,
    )
  }

  // Test mode stands in for the provider: it accepts everything and contacts no one.
  const accepted =
    config.testMode || (await createProvider(config.provider).subscribe(values.email ?? ''))
  if (!accepted) {
    return failure('We couldn’t sign you up. Please try again in a few minutes.', values)
  }

  return { status: 'success', message: '' }
}
