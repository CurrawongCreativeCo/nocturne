'use client'

/**
 * Studio config, mounted at /studio by app/studio/[[...tool]]/page.tsx.
 * `'use client'` because the embedded Studio is a client-only React app.
 *
 * Like `src/app`, this is a composition root: it may import from any feature,
 * which is how each feature's schema types get registered.
 */
import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { presentationTool } from 'sanity/presentation'
import { structureTool } from 'sanity/structure'

import { apiVersion, dataset, projectId, studioUrl } from './src/config/env'
import { pageSchemaTypes } from './src/features/pages/schemas'
import { resolve } from './src/features/studio/presentation'
import { structure } from './src/features/studio/structure'
import { sharedSchemaTypes } from './src/lib/sanity/schema'

export default defineConfig({
  basePath: studioUrl,
  projectId,
  dataset,
  schema: { types: [...pageSchemaTypes, ...sharedSchemaTypes] },
  plugins: [
    structureTool({ structure }),
    presentationTool({
      resolve,
      previewUrl: { previewMode: { enable: '/api/draft-mode/enable' } },
    }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
})
