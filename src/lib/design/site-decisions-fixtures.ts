import type { SiteDecision } from './site-decisions'

/** Test fixtures only. The real density and shape values are task 216b's to decide. */
export const density = {
  field: 'density',
  choices: {
    compact: { '--spacing-section': '4rem', '--spacing-gutter': '1.25rem' },
    standard: {},
    airy: { '--spacing-section': '8rem', '--spacing-gutter': '2rem' },
  },
} satisfies SiteDecision

export const shape = {
  field: 'shape',
  choices: {
    sharp: { '--radius-card': '0.125rem', '--radius-panel': '0.25rem' },
    soft: {},
    round: { '--radius-card': '1.75rem', '--radius-panel': '2.25rem' },
  },
} satisfies SiteDecision

export const FIXTURE_DECISIONS = { density, shape }
