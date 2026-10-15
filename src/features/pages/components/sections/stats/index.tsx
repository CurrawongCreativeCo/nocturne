import { stegaClean } from 'next-sanity'

import { StatsCards } from './cards'
import { StatsInline } from './inline'
import type { SectionProps } from '../../../types'

/**
 * Every variant renders the same data; the `variant` field picks the layout. Content with no
 * variant, or one this deployment doesn't know, gets the default (inline).
 */
export function Stats(props: SectionProps<'stats'>) {
  switch (stegaClean(props.data.variant)) {
    case 'cards':
      return <StatsCards {...props} />
    default:
      return <StatsInline {...props} />
  }
}
