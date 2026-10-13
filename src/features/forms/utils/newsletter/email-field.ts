import type { FormFieldDefinition } from '../../types'

/** The signup's only field, checked by the same rules as a form's email field (`validateSubmission`). */
export const EMAIL_FIELD: FormFieldDefinition = {
  _key: 'email',
  label: 'Email address',
  name: 'email',
  type: 'email',
  required: true,
  options: null,
}
