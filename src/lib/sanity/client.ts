import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId, studioUrl } from '@/config/env'

/**
 * The one Sanity client. ES modules are evaluated once per runtime, so this
 * module-level instance is a singleton. Derive variants with `client.withConfig()`
 * rather than calling `createClient` elsewhere.
 *
 * Defaults are tuned for public, cacheable reads. `defineLive` overrides
 * perspective / stega / token per request when draft mode is on.
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: 'published',
  // Lets <VisualEditing /> turn stega-encoded strings into click-to-edit overlays.
  stega: { studioUrl },
})
