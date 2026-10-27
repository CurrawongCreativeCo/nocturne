import { defineFeatureConfig } from '@/config/feature-config'

export const enquiriesConfig = defineFeatureConfig({
  id: 'enquiries',
  title: 'Stored enquiries',
  summary:
    'Keeps each form submission as an enquiry the client reads in Studio, as well as emailing it.',
  why: 'Nothing is lost if an email goes astray, and clients can see their leads in one place.',
  withoutIt: 'Form submissions are emailed only. Nothing is stored.',
  profileFlag: null,
  switchedBy: ['ENQUIRIES_STORE'],
  tier: 'optional',
  docs: 'README.md#enquiries',
  setup: [
    'Make sure the dataset is private: nothing is stored unless it refuses anonymous reads.',
    'Create a Sanity token with the Editor role (never higher) and add it to Vercel as SANITY_WRITE_TOKEN.',
    'Add ENQUIRIES_STORE=1 to Vercel, add a privacy notice to the form, then redeploy.',
  ],
  settings: [
    {
      name: 'ENQUIRIES_STORE',
      kind: 'server-env',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: true,
      purpose: 'Switches on storing submissions. Set it to 1.',
      default: 'Unset: submissions are emailed only',
      envExample: { placeholder: '1', commented: true },
    },
    {
      name: 'SANITY_WRITE_TOKEN',
      kind: 'secret',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: true,
      purpose:
        'Lets the server write the enquiry document. The Stripe webhook and the publish gate use it too. Never give it a higher role than Editor.',
      source: 'sanity.io/manage → your project → API → Tokens (Editor role)',
    },
  ],
  readiness: 'getEnquiryConfig',
  verify: [],
})
