import { stegaClean } from 'next-sanity'

import { ProcessAlternating } from './alternating'
import { ProcessVertical } from './vertical'
import type { SectionProps } from '../../../types'

/**
 * Every variant renders the same data; the `variant` field picks the layout. Content with no
 * variant, or one this deployment doesn't know, gets the default (vertical).
 */
export function Process(props: SectionProps<'process'>) {
  switch (stegaClean(props.data.variant)) {
    case 'alternating':
      return <ProcessAlternating {...props} />
    default:
      return <ProcessVertical {...props} />
  }
}
