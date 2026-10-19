import { PlainText } from '@/components/ui/plain-text'
import { RichHeading } from '@/components/ui/rich-heading'
import { SanityImage } from '@/components/ui/sanity-image'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { sectionTitle } from '@/lib/sanity/section-title'

import type { SectionProps } from '../../types'

// Full class names so Tailwind's scanner sees them.
const columnClasses = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
} as const

const DEFAULTS: SectionDefaults = { container: 'max-w-content', align: 'center' }

export function FeaturesGrid({ data, isFirst }: SectionProps<'featuresGrid'>) {
  const { heading, intro, columns, items } = data
  const title = sectionTitle(data)
  const { block, text } = sectionTraits(data.style, DEFAULTS)

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      {(title || intro) && (
        <header className={`mb-16 max-w-measure-narrow ${block} ${text}`}>
          {title && (
            <RichHeading
              as="h2"
              blocks={heading}
              fallback={title}
              className="text-h2 font-semibold text-balance"
            />
          )}
          <PlainText text={intro} className="mt-4 text-lead text-pretty text-ink-muted" />
        </header>
      )}
      <ul className={`grid grid-cols-1 gap-x-8 gap-y-12 ${columnClasses[columns]}`}>
        {items.map((item) => (
          <li key={item._key}>
            <SanityImage
              image={item.icon}
              alt=""
              width={48}
              height={48}
              className="mb-4 size-12 object-contain"
            />
            <h3 className="text-lead font-semibold">{item.title}</h3>
            <PlainText text={item.text} className="mt-2 text-ink-muted" />
          </li>
        ))}
      </ul>
    </SectionFrame>
  )
}
