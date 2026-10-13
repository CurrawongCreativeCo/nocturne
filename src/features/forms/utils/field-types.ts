/** Input types an editor can pick for a form field. The order is the order in Studio's menu. */
export const FIELD_TYPES = [
  { title: 'Short text', value: 'text' },
  { title: 'Email address', value: 'email' },
  { title: 'Phone number', value: 'tel' },
  { title: 'Long text', value: 'textarea' },
  { title: 'Drop-down list', value: 'select' },
  { title: 'Checkbox', value: 'checkbox' },
] as const

export type FieldType = (typeof FIELD_TYPES)[number]['value']

/** Field names become input names and email labels: a letter first, then letters, digits or `_`. */
export const FIELD_NAME_PATTERN = /^[a-z][a-zA-Z0-9_]*$/
