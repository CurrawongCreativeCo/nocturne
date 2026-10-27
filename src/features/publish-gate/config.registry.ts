import { defineFeatureConfig } from '@/config/feature-config'

export const publishGateConfig = defineFeatureConfig({
  id: 'publish-gate',
  title: 'Publish gate for Contributors',
  summary:
    'Lets a Contributor publish changes that clients may make, and sends the rest to the agency.',
  why: 'Clients can publish routine edits without waiting, while design changes stay with the agency.',
  withoutIt: "A Contributor's changes are saved as drafts and the agency publishes them.",
  profileFlag: 'publishGate',
  tier: 'optional',
  docs: 'README.md#publish-gate',
  setup: [
    'Switch features.publishGate on in site.profile.ts.',
    'Create a Sanity token with the Editor role (never higher) and add it to Vercel as SANITY_WRITE_TOKEN.',
    'Redeploy, then check a Contributor can publish an allowed change.',
  ],
  settings: [
    {
      name: 'SANITY_WRITE_TOKEN',
      kind: 'secret',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: true,
      purpose:
        "Lets the server publish a validated draft on a Contributor's behalf. Never give it a higher role than Editor.",
      source: 'sanity.io/manage → your project → API → Tokens (Editor role)',
    },
  ],
  verify: [],
})
