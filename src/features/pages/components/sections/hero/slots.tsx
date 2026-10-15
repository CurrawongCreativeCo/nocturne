import { stegaClean } from 'next-sanity'
import type { ComponentType } from 'react'

import { MotionDiv } from '@/components/motion/motion-elements'
import { fadeUpAfter, revealChild, revealOnLoad } from '@/components/motion/presets'
import { BadgeRow } from '@/components/ui/badge-row'
import { LogoRow } from '@/components/ui/logo-row'
import { StatsBar } from '@/components/ui/stats-bar'
import {
  HERO_SLOT_SPACING,
  heroSlotPlacement,
  type HeroSlotPlacement,
} from '@/features/pages/utils/hero-slot'

import type { SectionProps } from '../../../types'

type HeroData = SectionProps<'hero'>['data']
type SlotItem = NonNullable<HeroData['supporting']>[number]
type SlotType = SlotItem['_type']

interface SlotProps<T extends SlotType> {
  /** The slot's item, projected by `heroSupportingFields`. */
  item: Extract<SlotItem, { _type: T }>
  /** The hero's text is centred, so the slot centres too. */
  centred: boolean
  /** The hosting section's Animation is not None, so figures may count up. */
  animate: boolean
}

/**
 * The hero's supporting slot: each approved type (schema: `supporting` in schemas/sections/hero.ts)
 * and the compact component that draws it. These components have no frame and no colours of their own
 * (they take the hero's tone) and size themselves to the room they are given, so every layout can
 * host any of them. Adding a type is one schema object, one component and one line here, and the
 * type checker fails until the line exists (README, "Adding a hero slot").
 */
const SLOTS: { [T in SlotType]: ComponentType<SlotProps<T>> } = {
  statsBar: ({ item, centred, animate }) => (
    <StatsBar items={item.items} caption={item.caption} centred={centred} animate={animate} />
  ),
  badgeRow: ({ item, centred }) => <BadgeRow badges={item.badges} centred={centred} />,
  logoRow: ({ item, centred }) => (
    <LogoRow logos={item.logos} greyscale={item.greyscale !== false} centred={centred} />
  ),
}

interface Props {
  data: HeroData
  /** The spot the calling layout has. The slot renders only if the placement map gives its layout this one. */
  placement: HeroSlotPlacement
  centred: boolean
  animate: boolean
}

/**
 * Draws the hero's slot, if it has one and this is where its layout puts it (`utils/hero-slot.ts`).
 * Under the buttons it joins the hero's stagger as the next child, so `HeroText` must render it inside
 * its stagger container; beside the text it fades up on its own, timed to start after the buttons.
 * Reduced motion and no JavaScript show it at once (`data-reveal`, globals.css).
 */
export function HeroSlot({ data, placement, centred, animate }: Props) {
  const item = data.supporting?.[0]
  if (!item || heroSlotPlacement(stegaClean(data.variant)) !== placement) return null

  // An item from a later release (a type this deployment does not know) is skipped, not a crash.
  const Component = SLOTS[stegaClean(item._type)] as ComponentType<SlotProps<SlotType>> | undefined
  if (!Component) return null

  const motion = placement === 'beside-text' ? revealOnLoad(fadeUpAfter(2)) : revealChild()

  return (
    <MotionDiv
      {...motion}
      data-hero-slot={stegaClean(item._type)}
      className={HERO_SLOT_SPACING[placement]}
    >
      <Component item={item} centred={centred} animate={animate} />
    </MotionDiv>
  )
}
