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
    'Use a scratch dataset only: named "scratch", or starting "scratch-" or "scratch_". The applier refuses every other name.',
    'Create a token for that project and put it in .env.local as SANITY_PROPOSAL_TOKEN. Agency-only changes apply only with an Administrator or Developer token. Sign the Sanity CLI in too (npx sanity login): the Studio validation step uses it.',
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
      source:
        'sanity.io/manage → your project → API → Tokens (Administrator or Developer role for agency-only changes)',
      envExample: false,
    },
    {
      name: 'PROPOSAL_INTEGRATION_DATASET',
      kind: 'server-env',
      where: 'local',
      required: false,
      purpose:
        'Names the scratch dataset the integration test runs against. Left unset, that test is skipped. Only a scratch dataset is accepted.',
      default: 'Unset: the integration test is skipped',
      source: 'The name of a dataset you made for testing, such as scratch-proposals',
      envExample: false,
    },
    {
      name: 'SANITY_PROPOSAL_EDITOR_TOKEN',
      kind: 'secret',
      where: 'local',
      required: false,
      purpose:
        'Only for the scratch-dataset integration test, which uses an Editor token to check that agency-only changes are refused.',
      default: 'Unset: that part of the integration test is skipped',
      source: 'sanity.io/manage → your project → API → Tokens (Editor role)',
      envExample: false,
    },
  ],
  verify: [],
})
