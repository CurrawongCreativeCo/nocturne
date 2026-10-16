import { stegaClean } from 'next-sanity'

import { LogoCloudGrid } from './grid'
import { LogoCloudMarquee } from './marquee'
import type { SectionProps } from '../../../types'

/**
 * Every variant renders the same data; the `variant` field picks the layout. Content with no
 * variant, or one this deployment doesn't know, gets the default (grid).
 */
export function LogoCloud(props: SectionProps<'logoCloud'>) {
  switch (stegaClean(props.data.variant)) {
    case 'marquee':
      return <LogoCloudMarquee {...props} />
    default:
      return <LogoCloudGrid {...props} />
  }
}
