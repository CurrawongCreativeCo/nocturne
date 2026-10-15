import { stegaClean } from 'next-sanity'

import { GalleryGrid } from './grid'
import { GalleryMasonry } from './masonry'
import { GallerySlider } from './slider'
import type { SectionProps } from '../../../types'

/**
 * Every variant renders the same data; the `variant` field picks the layout. Content with no
 * variant, or one this deployment doesn't know, gets the default (grid).
 */
export function Gallery(props: SectionProps<'gallery'>) {
  switch (stegaClean(props.data.variant)) {
    case 'masonry':
      return <GalleryMasonry {...props} />
    case 'slider':
      return <GallerySlider {...props} />
    default:
      return <GalleryGrid {...props} />
  }
}
