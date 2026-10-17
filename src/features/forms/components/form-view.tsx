import { stegaClean } from 'next-sanity'

import { ContactForm } from './contact-form'
import type { FormDefinition } from '../types'
import { ATTRIBUTION_FIELDS, ATTRIBUTION_SCRIPT } from '../utils/attribution'
import { getFormsConfig } from '../utils/config'
import { isEnquiryStoreRequested } from '../utils/enquiry-config'

interface Props {
  form: FormDefinition
  /** Id of the heading above the form, if the section has one; names the form for screen readers. */
  headingId?: string
}

/**
 * A form from the page builder. It checks the environment on the server so a missing key shows a
 * clear message instead of a form that fails when sent.
 */
export function FormView({ form, headingId }: Props) {
  const config = getFormsConfig()

  if (!config.ready) {
    // Name the missing variables for developers, but don't show visitors our setup problems.
    if (process.env.NODE_ENV === 'production') {
      console.error(`Forms are not configured. Missing: ${config.missing.join(', ')}`)
      return (
        <p role="status" className="rounded-control bg-surface-alt p-6 text-ink-muted">
          This form isn’t available right now. Please try again later.
        </p>
      )
    }
    return (
      <div className="rounded-control border border-dashed border-warning bg-warning-surface p-6 text-warning-ink">
        <p className="font-semibold">This form can’t send yet.</p>
        <p className="mt-2">
          Set <code>{config.missing.join(', ')}</code> in <code>.env.local</code> and restart the
          dev server. See “Forms” in the README.
        </p>
      </div>
    )
  }

  return (
    <ContactForm
      formId={form._id}
      title={form.title}
      headingId={headingId}
      submitLabel={form.submitLabel}
      // Draft mode adds invisible edit markers to strings. Names, types and choices become
      // identifiers and values here, so they must be clean; labels may keep theirs.
      fields={form.fields.map((field) => ({
        key: field._key,
        label: field.label,
        name: stegaClean(field.name),
        type: stegaClean(field.type),
        required: field.required,
        options: field.options?.map((option) => stegaClean(option)) ?? [],
      }))}
      check={
        config.testMode ? { kind: 'test' } : { kind: 'turnstile', siteKey: config.turnstileSiteKey }
      }
    >
      {/* Only worth collecting when the server will keep it (README, "Enquiries"). */}
      {isEnquiryStoreRequested() && (
        <>
          {ATTRIBUTION_FIELDS.map((name) => (
            // The script sets the value before React hydrates; that is not a mismatch.
            <input
              key={name}
              type="hidden"
              name={name}
              data-attribution={name.slice(1)}
              suppressHydrationWarning
            />
          ))}
          <script dangerouslySetInnerHTML={{ __html: ATTRIBUTION_SCRIPT }} />
        </>
      )}
    </ContactForm>
  )
}
