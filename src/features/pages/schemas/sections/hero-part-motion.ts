import { defineField, type ConditionalPropertyCallback, type FieldDefinition } from 'sanity'

import { partPresetsFor } from '@/components/motion/part-motion'
import {
  HERO_PARTS,
  HERO_PART_SPECS,
  HERO_PART_TITLES,
  heroPartsPresent,
  type HeroPart,
} from '@/features/pages/utils/hero-parts'
import { sectionAtStylePath } from '@/lib/sanity/schema/section-form'
import {
  PART_DELAYS,
  PART_DELAY_TITLES,
  PART_PRESET_TITLES,
} from '@/lib/sanity/section-style-options'

/**
 * The hero's "Animate individual parts" (README, "Animating individual parts"): an agency-only switch
 * in the Design tab's Advanced area, and, once it is on, one compact row (animation and delay) per part
 * the chosen layout and content actually has. Which parts exist is `heroPartsPresent`, the same code
 * the page uses, so a row never offers a part the hero does not draw.
 */

/** A row is shown only while the switch is on and the hero has that part. */
const partRowHidden =
  (part: HeroPart): ConditionalPropertyCallback =>
  ({ document, path, parent }) => {
    if ((parent as { enabled?: boolean } | undefined)?.enabled !== true) return true
    // The section is two levels up (partMotion, then the field). When it can't be found, offer the row.
    const hero = sectionAtStylePath(document, path)
    return hero ? !heroPartsPresent(hero).includes(part) : false
  }

const dropdown = (values: readonly string[], titles: Record<string, string>) => ({
  list: values.map((value) => ({ title: titles[value] ?? value, value })),
  layout: 'dropdown' as const,
})

export const heroPartMotionField: FieldDefinition = defineField({
  name: 'partMotion',
  title: 'Animate individual parts',
  type: 'object',
  // The switch and the rows sit directly in Advanced, not in a box of their own.
  options: { frameless: true },
  fieldsets: HERO_PARTS.map((part) => ({
    name: part,
    title: HERO_PART_TITLES[part],
    // Animation and delay side by side: one compact row per part.
    options: { columns: 2 },
  })),
  fields: [
    defineField({
      name: 'enabled',
      title: 'Animate individual parts',
      description:
        'Off, the parts follow the section’s animation. On, give the heading, text, buttons and pictures an animation each. Only the parts this hero has are listed. On the first section of a page the heading and pictures must show whole at once, so they ignore Fade, Reveal and Scale; Rise, Slide and Parallax still work.',
      type: 'boolean',
      initialValue: false,
    }),
    ...HERO_PARTS.flatMap((part) => [
      defineField({
        name: `${part}Preset`,
        title: 'Animation',
        description: part === HERO_PARTS[0] ? 'Inherit follows the section.' : undefined,
        type: 'string',
        fieldset: part,
        initialValue: 'inherit',
        options: dropdown(partPresetsFor(HERO_PART_SPECS[part]), PART_PRESET_TITLES),
        hidden: partRowHidden(part),
      }),
      defineField({
        name: `${part}Delay`,
        title: 'Delay',
        description:
          part === HERO_PARTS[0] ? 'Auto follows the order on this page, 80 ms apart.' : undefined,
        type: 'string',
        fieldset: part,
        initialValue: 'auto',
        options: dropdown(PART_DELAYS, PART_DELAY_TITLES),
        hidden: partRowHidden(part),
      }),
    ]),
  ],
})
