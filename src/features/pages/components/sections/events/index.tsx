import { stegaClean } from 'next-sanity'

import { EventsAgenda } from './agenda'
import { EventsFeatured } from './featured'
import { EventsList } from './list'
import type { SectionProps } from '../../../types'

/**
 * Every variant renders the same data; the `variant` field picks the layout. Content with no
 * variant, or one this deployment doesn't know, gets the default (list).
 */
export function Events(props: SectionProps<'events'>) {
  switch (stegaClean(props.data.variant)) {
    case 'agenda':
      return <EventsAgenda {...props} />
    case 'featured':
      return <EventsFeatured {...props} />
    default:
      return <EventsList {...props} />
  }
}
