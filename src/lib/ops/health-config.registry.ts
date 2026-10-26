import { defineFeatureConfig } from '@/config/feature-config'

/** All of it lives in GitHub, so `config:check` can't see it until `--github` exists (task 231). */
export const healthMonitoringConfig = defineFeatureConfig({
  id: 'health-monitoring',
  title: 'Daily health monitoring',
  summary:
    'Checks the live site and its dataset every day and opens an issue when something is wrong.',
  why: 'A broken deploy or an exposed dataset reaches the agency before it reaches the client.',
  withoutIt: 'Nothing checks the live site. Problems are found by visitors.',
  profileFlag: null,
  tier: 'optional',
  since: '1.9.0',
  docs: 'README.md#health-checks',
  setup: [
    'Add the PRODUCTION_URL and NEXT_PUBLIC_SANITY_PROJECT_ID repository variables on GitHub.',
    'Create a Viewer token in Sanity and save it as the SANITY_AUTH_TOKEN repository secret.',
    'Run the Health workflow once from the Actions tab and read its result file: a run that skipped is not a health check.',
  ],
  settings: [
    {
      name: 'PRODUCTION_URL',
      kind: 'github-var',
      where: 'github',
      required: true,
      format: 'https-url',
      purpose: 'The live address the daily check opens.',
      source: 'The live address, for example https://example.com.au',
    },
    {
      name: 'NEXT_PUBLIC_SANITY_PROJECT_ID',
      kind: 'github-var',
      where: 'github',
      required: true,
      format: 'sanity-project-id',
      purpose: 'Lets the check look at the dataset. Must match the value on Vercel.',
      source: 'The same value as on Vercel: sanity.io/manage → your project → Project ID',
    },
    {
      name: 'NEXT_PUBLIC_SANITY_DATASET',
      kind: 'github-var',
      where: 'github',
      required: false,
      format: 'sanity-dataset',
      purpose: 'Which dataset to look at.',
      default: '"production"',
    },
    {
      name: 'SANITY_AUTH_TOKEN',
      kind: 'github-secret',
      where: 'github',
      required: true,
      purpose: 'Lets the check read the dataset. Read-only; the backup uses the same secret.',
      source:
        'sanity.io/manage → your project → API → Tokens (Viewer role). The backup uses the same secret',
    },
    {
      name: 'HEALTH_CHECKS',
      kind: 'github-var',
      where: 'github',
      required: false,
      format: 'off-switch',
      planned: 'task 230',
      purpose:
        'Switches monitoring off on purpose (the template repository, scratch repositories, forks).',
      default: 'On. Set it to "off" to switch monitoring off deliberately',
    },
    {
      name: 'HEALTH_EXPECT_MARKER',
      kind: 'github-var',
      where: 'github',
      required: false,
      planned: 'task 230',
      purpose: 'Text the home page must contain, so a blank or wrong page is caught.',
      default: 'No marker is expected on the home page',
    },
    {
      name: 'ENQUIRIES_STORE',
      kind: 'github-var',
      where: 'github',
      required: false,
      purpose: 'Tells the workflow that stored enquiries make a public dataset more serious.',
      default: 'Off. A copy of the Vercel setting, kept only so the health workflow knows',
      deprecated: {
        replacedBy: 'the dataset evidence the health result will record (task 230)',
        migration:
          'Nothing yet. Keep it set to match Vercel until task 230 ships; after that, delete the GitHub variable.',
        removeWhen:
          'Task 230 has shipped in a release, the workflow no longer reads it, and the removal is approved as its own versioned decision.',
      },
    },
  ],
  verify: ['launch-check', 'check-dataset'],
})
