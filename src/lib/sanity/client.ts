import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId, studioUrl } from '@/config/env'

import { token } from './token'

/**
 * The one Sanity client. ES modules are evaluated once per runtime, so this
 * module-level instance is a singleton. Derive variants with `client.withConfig()`
 * rather than calling `createClient` elsewhere.
 *
 * Defaults are tuned for cacheable reads. Datasets are private, so every read carries the
 * Viewer token (`defineLive` only adds its `serverToken` for drafts and stega, so published reads
 * need it here) while still using the API CDN. This module imports `server-only` code, so no client
 * component can import it (see token-import-guard.test.ts); `browserToken` is the only copy that
 * reaches the browser, and only in draft mode.
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: true,
  perspective: 'published',
  // Lets <VisualEditing /> turn stega-encoded strings into click-to-edit overlays.
  stega: { studioUrl },
  // Test-only: end-to-end tests point the server at a local fake Content Lake
  // (tests/e2e/fake-sanity.mjs). Server-side variable, so it never reaches the browser.
  ...(process.env.SANITY_API_HOST && {
    apiHost: process.env.SANITY_API_HOST,
    useProjectHostname: false,
  }),
})
