import { useFormValue, type StringInputProps } from 'sanity'

import { cardSurface, type StoredCardSurface } from '@/lib/color/card-contrast'
import { glassRowsStrength } from '@/lib/color/glass-contrast'
import { surfaceColourCheck } from '@/lib/color/surface-contrast'
import { themeColourContrast, type ColourUsage } from '@/lib/color/theme-colour-contrast'
import { headingTone } from '@/lib/sanity/heading-text'

import { itemPathOf, sectionPathOf } from './theme-colour'
import { useBrandColours } from './use-brand-colours'

interface Section {
  _type?: string
  style?: { tone?: string; image?: { asset?: unknown } } | null
  variant?: string
  rowStyle?: string
  glassStrength?: string
  cardDesign?: StoredCardSurface
}

export interface ElementContrast {
  /** What was measured, as the field is titled: "Arrow colour". */
  property: string
  /** What it was measured against, with its article. */
  against: string
  /** Where a picture sits behind the background, which the check cannot measure. */
  note: string
  usage: ColourUsage
  check: {
    foreground: string
    background: string
    ratio: number
    required: number
    pass: boolean
  } | null
  /** True when the colour is a card's background: the label is what is measured on it. */
  onCardBackground: boolean
  /** Decoration: no contrast target applies, so there is no check and no fix. */
  decorative: boolean
  /** What Inherit follows, in words: "the text colour". */
  inherits: string | undefined
  /** On Inherit, and what it follows cannot be measured exactly here: say to check the page. */
  inheritUnmeasured: boolean
  /** The section's tone, for anything that draws the colour. */
  tone: string | undefined
  /** The site's Brand colours are in use, or the defaults. */
  brand: ReturnType<typeof useBrandColours>
}

/**
 * How readable one element colour of a Link list (or any `themeColourField`) is, measured the way
 * the page draws it: on the section's background, on the glass over the worst photo, or on the card
 * as the list and the link layer it. Both the colour choice and its Custom hex read it, so the two
 * never disagree. `choice` is the colour the field holds, which the hex input knows is `custom`.
 */
export function useElementContrast(
  props: StringInputProps,
  choice: { colour: string; hex?: string },
): ElementContrast {
  const { schemaType, path } = props
  const options = schemaType.options
  const usage: ColourUsage = options?.themeColourPicker ?? options?.themeColourHex ?? 'graphic'
  const inItem = options?.themeColourInItem === true
  const sectionPath = sectionPathOf(path, { inItem })
  const section = useFormValue(sectionPath ?? ['_type']) as Section | undefined
  const tone = sectionPath ? headingTone(section) : undefined
  const brand = useBrandColours()
  const rowsGlass = glassRowsStrength(section)
  const glass = options?.themeColourRows ? rowsGlass : null
  const onCard = options?.themeColourCard
  const itemPath = inItem ? itemPathOf(path) : null
  const item = useFormValue(itemPath ?? ['_type']) as
    { design?: StoredCardSurface & { appearance?: string } } | undefined

  const card =
    onCard && !options.themeColourDecorative
      ? surfaceColourCheck({
          role: onCard,
          current: choice.colour,
          hex: choice.hex,
          // The field's own level: the link's Appearance, or the list's Cards box.
          inherited: cardSurface(section?.cardDesign),
          own: itemPath
            ? cardSurface(item?.design?.appearance === 'custom' ? item.design : {})
            : undefined,
          tone,
          glass: rowsGlass,
          site: brand.colours,
        })
      : null
  const decorative = options?.themeColourDecorative === true
  // Inherit is measured only where it follows an exact theme token (the text colours); anywhere else it
  // draws something this cannot reproduce, and a guess that passes would hide a real problem.
  const inheritedColour = options?.themeColourInheritedColour
  const measuredColour =
    choice.colour === 'inherit' && inheritedColour ? inheritedColour : choice.colour
  const check = decorative
    ? null
    : (card ??
      themeColourContrast(measuredColour, choice.hex, tone, usage, { site: brand.colours, glass }))
  const overPicture = !glass && !card && Boolean(section?.style?.image?.asset)

  const against = card
    ? onCard === 'background'
      ? 'the card’s label'
      : 'the card’s background'
    : glass
      ? 'the glass, over the lightest or darkest part of a photo'
      : 'the section’s background'

  return {
    property: options?.themeColourTitle ?? schemaType.title ?? 'This colour',
    against,
    note: overPicture
      ? 'The background colour is measured, not the picture: check it over the picture too.'
      : '',
    usage,
    check: check
      ? {
          foreground: check.foreground,
          background: check.background,
          ratio: check.ratio,
          required: check.required,
          pass: check.pass,
        }
      : null,
    decorative,
    inherits: options?.themeColourInherits,
    inheritUnmeasured: !decorative && choice.colour === 'inherit' && !card && !inheritedColour,
    onCardBackground: onCard === 'background',
    tone,
    brand,
  }
}
