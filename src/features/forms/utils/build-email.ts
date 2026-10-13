import type { FormFieldDefinition } from '../types'

export interface SubmissionEmail {
  subject: string
  text: string
  html: string
  /** The visitor's address, when the form has an email field they filled in. */
  replyTo?: string
}

interface Input {
  formTitle: string
  fields: readonly FormFieldDefinition[]
  /** Validated values by field name (see `validateSubmission`). */
  values: Record<string, string>
}

/** The email for one submission, as plain text and HTML. Every visitor-supplied value is escaped. */
export function buildEmail({ formTitle, fields, values }: Input): SubmissionEmail {
  const rows = fields.map((field) => ({
    label: field.label,
    value:
      field.type === 'checkbox' ? (values[field.name] ? 'Yes' : 'No') : (values[field.name] ?? ''),
    multiline: field.type === 'textarea',
  }))

  const text = rows
    .map(({ label, value }) => `${label}:\n${value || '(not provided)'}`)
    .join('\n\n')
  const html = `<table role="presentation" cellpadding="8" style="border-collapse:collapse">${rows
    .map(
      ({ label, value, multiline }) =>
        `<tr><th align="left" valign="top" scope="row">${escapeHtml(label)}</th><td>${
          value
            ? escapeHtml(value).replaceAll('\n', multiline ? '<br>' : ' ')
            : '<em>not provided</em>'
        }</td></tr>`,
    )
    .join('')}</table>`

  const emailField = fields.find((field) => field.type === 'email' && values[field.name])
  return {
    subject: singleLine(`New submission: ${formTitle}`).slice(0, 150),
    text,
    html,
    replyTo: emailField ? values[emailField.name] : undefined,
  }
}

function singleLine(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

export function escapeHtml(text: string) {
  return text.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
  )
}
