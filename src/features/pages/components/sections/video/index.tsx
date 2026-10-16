import { stegaClean } from 'next-sanity'

import { VideoAmbient } from './ambient'
import { VideoEmbed } from './embed'
import type { SectionProps } from '../../../types'

/**
 * Every variant renders the same data; the `variant` field picks the layout. Content with no
 * variant, or one this deployment doesn't know, gets the default (embed).
 */
export function Video(props: SectionProps<'video'>) {
  switch (stegaClean(props.data.variant)) {
    case 'ambient':
      // Ambient plays an uploaded file; without one (say, the layout was switched before uploading) show the embed.
      if (props.data.fileUrl) return <VideoAmbient {...props} />
      return <VideoEmbed {...props} />
    default:
      return <VideoEmbed {...props} />
  }
}
