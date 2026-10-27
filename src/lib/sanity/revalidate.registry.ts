import { defineFeatureConfig } from '@/config/feature-config'

export const webhookModeConfig = defineFeatureConfig({
  id: 'webhook-mode',
  title: 'Webhook mode (cache refresh on publish)',
  summary:
    'Sanity tells the site when something is published, instead of every visitor holding a live connection open.',
  why: 'A high-traffic site stays fast and cheap while edits still reach it within moments.',
  withoutIt:
    'Live mode: visitors open a live connection to Sanity and edits appear as they are made.',
  profileFlag: null,
  tier: 'optional',
  docs: 'README.md#live-mode-vs-webhook-mode',
  setup: [
    'Generate a secret and add it to Vercel as SANITY_REVALIDATE_SECRET.',
    'In sanity.io/manage → API → Webhooks, add a webhook to <site>/api/revalidate and use the same value as its secret.',
    'Redeploy, then publish a change and check it reaches the live site.',
  ],
  settings: [
    {
      name: 'SANITY_REVALIDATE_SECRET',
      kind: 'secret',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: true,
      generate: 'hex-32',
      purpose:
        "Proves a publish notice came from Sanity. It must equal the webhook's secret, so it lives in two places.",
      default: 'Unset: live mode',
      source: 'Generate one (for example openssl rand -hex 32) and enter it in Sanity and Vercel',
    },
  ],
  readiness: 'getRevalidateReadiness',
  verify: [],
})
