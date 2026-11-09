import tokens from '@/styles/tokens.json'

/**
 * Site-wide heading styles (build plan task 216): how the display, h1, h2 and h3 sizes, their letter
 * spacing and every heading's weight change together. A style only changes variables for tokens that
 * already exist (`--text-h2`, `--text-h2--letter-spacing`) plus `--heading-weight`, so fonts stay those
 * in tokens.json and next/font. Standard is today's look and changes nothing.
 *
 * One table, read by the site (`SITE_DECISIONS.headingStyle`, through `headingStyleVars`) and by the
 * Studio preview, so the two cannot disagree. PROVISIONAL until visual review (task 216b).
 */

export const HEADING_STYLE_NAMES = ['standard', 'editorial', 'modern', 'classic'] as const
export type HeadingStyleName = (typeof HEADING_STYLE_NAMES)[number]

/** The type tokens a style resizes. h4 and below keep their sizes and spacing. */
export const SCALED_ROLES = ['display', 'h1', 'h2', 'h3'] as const
export type ScaledRole = (typeof SCALED_ROLES)[number]

export interface HeadingStyle {
  /** `--heading-weight`: every h1, h2 and h3 (h4 and below keep their own). */
  readonly weight: number
  /** Letter spacing for the scaled roles, in em. */
  readonly tracking: string
  /** A multiple of each role's size in tokens.json. 1 leaves the size alone. */
  readonly scale: Readonly<Record<ScaledRole, number>>
}

/** What tokens.json draws today, so Standard can be shown (and compared against) as a style too. */
export const TODAY: HeadingStyle = {
  weight: 600,
  tracking: tokens.type.h2.letterSpacing,
  scale: { display: 1, h1: 1, h2: 1, h3: 1 },
}

export const HEADING_STYLES: Readonly<Record<Exclude<HeadingStyleName, 'standard'>, HeadingStyle>> =
  {
    /** Larger, lighter and tighter. Wants a display font; until the site has one it uses the body font. */
    editorial: {
      weight: 500,
      tracking: '-0.04em',
      scale: { display: 1.1, h1: 1.1, h2: 1.1, h3: 1.05 },
    },
    /** Same sizes, heavier and slightly tighter. */
    modern: { weight: 700, tracking: '-0.03em', scale: { display: 1, h1: 1, h2: 1, h3: 1 } },
    /** A little smaller, at today's weight, with almost no tightening. */
    classic: {
      weight: 600,
      tracking: '-0.01em',
      scale: { display: 0.95, h1: 0.95, h2: 0.95, h3: 1 },
    },
  }

/** The style a stored choice means: unset, Standard and anything unrecognised are today's look. */
export function headingStyleOf(choice: unknown): HeadingStyle {
  return typeof choice === 'string' && Object.hasOwn(HEADING_STYLES, choice)
    ? HEADING_STYLES[choice as keyof typeof HEADING_STYLES]
    : TODAY
}

/** The `:root` variables for a style: only those that differ from today. Pure. */
export function headingStyleVariables(style: HeadingStyle): Record<string, string> {
  const vars: Record<string, string> = { '--heading-weight': String(style.weight) }
  for (const role of SCALED_ROLES) {
    vars[`--text-${role}--letter-spacing`] = style.tracking
    if (style.scale[role] !== 1) {
      vars[`--text-${role}`] = `calc(${tokens.type[role].size} * ${style.scale[role]})`
    }
  }
  return vars
}
