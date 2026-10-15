import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'

import { TeamCard } from './team-card'
import { headingLevelFor, TeamHeader } from './team-header'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep it equal to the initial style in its schema.
export const DEFAULTS: SectionDefaults = { tone: 'alt', container: 'max-w-content', align: 'start' }

export function TeamGrid({ data, isFirst }: SectionProps<'team'>) {
  const { block, text } = sectionTraits(data.style, DEFAULTS)
  const members = data.members ?? []
  if (members.length === 0) return null

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      <TeamHeader data={data} classes={`${block} ${text}`} />
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member, index) => (
          <li key={member._id}>
            <TeamCard
              member={member}
              headingLevel={headingLevelFor(data)}
              eager={isFirst && index === 0}
            />
          </li>
        ))}
      </ul>
    </SectionFrame>
  )
}
