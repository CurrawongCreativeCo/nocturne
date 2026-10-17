'use server'

import { headers } from 'next/headers'
import { after } from 'next/server'
import { stegaClean } from 'next-sanity'

import { cachedSanityFetch, PUBLISHED, TAGS } from '@/lib/sanity/live'

import { FORM_QUERY } from './queries'
import { submissionLimiter } from './rate-limiter'
import { storeEnquiry } from './store-enquiry'
import type { FormState } from '../types'
import { pathFromReferer } from '../utils/attribution'
import { buildEmail } from '../utils/build-email'
import { getClientIp } from '../utils/client-ip'
import { getFormsConfig } from '../utils/config'
import { sendEmail } from '../utils/resend'
import { TEST_TURNSTILE_TOKEN, verifyTurnstile } from '../utils/turnstile'
import { validateSubmission } from '../utils/validate'

const TURNSTILE_FIELD = 'cf-turnstile-response'
const FORM_ID_FIELD = '_formId'

const failure = (message: string): FormState => ({
  status: 'error',
  message,
  fieldErrors: {},
  values: {},
})

/**
 * Handles a form submission, from `useActionState` or a plain HTML POST. Everything the client sent
 * is untrusted: the form is fetched again from the published dataset by id, and only its fields are
 * read from the submission. Order matters: cheap checks first, so a failed field never spends a
 * Turnstile token, a rate-limit attempt or an email.
 */
export async function submitForm(_previous: FormState, formData: FormData): Promise<FormState> {
  const config = getFormsConfig()
  if (!config.ready) {
    console.error(`Forms are not configured. Missing: ${config.missing.join(', ')}`)
    return failure('This form can’t be sent right now. Please try again later.')
  }

  const formId = formData.get(FORM_ID_FIELD)
  if (typeof formId !== 'string' || !formId) return failure('This form is no longer available.')

  const { data } = await cachedSanityFetch({
    query: FORM_QUERY,
    params: { id: formId },
    ...PUBLISHED,
    tags: [TAGS.form],
  })
  if (!data) return failure('This form is no longer available.')
  // Published data has no edit markers; this tells the types so.
  const form = stegaClean(data)

  const { values, errors } = validateSubmission(form.fields, formData)
  if (Object.keys(errors).length > 0) {
    return { status: 'error', fieldErrors: errors, values }
  }

  const requestHeaders = await headers()
  const ip = getClientIp(requestHeaders)
  const limit = submissionLimiter.take(ip)
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterMs / 60_000)
    return {
      status: 'error',
      message: `You’ve sent several messages in a short time. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      fieldErrors: {},
      values,
    }
  }

  const answer = formData.get(TURNSTILE_FIELD)
  const token = typeof answer === 'string' ? answer : ''
  const human = config.testMode
    ? token === TEST_TURNSTILE_TOKEN
    : await verifyTurnstile({ secret: config.turnstileSecretKey, token, ip })
  if (!human) {
    return {
      status: 'error',
      message:
        'We couldn’t confirm you’re not a robot. Wait for the check above the button to finish, then try again. The check needs JavaScript.',
      fieldErrors: {},
      values,
    }
  }

  // Test mode stands in for Resend: it accepts everything and sends nothing.
  const sent =
    config.testMode ||
    (await sendEmail({
      apiKey: config.resendApiKey,
      from: config.fromEmail,
      to: form.recipientEmail,
      email: buildEmail({ formTitle: form.title, fields: form.fields, values }),
    }))
  if (!sent) {
    return {
      status: 'error',
      message: 'We couldn’t send your message. Please try again in a few minutes.',
      fieldErrors: {},
      values,
    }
  }

  // After the response, so a slow or failing write never delays or fails the visitor's submission.
  // `storeEnquiry` does nothing unless ENQUIRIES_STORE=1 and never throws.
  const pagePath = pathFromReferer(requestHeaders.get('referer'))
  after(() =>
    storeEnquiry({
      formId: form._id,
      formTitle: form.title,
      fields: form.fields,
      values,
      submission: formData,
      pagePath,
    }),
  )

  return { status: 'success', message: form.successMessage }
}
