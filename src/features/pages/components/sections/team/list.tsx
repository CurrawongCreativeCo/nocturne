import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits } from '@/components/ui/section-style'

import { DEFAULTS } from './grid'
import { TeamRow } from './team-card'
import { headingLevelFor, TeamHeader } from './team-header'
import type { SectionProps } from '../../../types'

export function TeamList({ data, isFirst }: SectionProps<'team'>) {
  const { block, text } = sectionTraits(data.style, DEFAULTS)
  const members = data.members ?? []
  if (members.length === 0) return null

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      <TeamHeader data={data} classes={`${block} ${text}`} />
      <ul className="grid gap-4">
        {members.map((member, index) => (
          <li key={member._id}>
            <TeamRow
              member={member}
              design={data.imageDesign}
              portraitDesign={data.portraitDesign}
              headingLevel={headingLevelFor(data)}
              eager={isFirst && index === 0}
            />
          </li>
        ))}
      </ul>
    </SectionFrame>
  )
}
