import { defineFeatureConfig } from '@/config/feature-config'

export const experimentsConfig = defineFeatureConfig({
  id: 'experiments',
  title: 'A/B tests',
  summary: 'Shows some visitors a different version of a page and measures which one works better.',
  why: 'Changes to a page can be tested before they are rolled out to everyone.',
  withoutIt: 'No test runs and every visitor sees the published content.',
  profileFlag: 'experiments',
  tier: 'optional',
  docs: 'README.md#ab-tests-how-it-works',
  setup: [
    'Generate FLAGS_SECRET (32 random bytes, base64url) and add it to Vercel.',
    'Redeploy, then start an experiment in Studio.',
  ],
  settings: [
    {
      name: 'FLAGS_SECRET',
      kind: 'secret',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: true,
      generate: 'base64url-32',
      purpose: 'Signs the variant codes in prerendered URLs, so a visitor cannot forge one.',
      source: 'Generate one: node -e "console.log(crypto.randomBytes(32).toString(\'base64url\'))"',
    },
    {
      name: 'EXPERIMENT_CACHE_SECONDS',
      kind: 'server-env',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: false,
      purpose:
        'How long the proxy remembers whether a test is running, so starting or stopping one can take this long to show.',
      default: '60',
      envExample: { placeholder: '60', commented: true },
    },
  ],
  readiness: 'getExperimentsReadiness',
  verify: [],
})
