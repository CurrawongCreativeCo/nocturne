/**
 * Embedded Sanity Studio at /studio. Same deploy, same domain, same env, and
 * Presentation previews this app without CORS or cross-origin cookie issues.
 */
import { BrandedStudio } from '@/features/studio/components/branded-studio'

import config from '../../../../sanity.config'

export { metadata, viewport } from 'next-sanity/studio'

export default function StudioPage() {
  return <BrandedStudio config={config} />
}
