import { ContactForm } from './contact-form'
import { subscribeNewsletter } from '../api/subscribe-newsletter'
import { getNewsletterConfig } from '../utils/newsletter/config'
import { EMAIL_FIELD } from '../utils/newsletter/email-field'

interface Props {
  submitLabel: string
  successMessage: string
  /** Id of the heading above the form; names the form for screen readers. */
  headingId?: string
}

/**
 * A newsletter signup from the page builder. It reuses the contact form's UI (error summary that
 * takes focus, linked field errors, kept answers, Turnstile) with its own action, and checks the
 * environment on the server so a missing key shows a clear message instead of a form that fails.
 */
export function NewsletterView({ submitLabel, successMessage, headingId }: Props) {
  const config = getNewsletterConfig()

  if (!config.ready) {
    // Name the missing variables for developers, but don't show visitors our setup problems.
    if (process.env.NODE_ENV === 'production') {
      console.error(`The newsletter is not configured. Missing: ${config.missing.join(', ')}`)
      return (
        <p role="status" className="rounded-control bg-surface-alt p-6 text-ink-muted">
          Signing up isn’t available right now. Please try again later.
        </p>
      )
    }
    return (
      <div className="rounded-control border border-dashed border-warning bg-warning-surface p-6 text-warning-ink">
        <p className="font-semibold">This signup can’t work yet.</p>
        <p className="mt-2">
          Set <code>{config.missing.join(', ')}</code> in <code>.env.local</code> and restart the
          dev server. See “Newsletter signup” in the README.
        </p>
      </div>
    )
  }

  return (
    <ContactForm
      title="Newsletter signup"
      headingId={headingId}
      action={subscribeNewsletter}
      successMessage={successMessage}
      failureTitle="You weren’t signed up"
      submitLabel={submitLabel}
      fields={[
        {
          key: EMAIL_FIELD._key,
          label: EMAIL_FIELD.label,
          name: EMAIL_FIELD.name,
          type: EMAIL_FIELD.type,
          required: EMAIL_FIELD.required,
          options: [],
        },
      ]}
      check={
        config.testMode ? { kind: 'test' } : { kind: 'turnstile', siteKey: config.turnstileSiteKey }
      }
    />
  )
}
