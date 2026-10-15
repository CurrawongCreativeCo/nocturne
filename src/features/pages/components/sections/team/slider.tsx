import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits } from '@/components/ui/section-style'
import { LazySlider } from '@/components/ui/slider-lazy'

import { DEFAULTS } from './grid'
import { TeamCard } from './team-card'
import { headingLevelFor, TeamHeader } from './team-header'
import type { SectionProps } from '../../../types'

export function TeamSlider({ data, isFirst }: SectionProps<'team'>) {
  const { block, text } = sectionTraits(data.style, DEFAULTS)
  const members = data.members ?? []
  if (members.length === 0) return null

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      <TeamHeader data={data} classes={`${block} ${text}`} />
      <LazySlider label={data.title || 'Our team'} perView={{ base: 1, sm: 2, lg: 3 }} gap>
        {members.map((member, index) => (
          <TeamCard
            key={member._id}
            member={member}
            headingLevel={headingLevelFor(data)}
            eager={isFirst && index === 0}
          />
        ))}
      </LazySlider>
    </SectionFrame>
  )
}
