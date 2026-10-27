import { defineFeatureConfig } from '@/config/feature-config'

export const analyticsConfig = defineFeatureConfig({
  id: 'analytics',
  title: 'Analytics and cookie consent',
  summary:
    'Loads Plausible, PostHog or Google Analytics after a visitor accepts analytics cookies.',
  why: 'The business sees how the site is used, and visitors choose whether to be counted.',
  withoutIt:
    'No analytics provider loads and no cookie banner appears. Vercel Analytics is cookieless and always on.',
  profileFlag: null,
  tier: 'optional',
  docs: 'README.md#analytics-and-cookie-consent',
  setup: [
    'Pick a provider and add its public id to Vercel: a Plausible domain, a PostHog project token or a Google Analytics 4 measurement id.',
    'Redeploy: these are built into the pages. The cookie banner appears once any provider is set.',
    'Check the banner, accept analytics, and see the visit in the provider.',
  ],
  settings: [
    {
      name: 'NEXT_PUBLIC_PLAUSIBLE_DOMAIN',
      kind: 'public-env',
      where: 'vercel',
      targets: ['production', 'preview'],
      buildTime: true,
      required: false,
      purpose: 'Turns on Plausible. Public, but whoever controls it receives visitor analytics.',
      source: "Plausible → Site settings → the site's domain, for example example.com.au",
    },
    {
      name: 'NEXT_PUBLIC_POSTHOG_KEY',
      kind: 'public-env',
      where: 'vercel',
      targets: ['production', 'preview'],
      buildTime: true,
      required: false,
      purpose: 'Turns on PostHog. Public, but whoever controls it receives visitor analytics.',
      source: 'PostHog → Project settings → Project token',
    },
    {
      name: 'NEXT_PUBLIC_POSTHOG_HOST',
      kind: 'public-env',
      where: 'vercel',
      targets: ['production', 'preview'],
      buildTime: true,
      required: false,
      purpose:
        'Which PostHog cloud receives events. Use https://eu.i.posthog.com for the EU cloud.',
      default: 'https://us.i.posthog.com',
      envExample: { placeholder: 'https://us.i.posthog.com', commented: true },
    },
    {
      name: 'NEXT_PUBLIC_GA_ID',
      kind: 'public-env',
      where: 'vercel',
      targets: ['production', 'preview'],
      buildTime: true,
      required: false,
      purpose:
        'Turns on Google Analytics 4. Public, but whoever controls it receives visitor analytics.',
      source: 'Google Analytics → Admin → Data streams → Measurement ID (G-…)',
    },
  ],
  readiness: 'getAnalyticsReadiness',
  verify: [],
})
