import { defineFeatureConfig } from '@/config/feature-config'

/** The two values `src/config/env.ts` already throws on are the only ones the build gate enforces. */
export const sanityCoreConfig = defineFeatureConfig({
  id: 'sanity-core',
  title: 'Sanity content',
  summary: 'Connects the site and the Studio to their content.',
  why: 'Every page, post and setting an editor changes is read from Sanity.',
  withoutIt: 'The site cannot be built, and the Studio cannot open.',
  profileFlag: null,
  tier: 'core',
  since: '1.0.0',
  docs: 'README.md#deploying-vercel',
  setup: [
    'Create the project at sanity.io/manage and copy its Project ID.',
    'Add NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET to Vercel and .env.local.',
    'Create a Viewer token and add it as SANITY_API_READ_TOKEN: datasets are private, so the site reads content with it.',
  ],
  settings: [
    {
      name: 'NEXT_PUBLIC_SANITY_PROJECT_ID',
      kind: 'public-env',
      where: 'vercel',
      targets: ['production', 'preview', 'development'],
      buildTime: true,
      required: true,
      format: 'sanity-project-id',
      purpose: 'Says which Sanity project holds the content.',
      source: 'sanity.io/manage → your project → Project ID',
      envExample: { placeholder: 'your-project-id' },
    },
    {
      name: 'NEXT_PUBLIC_SANITY_DATASET',
      kind: 'public-env',
      where: 'vercel',
      targets: ['production', 'preview', 'development'],
      buildTime: true,
      required: true,
      format: 'sanity-dataset',
      purpose: 'Says which dataset in that project is this site.',
      default: 'None in the app. The GitHub workflows assume "production".',
      source: 'sanity.io/manage → your project → API → Datasets',
      envExample: { placeholder: 'production' },
    },
    {
      name: 'SANITY_API_READ_TOKEN',
      kind: 'secret',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: true,
      requiredIn: ['production'],
      enforceFrom: '1.10.0',
      purpose:
        'Lets the server read content from a private dataset. Without it a production site has nothing to show.',
      source: 'sanity.io/manage → your project → API → Tokens (Viewer role)',
      docs: 'README.md#dataset-privacy',
    },
    {
      name: 'NEXT_PUBLIC_SANITY_API_VERSION',
      kind: 'public-env',
      where: 'vercel',
      targets: ['production', 'preview', 'development'],
      buildTime: true,
      required: false,
      purpose: 'Pins the Sanity API date. It is now a constant in src/config/env.ts.',
      default: 'The date pinned in src/config/env.ts.',
      deprecated: {
        replacedBy:
          'the API_VERSION constant in src/config/env.ts, bumped deliberately in a release',
        migration: 'Delete the variable from Vercel and .env.local. The pinned date applies.',
        removeWhen:
          'One minor release after this deprecation has shipped, the setup wizard no longer writes it, and the removal is approved as its own versioned decision.',
      },
      envExample: false,
    },
  ],
  verify: ['check-dataset'],
})
