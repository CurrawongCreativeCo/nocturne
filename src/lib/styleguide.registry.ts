import { defineFeatureConfig } from '@/config/feature-config'

export const styleGuideConfig = defineFeatureConfig({
  id: 'style-guide',
  title: 'Style guide on preview deployments',
  summary: 'Opens the section gallery on a Vercel preview deployment with a token.',
  why: 'Designers and clients can review every section without it being public.',
  withoutIt:
    'The style guide is open in development and answers 404 on Vercel, which is the safe default.',
  profileFlag: null,
  tier: 'optional',
  docs: 'README.md#style-guide',
  setup: [
    'Generate a token of 16 or more characters, for example openssl rand -hex 16.',
    'Add it to Vercel as STYLEGUIDE_PREVIEW_TOKEN for the Preview environment only.',
    'Redeploy a preview and open /section-gallery?preview=<token>.',
  ],
  settings: [
    {
      name: 'STYLEGUIDE_PREVIEW_TOKEN',
      kind: 'secret',
      where: 'vercel',
      targets: ['preview'],
      required: true,
      generate: 'hex-32',
      purpose:
        'Opens /section-gallery on a preview deployment. Never set it on Production, where the page is always a 404.',
      default: 'Unset: the style guide answers 404 on Vercel',
      source: 'Generate one: openssl rand -hex 16 (16 or more characters)',
    },
  ],
  readiness: 'getStyleguideReadiness',
  verify: [],
})
