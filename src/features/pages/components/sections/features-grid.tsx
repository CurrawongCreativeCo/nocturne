import { ItemIcon } from '@/components/ui/item-icon'
import { PlainText } from '@/components/ui/plain-text'
import { SectionFrame } from '@/components/ui/section-frame'
import { SectionHeader } from '@/components/ui/section-header'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { sectionTitle } from '@/lib/sanity/section-title'
import { resolveIconDesign } from '@/lib/sanity/surface-options'
import { resolveTextRoles } from '@/lib/sanity/text-role'

import type { SectionProps } from '../../types'

const HEADER_ROLES = ['eyebrow', 'heading', 'intro'] as const

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
  const iconDesign = resolveIconDesign(data.iconDesign)

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      <SectionHeader
        eyebrow={data.eyebrow}
        title={title}
        heading={heading}
        intro={intro}
        design={resolveTextRoles(data.headerDesign, HEADER_ROLES)}
        block={block}
        text={text}
      />
      <ul className={`grid grid-cols-1 gap-x-8 gap-y-12 ${columnClasses[columns]}`}>
        {items.map((item) => (
          <li key={item._key}>
            <ItemIcon name={item.iconName} image={item.icon} design={iconDesign} />
            <h3 className="text-lead font-semibold">{item.title}</h3>
            <PlainText text={item.text} className="mt-2 text-ink-muted" />
          </li>
        ))}
      </ul>
    </SectionFrame>
  )
}
