import { stegaClean } from 'next-sanity'

import {
  resolvePartMotion,
  type PartOverride,
  type PartPlan,
  type PartSpec,
} from '@/components/motion/part-motion'
import {
  sectionMotion,
  type SectionDefaults,
  type SectionStyleInput,
} from '@/components/ui/section-style'

/**
 * The hero's animatable parts (README, "Animating individual parts"). The order is the Auto timing
 * sequence and the order of the rows in the Studio; the specs say what each part is to the resolver
 * (components/motion/part-motion.ts), so adding a part is one line here plus its element in
 * hero-text.tsx, and the Studio rows and the fragment follow.
 */
export const HERO_PARTS = [
  'eyebrow',
  'heading',
  'description',
  'buttons',
  'slot',
  'image',
  'background',
] as const
export type HeroPart = (typeof HERO_PARTS)[number]

export const HERO_PART_TITLES: Record<HeroPart, string> = {
  eyebrow: 'Eyebrow',
  heading: 'Heading',
  description: 'Intro text',
  buttons: 'Buttons',
  slot: 'Extra content',
  image: 'Picture',
  background: 'Background picture',
}

/**
 * What each part is. The text beside the first section's picture is what the page is judged on, so
 * the heading and both pictures never start hidden there; the intro, buttons and extra content rise
 * on load by default, as the hero always has.
 */
export const HERO_PART_SPECS: Record<HeroPart, PartSpec> = {
  eyebrow: { media: false, sequenced: true, lcp: false, default: 'none' },
  heading: { media: false, sequenced: true, lcp: true, default: 'none' },
  description: { media: false, sequenced: true, lcp: false, default: 'rise' },
  buttons: { media: false, sequenced: true, lcp: false, default: 'rise' },
  slot: { media: false, sequenced: true, lcp: false, default: 'rise' },
  image: { media: 'beside', sequenced: false, lcp: true, default: 'none' },
  background: { media: 'background', sequenced: false, lcp: true, default: 'none' },
}

type Picture = { asset?: unknown } | null | undefined

/** The hero fields that decide which parts exist. Structural, so a query result and a Studio value both fit. */
export interface HeroPartsInput {
  variant?: string | null
  eyebrow?: string | null
  description?: string | null
  ctas?: readonly unknown[] | null
  backgroundImage?: Picture
  secondaryImage?: Picture
  supporting?: readonly unknown[] | null
}

/**
 * The parts this hero has: the chosen layout and the content decide. The heading is always there;
 * a picture is the Picture part beside the text (Split, Editorial's small one) or the Background
 * behind it (Full background, Image with panel). A part with no content has no row and no element.
 */
export function heroPartsPresent(hero: HeroPartsInput): HeroPart[] {
  const beside = hero.variant === 'split' || hero.variant === 'editorial'
  const picture = hero.variant === 'editorial' ? hero.secondaryImage : hero.backgroundImage
  const present: Record<HeroPart, boolean> = {
    eyebrow: Boolean(hero.eyebrow),
    heading: true,
    description: Boolean(hero.description),
    buttons: Boolean(hero.ctas?.length),
    slot: Boolean(hero.supporting?.length),
    image: beside && Boolean(picture?.asset),
    background: !beside && Boolean(hero.backgroundImage?.asset),
  }
  return HERO_PARTS.filter((part) => present[part])
}

/** The stored `partMotion` object: a switch, then a preset and a delay per part. Untrusted. */
export type HeroPartMotionInput = {
  enabled?: boolean | null
} & { [K in HeroPart as `${K}Preset` | `${K}Delay`]?: string | null }

export function heroPartOverrides(
  input: HeroPartMotionInput | null | undefined,
): Record<HeroPart, PartOverride> {
  return Object.fromEntries(
    HERO_PARTS.map((part) => [
      part,
      { preset: input?.[`${part}Preset`], delay: input?.[`${part}Delay`] },
    ]),
  ) as Record<HeroPart, PartOverride>
}

/**
 * What every part of a hero does: the section's animation, then the parts' own choices on top.
 * Only a background picture can be moved by the section's Float or Parallax (the layouts that have
 * one), so a preset left over from another layout never moves a Split picture.
 */
export function resolveHeroParts(
  hero: HeroPartsInput & {
    style?: SectionStyleInput | null
    partMotion?: HeroPartMotionInput | null
  },
  defaults: SectionDefaults,
  isFirst: boolean,
): Partial<Record<HeroPart, PartPlan>> {
  const present = heroPartsPresent({ ...hero, variant: stegaClean(hero.variant) })
  const section = sectionMotion(hero.style, defaults, {
    isFirst,
    hasMedia: present.includes('background'),
    placement: 'background',
  })
  return resolvePartMotion({
    specs: HERO_PART_SPECS,
    present,
    enabled: hero.partMotion?.enabled === true,
    overrides: heroPartOverrides(hero.partMotion),
    section,
    context: { isFirst, reducedMotion: false },
  })
}
