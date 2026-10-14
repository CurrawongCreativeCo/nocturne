import { SanityImage } from '@/components/ui/sanity-image'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'

import type { SectionProps } from '../../types'

const DEFAULTS: SectionDefaults = { tone: 'alt', container: 'max-w-content', align: 'center' }

export function Testimonials({ data, isFirst }: SectionProps<'testimonials'>) {
  const { title, items } = data
  const { block, text } = sectionTraits(data.style, DEFAULTS)

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      {title && (
        <h2
          className={`mb-16 max-w-measure-narrow text-h2 font-semibold text-balance ${block} ${text}`}
        >
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
    </SectionFrame>
  )
}
