import { defineFeatureConfig } from '@/config/feature-config'

/**
 * Switches for the configuration tooling itself. Kept apart from Sanity content on purpose: the gate
 * reads the registry, so a control for the gate must not be a core setting the gate could enforce.
 * `tier: 'optional'` keeps it out of the gate for good.
 */
export const configControlsConfig = defineFeatureConfig({
  id: 'config-controls',
  title: 'Configuration controls',
  summary: 'Emergency switches for the build-time configuration check.',
  why: 'An urgent fix can still ship while a non-essential setting is missing.',
  withoutIt: 'The build check always enforces. That is the normal state.',
  profileFlag: null,
  tier: 'optional',
  since: '1.9.0',
  docs: 'README.md#configuration',
  setup: [
    'Leave it unset. Set NOCTURNE_CONFIG_GATE to warn on Vercel only to ship an urgent fix, then remove it.',
  ],
  settings: [
    {
      name: 'NOCTURNE_CONFIG_GATE',
      kind: 'system',
      where: 'vercel',
      targets: ['production', 'preview'],
      buildTime: true,
      required: false,
      purpose:
        "Turns the build check's failures into warnings. It cannot skip a value the build itself needs, and it never affects dataset privacy or any other check.",
      default: 'Unset: the build check enforces',
      docs: 'README.md#configuration',
      envExample: false,
    },
  ],
  verify: [],
})
