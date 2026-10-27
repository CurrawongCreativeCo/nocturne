import { defineFeatureConfig } from '@/config/feature-config'

export const prelaunchConfig = defineFeatureConfig({
  id: 'prelaunch',
  title: 'Pre-launch preview access',
  summary:
    'Lets the team and the client see the whole site before launch, while visitors see a temporary page.',
  why: 'A site can be reviewed on its real domain without being public.',
  withoutIt: 'No preview pass can be issued: pre-launch pages stay private, even in Presentation.',
  profileFlag: null,
  tier: 'optional',
  docs: 'README.md#pre-launch-and-launch',
  setup: [
    'Generate PREVIEW_ACCESS_SECRET (16 or more characters, for example openssl rand -hex 32) and add it to Vercel.',
    'Optionally generate PRELAUNCH_PREVIEW_TOKEN the same way for the client preview link, /api/preview-access?token=<it>.',
    'Redeploy. Changing either later revokes every pass it issued.',
  ],
  settings: [
    {
      name: 'PREVIEW_ACCESS_SECRET',
      kind: 'secret',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: true,
      generate: 'hex-32',
      purpose:
        'Signs the preview pass that Presentation and the client link issue. Rotating it revokes every pass, by design.',
      default: 'Unset: no pass is ever valid and pre-launch pages stay private',
      source: 'Generate one: openssl rand -hex 32 (16 or more characters)',
    },
    {
      name: 'PRELAUNCH_PREVIEW_TOKEN',
      kind: 'secret',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: false,
      generate: 'hex-32',
      purpose:
        "The client preview link's token. Anyone with the link has the same access as a pass.",
      default: 'Unset: there is no client link',
      source: 'Generate one: openssl rand -hex 32 (16 or more characters)',
    },
  ],
  readiness: 'getPrelaunchReadiness',
  verify: ['launch-check'],
})
