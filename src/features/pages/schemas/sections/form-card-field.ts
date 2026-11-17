import { cardDesignField } from '@/lib/sanity/schema/card-design-fields'

/**
 * The Cards box of a section that draws one thing on a card of its own: a form, a signup form or an embed's
 * facade (task 148). The fill, border and shadow come from the shared builders; there are no text roles or
 * mark, because the card holds a form (or the provider's card) whose text the section does not style.
 * `colour` is what the text on the card is drawn in, for the Background's contrast warning.
 */
export function formCardField({
  subject,
  unset,
  colour,
}: {
  /** What the card holds, for the description: "the form", "the signup form". */
  subject: string
  /** What an empty choice draws: "no card, the form sits on the section". */
  unset: string
  colour: 'ink' | 'muted'
}) {
  return cardDesignField({
    description: `The card around ${subject}: fill, border and shadow. ${unset}`,
    roles: [],
    mark: false,
    inherits: unset.replace(/\.$/, '').toLowerCase(),
    depth: { inherits: 'the site’s Card depth, once a card is drawn' },
    defaults: { body: colour },
    contrast: {
      roles: ['body'],
      message: (ratio) =>
        `Text on the card may be hard to read on this background: ${ratio}:1 (text needs 4.5:1). Choose a stronger or different colour.`,
    },
  })
}
