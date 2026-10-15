import { stegaClean } from 'next-sanity'

import { TeamGrid } from './grid'
import { TeamList } from './list'
import { TeamSlider } from './slider'
import type { SectionProps } from '../../../types'

/**
 * Every variant renders the same data; the `variant` field picks the layout. Content with no
 * variant, or one this deployment doesn't know, gets the default (grid).
 */
export function Team(props: SectionProps<'team'>) {
  switch (stegaClean(props.data.variant)) {
    case 'slider':
      return <TeamSlider {...props} />
    case 'list':
      return <TeamList {...props} />
    default:
      return <TeamGrid {...props} />
  }
}
