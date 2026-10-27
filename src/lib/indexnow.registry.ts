import { defineFeatureConfig } from '@/config/feature-config'

export const indexNowConfig = defineFeatureConfig({
  id: 'indexnow',
  title: 'IndexNow (tell search engines about new pages)',
  summary: 'Pings participating search engines when a page or post is published.',
  why: 'New pages can be found sooner than a crawler would get to them.',
  withoutIt: 'Search engines find new pages by crawling, which is slower. Nothing else changes.',
  profileFlag: null,
  tier: 'optional',
  docs: 'README.md#indexnow',
  setup: [
    'Set up webhook mode first: the ping is sent when Sanity calls /api/revalidate.',
    'Generate a key of 8 to 128 letters, digits and dashes and add it to Vercel as INDEXNOW_KEY.',
    'Redeploy. The key file is served at /api/indexnow/<key> for search engines to check.',
  ],
  settings: [
    {
      name: 'INDEXNOW_KEY',
      kind: 'server-env',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: true,
      generate: 'hex-32',
      purpose:
        'The key search engines check against the key file the site serves. Public by protocol, so it is not a secret.',
      default: 'Unset: no pings are sent',
      source: 'Generate one, for example openssl rand -hex 16',
    },
  ],
  readiness: 'getIndexNowReadiness',
  verify: [],
})
