import { useId } from 'react'

import type { SectionProps } from '../../types'

/** A heading and intro around a signup form. The form itself comes from the route (`renderNewsletter`). */
export function NewsletterSignup({ data, renderNewsletter }: SectionProps<'newsletterSignup'>) {
  const { title, text, submitLabel, successMessage } = data
  const headingId = useId()

  return (
    <section className="mx-auto max-w-measure-narrow px-gutter py-section">
      <header className="mb-10">
        <h2 id={headingId} className="text-h2 font-semibold text-balance">
          {title}
        </h2>
        {text && <p className="mt-4 text-lead text-pretty text-ink-muted">{text}</p>}
      </header>
      {renderNewsletter?.({ submitLabel, successMessage, headingId })}
    </section>
  )
}
