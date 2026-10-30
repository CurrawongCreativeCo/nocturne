import { defineFeatureConfig } from '@/config/feature-config'

/** All of it lives in GitHub, so `config:check` can't see it without `--github`. */
export const enquiryRetentionConfig = defineFeatureConfig({
  id: 'enquiry-retention',
  title: 'Enquiry retention',
  summary: 'Deletes stored enquiries older than the retention period, every Monday.',
  why: "The business does not keep people's details for longer than it said it would.",
  withoutIt: 'Stored enquiries are kept until someone deletes them.',
  profileFlag: null,
  tier: 'optional',
  stage: 'after-launch',
  docs: 'README.md#enquiries',
  setup: [
    'Add the NEXT_PUBLIC_SANITY_PROJECT_ID repository variable on GitHub.',
    'Save the Editor-role token as the SANITY_WRITE_TOKEN repository secret: deleting needs write access.',
    'Optionally set ENQUIRY_RETENTION_DAYS (at least 30). Run the workflow once as a dry run to see what it would delete.',
  ],
  settings: [
    {
      name: 'NEXT_PUBLIC_SANITY_PROJECT_ID',
      kind: 'github-var',
      where: 'github',
      required: true,
      format: 'sanity-project-id',
      purpose: 'Says which Sanity project holds the enquiries. The same value as on Vercel.',
      source: 'sanity.io/manage → your project → Project ID',
    },
    {
      name: 'NEXT_PUBLIC_SANITY_DATASET',
      kind: 'github-var',
      where: 'github',
      required: false,
      format: 'sanity-dataset',
      purpose: 'Which dataset holds the enquiries.',
      default: '"production"',
    },
    {
      name: 'SANITY_WRITE_TOKEN',
      kind: 'github-secret',
      where: 'github',
      required: true,
      purpose:
        'Lets the workflow delete old enquiries. A copy of the Vercel value; never a higher role than Editor.',
      source: 'sanity.io/manage → your project → API → Tokens (Editor role)',
    },
    {
      name: 'ENQUIRY_RETENTION_DAYS',
      kind: 'github-var',
      where: 'github',
      required: false,
      purpose: 'How many days an enquiry is kept: a whole number of at least 30.',
      default: '365',
    },
  ],
  verify: [],
})
