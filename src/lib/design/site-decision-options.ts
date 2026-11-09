/**
 * What Studio shows for the site-wide choices on Brand colours (task 216): the order, titles and one
 * line each. The values match the keys of `SITE_DECISIONS` (site-decisions.ts), which a unit test
 * checks, so a choice can't be offered without something to render. Standard and Soft are today's
 * look: leaving the field empty is the same, and the picker shows them as chosen.
 */

export const DENSITIES = ['compact', 'standard', 'airy'] as const
export type Density = (typeof DENSITIES)[number]

export const DENSITY_TITLES: Record<Density, string> = {
  compact: 'Compact',
  standard: 'Standard',
  airy: 'Airy',
}

export const DENSITY_DESCRIPTIONS: Record<Density, string> = {
  compact: 'Tighter sections and side margins.',
  standard: 'The spacing the site has now.',
  airy: 'More room around every section.',
}

export const SHAPES = ['sharp', 'soft', 'round'] as const
export type Shape = (typeof SHAPES)[number]

export const SHAPE_TITLES: Record<Shape, string> = {
  sharp: 'Sharp',
  soft: 'Soft',
  round: 'Round',
}

export const SHAPE_DESCRIPTIONS: Record<Shape, string> = {
  sharp: 'Square, crisp corners on cards and panels.',
  soft: 'The corners the site has now.',
  round: 'Generously rounded cards and panels.',
}
