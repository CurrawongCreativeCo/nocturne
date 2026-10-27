import { defineFeatureConfig } from '@/config/feature-config'

export const siteConfig = defineFeatureConfig({
  id: 'site',
  title: 'Site address and language',
  summary:
    'Tells the site its public address, the language of its content and, in an emergency, to hide itself.',
  why: 'Canonical links, the sitemap, share cards and screen readers all depend on them.',
  withoutIt:
    "On Vercel the project's production domain is used. Elsewhere a production server refuses to start rather than publish links that point at localhost.",
  profileFlag: null,
  tier: 'optional',
  docs: 'README.md#deploying-vercel',
  setup: [
    "Add NEXT_PUBLIC_SITE_URL to Vercel (Production and Preview) with the site's live address and no trailing slash.",
    'Leave NEXT_PUBLIC_SITE_LANGUAGE unset unless the content is not in English.',
    'Redeploy so the address is built into the pages.',
  ],
  settings: [
    {
      name: 'NEXT_PUBLIC_SITE_URL',
      kind: 'public-env',
      where: 'vercel',
      targets: ['production', 'preview'],
      buildTime: true,
      required: false,
      purpose:
        "The site's public address, used in canonical links, the sitemap and structured data.",
      default: "Vercel's production domain, then http://localhost:3000 in development",
      source: 'The live address, for example https://example.com.au (no trailing slash)',
      envExample: { placeholder: 'http://localhost:3000' },
    },
    {
      name: 'NEXT_PUBLIC_SITE_LANGUAGE',
      kind: 'public-env',
      where: 'vercel',
      targets: ['production', 'preview'],
      buildTime: true,
      required: false,
      purpose:
        'The language of the content, for <html lang>, so screen readers pronounce it properly.',
      default: '"en"',
      envExample: { placeholder: 'en', commented: true },
    },
    {
      name: 'SITE_LAUNCH_OVERRIDE',
      kind: 'server-env',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: false,
      purpose:
        'An emergency "hide now": the only value it accepts is prelaunch, which makes a live site private again. It can hide a site, never reveal one.',
      default: 'Unset: the launch state in site.profile.ts applies',
      docs: 'README.md#launch-state',
      envExample: false,
    },
  ],
  verify: [],
})
