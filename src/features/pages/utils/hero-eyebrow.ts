import {
  resolveInlineListDesign,
  type InlineListDesignInput,
} from '@/lib/sanity/inline-list-options'

/** The hero owns the type size and capitals; Design only changes separators and colours. */
export function resolveHeroEyebrowDesign(design: InlineListDesignInput | null | undefined) {
  return resolveInlineListDesign({
    separator: design?.separator,
    textColour: design?.textColour,
    separatorColour: design?.separatorColour,
    size: 'small',
    weight: 'semibold',
    textCase: 'uppercase',
  })
}
