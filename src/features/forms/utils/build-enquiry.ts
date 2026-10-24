import { cleanAttribution } from './attribution'
import type { FieldSource } from './validate'
import type { FormFieldDefinition } from '../types'

export const ENQUIRY_STATUSES = ['new', 'read', 'archived'] as const

export interface EnquiryDocument {
  _id: string
  _type: 'enquiry'
  /** Weak, so a form can still be deleted while its enquiries are kept. */
  form: { _type: 'reference'; _ref: string; _weak: true }
  /** The form's title when it was sent: still readable after the form is renamed or deleted. */
  formTitle: string
  fields: { _key: string; label: string; value: string }[]
  pagePath?: string
  createdAt: string
  status: (typeof ENQUIRY_STATUSES)[number]
  attribution?: {
    landing?: string
    referrer?: string
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
    utmTerm?: string
    utmContent?: string
  }
}

interface Input {
  /** A fresh id, e.g. from `crypto.randomUUID()`. */
  id: string
  formId: string
  formTitle: string
  fields: readonly FormFieldDefinition[]
  /** Validated values by field name (see `validateSubmission`). */
  values: Record<string, string>
  submission: FieldSource
  pagePath?: string
  now: Date
}

/**
 * The `enquiry` document for one accepted submission. Pure: it reads the validated values, never
 * the raw request, except for the attribution inputs, which `cleanAttribution` cleans.
 */
export function buildEnquiry({
  id,
  formId,
  formTitle,
  fields,
  values,
  submission,
  pagePath,
  now,
}: Input): EnquiryDocument {
  const attribution = cleanAttribution(submission)
  const stored = {
    landing: attribution._landing,
    referrer: attribution._referrer,
    utmSource: attribution._utm_source,
    utmMedium: attribution._utm_medium,
    utmCampaign: attribution._utm_campaign,
    utmTerm: attribution._utm_term,
    utmContent: attribution._utm_content,
  }
  const hasAttribution = Object.values(stored).some(Boolean)

  return {
    _id: `enquiry-${id}`,
    _type: 'enquiry',
    form: { _type: 'reference', _ref: formId, _weak: true },
    formTitle,
    fields: fields.map((field) => ({
      _key: field._key,
      label: field.label,
      // Same wording as the email.
      value:
        field.type === 'checkbox'
          ? values[field.name]
            ? 'Yes'
            : 'No'
          : (values[field.name] ?? ''),
    })),
    ...(pagePath && { pagePath }),
    createdAt: now.toISOString(),
    status: 'new',
    ...(hasAttribution && {
      attribution: Object.fromEntries(Object.entries(stored).filter(([, value]) => value)),
    }),
  }
}
