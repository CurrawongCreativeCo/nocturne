import { CardSurface } from '@/components/ui/card-surface'
import { SectionFrame } from '@/components/ui/section-frame'
import { SectionHeader } from '@/components/ui/section-header'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { StatFigure } from '@/components/ui/stat-figure'
import { resolveCardDesign } from '@/lib/sanity/card-design'
import { CARD_SHADOW_CLASS, OWN_SHADOW, resolveCardDepth } from '@/lib/sanity/depth-options'
import { sectionTitle } from '@/lib/sanity/section-title'
import { resolveTextRoles, textRoleProps } from '@/lib/sanity/text-role'

import type { SectionProps } from '../../../types'

// Full class names so Tailwind's scanner sees them. Three is the design's sweet spot; four and six
// fill the row, five sits in threes.
const columnClasses: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-3',
  6: 'sm:grid-cols-2 lg:grid-cols-3',
}

const HEADER_ROLES = ['eyebrow', 'heading', 'intro'] as const

/** The text roles a card draws (stats-capabilities.ts), and what each draws with nothing chosen. */
const ROLES = ['number', 'label'] as const
const OWN_NUMBER = { size: 'text-h1', weight: 'semibold' } as const
const OWN_LABEL = { size: 'text-lead', weight: 'regular', colour: 'text-ink-muted' } as const

/** The card's own surface. It isn't a link, so a chosen fill has no hover shade. */
const OWN_SURFACE = { background: 'bg-surface-alt', border: 'ring-1 ring-line', still: true }

// How this section looks without a style. Keep it equal to the initial style in its schema.
const DEFAULTS: SectionDefaults = { container: 'max-w-content', align: 'center', motion: 'reveal' }

export function StatsCards({ data, isFirst }: SectionProps<'stats'>) {
  const { heading, intro, items } = data
  const title = sectionTitle(data)
  const { block, text, align, motion, tone } = sectionTraits(data.style, DEFAULTS)
  const animate = motion !== 'none' && !isFirst
  const look = resolveCardDesign(data.cardDesign, ROLES)
  const { 'data-text-role': _role, ...figure } = textRoleProps(
    'number',
    'text-h1 font-semibold',
    OWN_NUMBER,
    look.text.number,
  )

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
      <ul
        className={`grid grid-cols-1 gap-6 ${columnClasses[Math.min(items.length, 6)] ?? columnClasses[6]}`}
      >
        {items.map((item) => (
          <CardSurface
            key={item._key}
            as="li"
            className={`rounded-card border-t-4 border-accent bg-surface-alt p-8 ${CARD_SHADOW_CLASS.free} ring-1 ring-line ${align === 'center' ? 'text-center' : ''}`}
            own={OWN_SURFACE}
            shadow={CARD_SHADOW_CLASS.free}
            depth={resolveCardDepth([data.cardDesign], OWN_SHADOW.siteCardFree)}
            design={look.surface}
            mark={{ input: data.cardDesign?.mark, scope: 'card', tone, levels: [data.cardDesign] }}
          >
            <p>
              <StatFigure item={item} animate={animate} {...figure} textRole="number" />
            </p>
            <p
              {...textRoleProps(
                'label',
                'mt-2 text-lead text-ink-muted',
                OWN_LABEL,
                look.text.label,
              )}
            >
              {item.label}
            </p>
          </CardSurface>
        ))}
      </ul>
    </SectionFrame>
  )
}
