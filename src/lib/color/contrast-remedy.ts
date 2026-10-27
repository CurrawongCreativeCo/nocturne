import { adjustLightnessForContrast } from './contrast'

/**
 * What a contrast warning says and what it can offer, with no Studio code in it. The ratios come
 * from the checks that already exist (theme-colour-contrast, surface-contrast, the overlay checks);
 * this module only words them and finds a fix. The wording states a measured ratio and a target. It
 * never says the page conforms to anything: the measurement is the editor's own, against the
 * colours it knows about, so a pass here is a measurement and not a certificate.
 */

export interface ContrastFinding {
  /** What was measured, as the editor knows it: "Arrow colour", "Border colour". */
  property: string
  /** What it was measured against, with its article: "the card's background". */
  against: string
  ratio: number
  /** 4.5 for text, 3 for large text, icons and lines. */
  required: number
}

const ratioText = (ratio: number) => `${ratio.toFixed(1)}:1`
/** A target as the checks state it: 4.5:1 and 3:1, never 3.0:1. */
const targetText = (required: number) => `${required}:1`

/** Which kind of element the target is for, so the editor learns why it is 4.5:1 here and 3:1 there. */
export function targetNote(required: number): string {
  return required >= 4.5
    ? `Text needs ${targetText(required)}.`
    : `Large text, icons and lines need ${targetText(required)}.`
}

/** The sentence under a contrast badge: the property, what it sits on, the ratio and the target. */
export function describeContrast({ property, against, ratio, required }: ContrastFinding): string {
  const measured = `${property} measures ${ratioText(ratio)} against ${against}.`
  return ratio >= required
    ? `${measured} ${targetNote(required)} That is enough.`
    : `${measured} ${targetNote(required)}`
}

export interface ColourSuggestion {
  hex: string
  /** The ratio the suggested colour reaches, never below the target. */
  ratio: number
}

/**
 * The nearest shade of `foreground` that reaches `required` on `background` (the same lightness
 * search as Brand colours, `adjustLightnessForContrast`), or null when the colour already passes.
 */
export function suggestColour(
  foreground: string,
  background: string,
  required: number,
): ColourSuggestion | null {
  const result = adjustLightnessForContrast(foreground, background, required)
  return result.adjusted && result.ratio >= required
    ? { hex: result.hex, ratio: result.ratio }
    : null
}

/**
 * What the suggestion changes, for the button's description. `overrides` is set where the colour is
 * saved as a Custom colour on an element that was following a design: it says so, because that
 * element stops following the design until it is reset.
 */
export function describeSuggestion(
  suggestion: ColourSuggestion,
  required: number,
  { overrides = false }: { overrides?: boolean } = {},
): string {
  const measured = `${suggestion.hex} measures ${ratioText(suggestion.ratio)} here, above the ${targetText(required)} target. It keeps the colour’s hue and only changes how light it is.`
  return overrides
    ? `${measured} It is saved as a Custom colour, which overrides the Link list design for this element until you reset it.`
    : measured
}

/**
 * The colour an element draws when it is left on Inherit, for the inherits-text that names an exact
 * token. Anything else (Primary, "the link's own colour") draws something this module cannot
 * reproduce exactly, so it is not measured and the editor is told to check the page. A measured
 * guess that passes would be worse than saying nothing.
 */
export function inheritedThemeColour(inherits: string): 'ink' | 'muted' | null {
  switch (inherits) {
    case 'the text colour':
      return 'ink'
    case 'the muted text colour':
      return 'muted'
    default:
      return null
  }
}

export type OutcomeState = 'resolved' | 'remaining' | 'unmeasured'

export interface FixOutcome {
  state: OutcomeState
  text: string
}

const ALTERNATIVES =
  'That needs a different text colour, a solid panel behind it, or a different treatment.'

/**
 * What is true after a fix, from a fresh measurement: resolved, still below the target, or not
 * measurable (an inherited colour that is not an exact token). A fix that only improves things says
 * so and never reads as done.
 */
export function describeOutcome(
  result:
    | {
        measured: true
        property: string
        against: string
        ratio: number
        required: number
        /** The fix raised the measurement but not enough: say improved, not fixed. */
        improved?: boolean
      }
    | { measured: false; inherits: string },
): FixOutcome {
  if (!result.measured) {
    return {
      state: 'unmeasured',
      text: `This now follows ${result.inherits}, which is not measured here. Check it on the page.`,
    }
  }
  const { ratio, required, against, improved } = result
  return ratio >= required
    ? {
        state: 'resolved',
        text: `Now ${ratioText(ratio)} against ${against}, which meets the ${targetText(required)} target.`,
      }
    : {
        state: 'remaining',
        text: `${improved ? 'Improved, not fixed' : 'Not fixed'}: it still measures ${ratioText(ratio)} against ${against}, below the ${targetText(required)} target. ${ALTERNATIVES}`,
      }
}

/** One gradient stop's raise, already named for the editor: "at the top", 24 to 71. */
export interface OverlayRaise {
  place: string
  from: number
  to: number
}

const joinPlaces = (places: readonly string[]) =>
  places.length > 1 ? `${places.slice(0, -1).join(', ')} and ${places.at(-1)}` : (places[0] ?? '')

/**
 * The line under a gradient warning: the worst point, and what the stronger overlay does. A
 * gradient is fixed by raising its opacity and not by a new colour, so the line names each stop and
 * the opacity it would get, says the picture shows less there, and names any stop that no opacity
 * can fix (a calmer picture is the only answer for it).
 */
export function describeOverlayFix({
  ratio,
  required,
  raises,
  stuck,
}: {
  /** The ratio at the worst point of the gradient. */
  ratio: number
  required: number
  /** What the fix would change. */
  raises: readonly OverlayRaise[]
  /** The places no opacity can fix, already named: "in the middle". */
  stuck: readonly string[]
}): string {
  const worst = `At its weakest point, over the lightest or darkest part of a photo, text could drop to ${ratioText(ratio)}. ${targetNote(required)}`
  const left =
    stuck.length > 0
      ? ` No opacity fixes the gradient ${joinPlaces(stuck)} with these colours. ${ALTERNATIVES} A calmer picture there also helps.`
      : ''
  if (raises.length === 0) return `${worst}${left}`
  const steps = raises.map(({ place, from, to }) => `${place} from ${from}% to ${to}%`)
  const partial = stuck.length > 0 ? ' This improves the gradient but does not fully fix it.' : ''
  return `${worst} A stronger overlay raises the gradient ${joinPlaces(steps)}. The picture shows less there.${partial}${left}`
}
