import { stegaClean } from 'next-sanity'

import { LinkListCards } from './cards'
import { LinkListCompact } from './compact'
import { LinkListEditorial } from './editorial'
import { LinkListStacked } from './stacked'
import type { SectionProps } from '../../../types'

/**
 * Every variant renders the same data; the `variant` field picks the layout. Content with no
 * variant, or one this deployment doesn't know, gets the default (stacked).
 */
export function LinkList(props: SectionProps<'linkList'>) {
  switch (stegaClean(props.data.variant)) {
    case 'cards':
      return <LinkListCards {...props} />
    case 'editorial':
      return <LinkListEditorial {...props} />
    case 'compact':
      return <LinkListCompact {...props} />
    default:
      return <LinkListStacked {...props} />
  }
}
