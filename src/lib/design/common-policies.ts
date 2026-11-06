import { notApplicable, type ConditionalPolicy, type Trigger } from './capabilities'

/**
 * Reasons and triggers that many declarations share, so the same situation is always worded the same
 * way (README, "Design capability contract": recording Not applicable).
 */

export const REASONS = {
  hosted: 'A slot block sits inside its host section, which owns this',
  noIcon: 'Draws no icon from the set',
  noShadowSurface: 'No surface for a shadow to sit on (146)',
  noFramedPicture: 'Has no framed picture',
  noCroppedPicture: 'Has no cropped picture',
  noWholeCardLink: 'No link covers a whole card',
  notASlotFamily: 'Not a slot family (DE-2: slots only where two real designs need them)',
  usesPanel: 'Uses Panel (task 218), not a card surface (156 item 10)',
  functional: 'A functional element: no marks on embeds or video players (156 part A5)',
} as const

export const NOT_APPLICABLE = Object.fromEntries(
  Object.entries(REASONS).map(([key, reason]) => [key, notApplicable(reason)]),
) as { readonly [Key in keyof typeof REASONS]: ReturnType<typeof notApplicable> }

/** Focus mode on the shared background picture (task 177), once one is set. */
export const BACKGROUND_PICTURE: Trigger = {
  kind: 'setting',
  when: 'A background picture is set: Focus mode',
  path: 'style.image',
}

/** A trailing indicator on the section's buttons (137 item 5, with 148). */
export const CALL_TO_ACTION: Trigger = {
  kind: 'setting',
  when: 'The section has a call to action: a trailing indicator on its buttons',
  path: 'ctas',
}

/** Glass on a card, once the card's surface can be set to Glass. */
export const GLASS_CARD: Trigger = {
  kind: 'setting',
  when: 'The card’s surface kind is Glass',
}

/** Background framing as its own part, for a component whose other pictures are framed too. */
export const backgroundFraming = <Layout extends string>(
  layouts?: ConditionalPolicy<Layout>['layouts'],
): ConditionalPolicy<Layout> => ({
  policy: 'conditional',
  scope: 'section',
  part: 'background',
  trigger: BACKGROUND_PICTURE,
  ...(layouts ? { layouts } : {}),
})
