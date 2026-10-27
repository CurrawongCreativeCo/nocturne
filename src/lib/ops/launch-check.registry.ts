import { defineFeatureConfig } from '@/config/feature-config'

/** Values for `npm run launch:check`, which runs on a developer's machine or in CI, not on the site. */
export const launchCheckConfig = defineFeatureConfig({
  id: 'launch-check',
  title: 'Launch check',
  summary: 'Checks a deployed site before and after launch, with an optional PageSpeed run.',
  why: 'Problems are found by the agency, not by the first visitors.',
  withoutIt:
    'The launch check still runs. It skips PageSpeed, and cannot reach a protected preview.',
  profileFlag: null,
  tier: 'optional',
  docs: 'README.md#launch-check',
  setup: [
    'Optional: create a Google PageSpeed Insights API key and put it in .env.local as PSI_API_KEY.',
    'Only for a Vercel deployment with protection on: add the Protection Bypass secret to .env.local as VERCEL_AUTOMATION_BYPASS_SECRET and run launch:check with --bypass.',
  ],
  settings: [
    {
      name: 'PSI_API_KEY',
      kind: 'secret',
      where: 'local',
      required: false,
      purpose: 'Lets the launch check run PageSpeed Insights.',
      default: 'Unset: PageSpeed is skipped',
      source: 'Google Cloud console → APIs & Services → PageSpeed Insights API → Credentials',
      envExample: false,
    },
    {
      name: 'VERCEL_AUTOMATION_BYPASS_SECRET',
      kind: 'secret',
      where: 'local',
      required: false,
      purpose: "Lets the launch check past Vercel's deployment protection when run with --bypass.",
      default: 'Unset: --bypass has nothing to send',
      source:
        'Vercel → project Settings → Deployment Protection → Protection Bypass for Automation',
      envExample: false,
    },
  ],
  verify: [],
})
