import { useId } from 'react'

import type { SectionProps } from '../../types'

/** A heading and intro around a signup form. The form itself comes from the route (`renderNewsletter`). */
export function NewsletterSignup({ data, renderNewsletter }: SectionProps<'newsletterSignup'>) {
  const { title, text, submitLabel, successMessage } = data
  const headingId = useId()

  return (
    <section className="mx-auto max-w-2xl px-6 py-24">
      <header className="mb-10">
        <h2
          id={headingId}
          className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
        >
          {title}
        </h2>
        {text && <p className="mt-4 text-lg text-pretty text-gray-600">{text}</p>}
      </header>
      {renderNewsletter?.({ submitLabel, successMessage, headingId })}
    </section>
  )
}
