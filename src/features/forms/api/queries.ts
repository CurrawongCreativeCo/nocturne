import { defineQuery } from 'next-sanity'

import { formFields } from '@/lib/sanity/fragments'

/**
 * A form for the submit action only: the page's own query already carries the form's fields
 * (without the recipient), and the action can't know which page the visitor was on. This is the one
 * place `recipientEmail` is read, and its result never leaves the server.
 */
export const FORM_QUERY = defineQuery(/* groq */ `
  *[_type == "form" && _id == $id][0] {
    _id,
    ${formFields},
    successMessage,
    recipientEmail
  }
`)
