import { stegaClean } from 'next-sanity'

import type { ActionDistance } from '@/components/ui/action-indicator'

import {
  ACTION_MOTIONS,
  LINK_ARROWS,
  type ActionMotion,
  type LinkArrowStyle,
} from './link-arrow-options'
import type { ThemeColourInput } from './theme-colour'

/**
 * A card's action indicator choices (task 137), as a query returns them from the Cards box. Unset
 * means the place's own: what a card drew before there was a choice.
 */
export interface CardActionInput {
  actionStyle?: string | null
  actionMotion?: string | null
  actionColour?: ThemeColourInput | null
}

/** What a place draws with nothing chosen. `distance` keeps a movement the place always had. */
export interface OwnAction {
  glyph: LinkArrowStyle
  motion: ActionMotion
  distance?: ActionDistance
}

export interface CardAction {
  glyph: LinkArrowStyle
  motion: ActionMotion
  distance: ActionDistance
  colour: ThemeColourInput | null | undefined
}

/**
 * The indicator a card draws: the choice, or the place's own for what is unset. A distance the place
 * always had applies only while its motion is unchanged; choosing Nudge or Lift gets the preset's 3 px.
 */
export function resolveCardAction(
  input: CardActionInput | null | undefined,
  own: OwnAction,
): CardAction {
  const style = stegaClean(input?.actionStyle)
  const motion = stegaClean(input?.actionMotion)
  const glyph = LINK_ARROWS.find((option) => option === style) ?? own.glyph
  const chosenMotion = ACTION_MOTIONS.find((option) => option === motion)
  return {
    glyph,
    motion: chosenMotion ?? own.motion,
    distance: chosenMotion === undefined ? (own.distance ?? 'standard') : 'standard',
    colour: input?.actionColour,
  }
}
