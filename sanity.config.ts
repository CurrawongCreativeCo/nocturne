'use client'

/**
 * Studio config, mounted at /studio by app/studio/[[...tool]]/page.tsx.
 * `'use client'` because the embedded Studio is a client-only React app.
 *
 * Like `src/app`, this is a composition root: it may import from any feature,
 * which is how each feature's schema types get registered.
 */
import { assist } from '@sanity/assist'
import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { presentationTool } from 'sanity/presentation'
import { structureTool } from 'sanity/structure'

import { apiVersion, dataset, projectId, studioTitle, studioUrl } from './src/config/env'
import { blogSchemaTypes } from './src/features/blog/schemas'
import { experimentSchemaTypes } from './src/features/experiments/schemas'
import { formSchemaTypes } from './src/features/forms/schemas'
import { pageSchemaTypes } from './src/features/pages/schemas'
import { pageTemplates } from './src/features/pages/schemas/templates'
import { pricingSchemaTypes } from './src/features/pricing/schemas'
import { hidePricesFromNewMenu } from './src/features/pricing/studio'
import { siteSchemaTypes } from './src/features/site/schemas'
import { aiSettings } from './src/features/studio/ai-settings/plugin'
import { assistPresets } from './src/features/studio/assist-presets'
import { StudioLogo } from './src/features/studio/components/studio-logo'
import { contentHealth } from './src/features/studio/content-health/plugin'
import { resolve } from './src/features/studio/presentation'
import {
  hideSingletonsFromNewMenu,
  singletonDocumentActions,
  withoutSingletonTemplates,
} from './src/features/studio/singletons'
import { structure } from './src/features/studio/structure'
import { sharedSchemaTypes } from './src/lib/sanity/schema'
// new-registry:import

export default defineConfig({
  basePath: studioUrl,
  title: studioTitle,
  projectId,
  dataset,
  studio: { components: { logo: StudioLogo } },
  // Content variants: lets editors create variants of a document, which A/B experiments serve.
  beta: { variants: { enabled: true } },
  schema: {
    types: [
      ...pageSchemaTypes,
      ...blogSchemaTypes,
      ...formSchemaTypes,
      ...pricingSchemaTypes,
      ...experimentSchemaTypes,
      ...siteSchemaTypes,
      // new-registry:register
      ...sharedSchemaTypes,
    ],
    templates: (defaults) => [...withoutSingletonTemplates(defaults), ...pageTemplates],
  },
  document: {
    actions: singletonDocumentActions,
    newDocumentOptions: (prev, context) =>
      hidePricesFromNewMenu(hideSingletonsFromNewMenu(prev, context), context),
  },
  plugins: [
    structureTool({ structure }),
    presentationTool({
      resolve,
      previewUrl: { previewMode: { enable: '/api/draft-mode/enable' } },
    }),
    visionTool({ defaultApiVersion: apiVersion }),
    contentHealth(),
    aiSettings(),
    assist({ __presets: assistPresets }),
  ],
})
