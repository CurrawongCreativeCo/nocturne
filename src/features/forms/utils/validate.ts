import type { FormFieldDefinition } from '../types'

/** Anything with `get`, so a `FormData` works and tests can pass a plain `Map`. */
export interface FieldSource {
  get(name: string): unknown
}

export interface ValidationResult {
  /** Cleaned value per field, by name. Checkbox: `'on'` or `''`. Only fields in the definition. */
  values: Record<string, string>
  /** Error text per invalid field, by name. Empty when the submission is valid. */
  errors: Record<string, string>
}

const MAX_LENGTH = { text: 200, email: 254, tel: 30, textarea: 5000, select: 200 } as const
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
const LINE_BREAK = /[\r\n]/
// Deliberately loose: the only real test of an address is the email we send to it.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_CHARS = /^\+?[\d\s().-]+$/

/**
 * Validates a submission against the form's published fields. The field list is the server's, never
 * the client's: unknown inputs are ignored, and a missing one counts as empty.
 */
export function validateSubmission(
  fields: readonly FormFieldDefinition[],
  source: FieldSource,
): ValidationResult {
  const values: Record<string, string> = {}
  const errors: Record<string, string> = {}

  for (const field of fields) {
    const error = validateField(field, source.get(field.name), values)
    if (error) errors[field.name] = error
  }
  return { values, errors }
}

function validateField(
  field: FormFieldDefinition,
  input: unknown,
  values: Record<string, string>,
): string | undefined {
  const { name, label, type, required } = field

  if (type === 'checkbox') {
    const checked = input === 'on'
    values[name] = checked ? 'on' : ''
    return required && !checked ? `Tick the box for “${label}” to continue.` : undefined
  }

  // A file or anything else a hand-made request can send is not a text answer.
  if (input !== null && input !== undefined && typeof input !== 'string') {
    values[name] = ''
    return `${label} must be text.`
  }

  // Text areas keep their line breaks; everything is trimmed.
  const value = (input ?? '').replace(/\r\n?/g, '\n').trim()
  values[name] = value

  if (value === '') return required ? `${label} is required.` : undefined
  if (value.length > MAX_LENGTH[type]) {
    return `${label} must be ${MAX_LENGTH[type]} characters or fewer.`
  }
  if (CONTROL_CHARS.test(value)) return `${label} contains characters that aren’t allowed.`
  if (type !== 'textarea' && LINE_BREAK.test(value)) return `${label} must be a single line.`

  switch (type) {
    case 'email':
      return EMAIL.test(value)
        ? undefined
        : `${label} must be an email address, like name@example.com.`
    case 'tel': {
      const digits = value.replace(/\D/g, '').length
      return PHONE_CHARS.test(value) && digits >= 5 && digits <= 15
        ? undefined
        : `${label} must be a phone number, like +61 400 000 000.`
    }
    case 'select':
      return field.options?.includes(value) ? undefined : `Choose one of the options for ${label}.`
    default:
      return undefined
  }
}
