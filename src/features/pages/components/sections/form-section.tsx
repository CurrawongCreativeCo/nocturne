import { useId } from 'react'

import type { SectionProps } from '../../types'

/** A heading and intro around a form. The form itself comes from the route (`renderForm`). */
export function FormSection({ data, renderForm }: SectionProps<'formSection'>) {
  const { title, text, form } = data
  const headingId = useId()

  // The reference points at a deleted form: skip the gap rather than show a broken one. (Typegen
  // can't know a reference dangles, so it types `form` as always present.)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!form) return null

  return (
    <section className="mx-auto max-w-2xl px-6 py-24">
      {(title || text) && (
        <header className="mb-10">
          {title && (
            <h2
              id={headingId}
              className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
            >
              {title}
            </h2>
          )}
          {text && <p className="mt-4 text-lg text-pretty text-gray-600">{text}</p>}
        </header>
      )}
      {renderForm?.(form, title ? headingId : undefined)}
    </section>
  )
}
