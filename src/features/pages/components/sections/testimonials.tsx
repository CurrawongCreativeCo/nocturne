import { SanityImage } from '@/components/ui/sanity-image'

import type { SectionProps } from '../../types'

export function Testimonials({ data }: SectionProps<'testimonials'>) {
  const { title, items } = data

  return (
    <section className="bg-surface-alt">
      <div className="mx-auto max-w-content px-gutter py-section">
        {title && (
          <h2 className="mx-auto mb-16 max-w-measure-narrow text-center text-h2 font-semibold text-balance">
            {title}
          </h2>
        )}
        <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item._key}>
              <figure className="flex h-full flex-col rounded-card bg-surface p-8 shadow-card ring-1 ring-line">
                <blockquote className="flex-1 text-lead text-pretty text-ink">
                  “{item.quote}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-4">
                  <SanityImage
                    image={item.avatar}
                    width={48}
                    height={48}
                    className="size-12 rounded-pill object-cover"
                  />
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    {item.role && <div className="text-small text-ink-muted">{item.role}</div>}
                  </div>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
