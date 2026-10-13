import type { StegaBranded } from 'next-sanity'

import type { FORM_QUERY_RESULT } from '@/types/sanity.types'

/** A form as the page renders it (drafts carry edit markers): without the private parts. */
export type FormDefinition = StegaBranded<
  Omit<NonNullable<FORM_QUERY_RESULT>, 'recipientEmail' | 'successMessage'>
>

/** A field with no edit markers, which is what validation and the email read. */
export type FormFieldDefinition = NonNullable<FORM_QUERY_RESULT>['fields'][number]

/** What the submit action returns; `useActionState` feeds it back to the form. */
export type FormState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | {
      status: 'error'
      /** Problem with the submission as a whole (spam check, rate limit, delivery), not a field. */
      message?: string
      /** Error text by field name. */
      fieldErrors: Record<string, string>
      /** What the visitor typed, so the form can show it again. Checkbox: `'on'` or `''`. */
      values: Record<string, string>
    }

export const IDLE_STATE: FormState = { status: 'idle' }
