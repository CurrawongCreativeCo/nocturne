import { stegaClean } from 'next-sanity'

import { MotionDiv } from '@/components/motion/motion-elements'
import { partProps, type PartPlan } from '@/components/motion/part-motion'
import {
  HERO_SLOT_SPACING,
  heroSlotPlacement,
  type HeroSlotPlacement,
} from '@/features/pages/utils/hero-slot'

import { renderSlot } from '../../../slots/render-slot'
import type { SectionProps } from '../../../types'

type HeroData = SectionProps<'hero'>['data']

interface Props {
  data: HeroData
  /** The spot the calling layout has. The slot renders only if the placement map gives its layout this one. */
  placement: HeroSlotPlacement
  centred: boolean
  animate: boolean
  /** What the slot does on load (`resolveHeroParts`); with none it simply appears. */
  plan?: PartPlan
}

/**
 * Draws the hero's slot (`hero.supporting`, drawn by the shared `renderSlot`), if it has one and this is where its layout puts it (`utils/hero-slot.ts`).
 * Its animation is the hero's `slot` part (README, "Animating individual parts"): by default it rises
 * after the buttons, in the same sequence under the buttons or beside the text. Reduced motion and no
 * JavaScript show it at once (`data-reveal`, globals.css).
 */
export function HeroSlot({ data, placement, centred, animate, plan }: Props) {
  const item = data.supporting?.[0]
  if (!item || heroSlotPlacement(stegaClean(data.variant)) !== placement) return null

  // A block from a later release (a type this deployment does not know) is skipped, not a crash.
  const block = renderSlot({ item, centred, animate })
  if (!block) return null

  return (
    <MotionDiv
      {...partProps(plan)}
      data-hero-slot={stegaClean(item._type)}
      className={HERO_SLOT_SPACING[placement]}
    >
      {block}
    </MotionDiv>
  )
}
