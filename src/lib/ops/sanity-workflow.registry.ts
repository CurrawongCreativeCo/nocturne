import { defineFeatureConfig } from '@/config/feature-config'

/** All of it lives in GitHub, so `config:check` can't see it without `--github`. */
export const sanityWorkflowConfig = defineFeatureConfig({
  id: 'sanity-workflow',
  title: 'Schema deploy and migration checks',
  summary: 'Deploys the schema when it changes on main, and dry-runs migrations on pull requests.',
  why: 'Studio always matches the code, and a migration is tried against real content before it is merged.',
  withoutIt:
    'The schema is deployed by hand with the Sanity CLI, and migrations are not tried before merging.',
  profileFlag: null,
  tier: 'optional',
  stage: 'after-launch',
  docs: 'README.md#sanity-workflow-migrations-and-schema-deploy',
  setup: [
    'Add the NEXT_PUBLIC_SANITY_PROJECT_ID repository variable on GitHub.',
    'For schema deploys, save an Editor-role token as the SANITY_DEPLOY_TOKEN repository secret.',
    'For migration dry runs, save a Viewer-role token as the SANITY_MIGRATION_READ_TOKEN repository secret.',
  ],
  settings: [
    {
      name: 'NEXT_PUBLIC_SANITY_PROJECT_ID',
      kind: 'github-var',
      where: 'github',
      required: true,
      format: 'sanity-project-id',
      purpose:
        'Says which Sanity project to deploy to and dry-run against. The same value as on Vercel.',
      source: 'sanity.io/manage → your project → Project ID',
    },
    {
      name: 'NEXT_PUBLIC_SANITY_DATASET',
      kind: 'github-var',
      where: 'github',
      required: false,
      format: 'sanity-dataset',
      purpose: 'Which dataset migrations are dry-run against.',
      default: '"production"',
    },
    {
      name: 'SANITY_DEPLOY_TOKEN',
      kind: 'github-secret',
      where: 'github',
      required: false,
      purpose:
        'Lets the workflow deploy the schema when it changes on main. Needs the Editor role.',
      default: 'Unset: the schema is not deployed from CI',
      source: 'sanity.io/manage → your project → API → Tokens (Editor role)',
    },
    {
      name: 'SANITY_MIGRATION_READ_TOKEN',
      kind: 'github-secret',
      where: 'github',
      required: false,
      purpose:
        'Lets pull requests dry-run migrations. Read-only. Pull requests from forks never receive it.',
      default: 'Unset: migration dry runs are skipped',
      source: 'sanity.io/manage → your project → API → Tokens (Viewer role)',
    },
  ],
  verify: [],
})
