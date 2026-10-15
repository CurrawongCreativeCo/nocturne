import { stegaClean } from 'next-sanity'

import { TestimonialsGrid } from './grid'
import { TestimonialsSlider } from './slider'
import type { SectionProps } from '../../../types'

/**
 * Every variant renders the same data; the `variant` field picks the layout. Content with no
 * variant, or one this deployment doesn't know, gets the default (grid).
 */
export function Testimonials(props: SectionProps<'testimonials'>) {
  switch (stegaClean(props.data.variant)) {
    case 'slider':
      return <TestimonialsSlider {...props} />
    default:
      return <TestimonialsGrid {...props} />
  }
}
