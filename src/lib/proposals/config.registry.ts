import { defineFeatureConfig } from '@/config/feature-config'

/** Values for `npm run proposal`, which runs on a developer's machine against a scratch dataset, not on the site. */
export const changeProposalsConfig = defineFeatureConfig({
  id: 'change-proposals',
  title: 'Change proposals',
  summary:
    'Checks scripted changes to pages and design settings, and writes them as drafts in a scratch dataset.',
  why: 'A scripted or AI-made change is checked first and lands only as a draft that a person previews and publishes.',
  withoutIt: 'Nothing changes on the site. The validator still runs without a token.',
  profileFlag: null,
  tier: 'optional',
  docs: 'README.md#change-proposals',
  since: '1.11.0',
  setup: [
    'Use a scratch dataset only: its name must start with "scratch". The applier refuses every other name.',
    'Create a token with the Editor role for that project and put it in .env.local as SANITY_PROPOSAL_TOKEN.',
  ],
  settings: [
    {
      name: 'SANITY_PROPOSAL_TOKEN',
      kind: 'secret',
      where: 'local',
      required: false,
      purpose:
        'Lets `npm run proposal -- apply` read documents and write drafts in a scratch dataset.',
      default: 'Unset: validate works from a documents file, and apply stops with a message',
      source: 'sanity.io/manage → your project → API → Tokens (Editor role)',
      envExample: false,
    },
  ],
  verify: [],
})
