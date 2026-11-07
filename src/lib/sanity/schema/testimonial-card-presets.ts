import type { PresetDefinition } from './preset-field'
import {
  CardPresetOutlinedThumbnail,
  CardPresetQuietThumbnail,
  CardPresetStatementThumbnail,
  CardPresetTintedThumbnail,
} from './thumbnails/testimonials-thumbnails'

/**
 * One-click looks for a testimonial card (written through the Cards box's preset bar, and editable
 * afterwards). They store theme colour names, never raw values, so they follow a later Brand colours
 * change. Each sets the same fields, so moving between them leaves nothing behind. Unset, the card is
 * its default: a solid surface with a thin line.
 */
const look = ({
  background,
  strength = 'solid',
  border = 'none',
  borderColour = 'muted',
  size = 'medium',
  fontStyle = 'normal',
  smallText = 'muted',
}: {
  background: string
  strength?: string
  border?: string
  borderColour?: string
  size?: string
  fontStyle?: string
  /** The small lines under the name: the lightest strength of a fill is too strong for muted text. */
  smallText?: string
}) => ({
  'background.colour': background,
  backgroundStrength: strength,
  border,
  'borderColour.colour': borderColour,
  'quote.size': size,
  'quote.fontStyle': fontStyle,
  'attribution.colour.colour': 'ink',
  'label.colour.colour': smallText,
})

/** What a quote card draws each role in with nothing chosen (quote-card.tsx). */
export const TESTIMONIAL_ROLE_COLOURS = {
  quote: 'ink',
  attribution: 'muted',
  label: 'muted',
} as const

export const TESTIMONIAL_CARD_PRESETS: readonly PresetDefinition[] = [
  {
    value: 'quiet',
    title: 'Quiet',
    description: 'No card: the words sit straight on the section.',
    thumbnail: CardPresetQuietThumbnail,
    set: look({ background: 'transparent' }),
  },
  {
    value: 'outlined',
    title: 'Outlined',
    description: 'A clear line in the primary colour, with no fill.',
    thumbnail: CardPresetOutlinedThumbnail,
    set: look({ background: 'transparent', border: 'thin', borderColour: 'accent' }),
  },
  {
    value: 'tinted',
    title: 'Tinted',
    description: 'A light wash of the primary colour.',
    thumbnail: CardPresetTintedThumbnail,
    set: look({ background: 'accent', strength: 'light', smallText: 'ink' }),
  },
  {
    value: 'statement',
    title: 'Statement',
    description: 'A larger italic quote with no card.',
    thumbnail: CardPresetStatementThumbnail,
    set: look({ background: 'transparent', size: 'large', fontStyle: 'italic' }),
  },
]
