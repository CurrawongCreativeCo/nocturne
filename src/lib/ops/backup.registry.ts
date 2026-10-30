import { defineFeatureConfig } from '@/config/feature-config'

/** All of it lives in GitHub, so `config:check` can't see it without `--github`. */
export const backupsConfig = defineFeatureConfig({
  id: 'backups',
  title: 'Weekly dataset backup',
  summary:
    "Exports the dataset every Sunday and keeps it as a download, or in the client's own storage.",
  why: 'Content can be restored if it is deleted or overwritten by mistake.',
  withoutIt:
    'Nothing exports the dataset. Sanity keeps its own history, but there is no copy the business holds.',
  profileFlag: null,
  tier: 'optional',
  stage: 'after-launch',
  docs: 'README.md#backups',
  setup: [
    'Add the NEXT_PUBLIC_SANITY_PROJECT_ID repository variable on GitHub.',
    'Create a Viewer token in Sanity and save it as the SANITY_AUTH_TOKEN repository secret (the health check uses the same one).',
    'Optional: add the S3 or R2 bucket secrets to keep backups outside GitHub. Without them each backup is an Actions artifact for 30 days.',
  ],
  settings: [
    {
      name: 'NEXT_PUBLIC_SANITY_PROJECT_ID',
      kind: 'github-var',
      where: 'github',
      required: true,
      format: 'sanity-project-id',
      purpose: 'Says which Sanity project to export. The same value as on Vercel.',
      source: 'sanity.io/manage → your project → Project ID',
    },
    {
      name: 'NEXT_PUBLIC_SANITY_DATASET',
      kind: 'github-var',
      where: 'github',
      required: false,
      format: 'sanity-dataset',
      purpose: 'Which dataset to export.',
      default: '"production"',
    },
    {
      name: 'SANITY_AUTH_TOKEN',
      kind: 'github-secret',
      where: 'github',
      required: true,
      purpose:
        'Lets the export read the dataset. Read-only; the health check uses the same secret.',
      source: 'sanity.io/manage → your project → API → Tokens (Viewer role)',
    },
    {
      name: 'BACKUP_S3_BUCKET',
      kind: 'github-secret',
      where: 'github',
      required: false,
      purpose:
        "The bucket to store backups in. Stored as a secret, so it can't be displayed or checked.",
      default: 'Unset: backups are kept as an Actions artifact for 30 days',
    },
    {
      name: 'BACKUP_S3_ENDPOINT',
      kind: 'github-secret',
      where: 'github',
      required: false,
      purpose:
        "The storage endpoint, for Cloudflare R2 or another S3-compatible service. Stored as a secret, so it can't be displayed or checked.",
      default: 'Unset: Amazon S3',
    },
    {
      name: 'BACKUP_S3_ACCESS_KEY_ID',
      kind: 'github-secret',
      where: 'github',
      required: false,
      purpose: 'The access key id for the bucket.',
    },
    {
      name: 'BACKUP_S3_SECRET_ACCESS_KEY',
      kind: 'github-secret',
      where: 'github',
      required: false,
      purpose: 'The secret access key for the bucket.',
    },
    {
      name: 'BACKUP_S3_REGION',
      kind: 'github-var',
      where: 'github',
      required: false,
      purpose: "The bucket's region.",
      default: '"auto" with an endpoint, otherwise "us-east-1"',
    },
    {
      name: 'BACKUP_S3_PREFIX',
      kind: 'github-var',
      where: 'github',
      required: false,
      purpose: 'The folder in the bucket backups are written to.',
      default: '"sanity-backups"',
    },
  ],
  verify: [],
})
