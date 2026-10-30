import { stegaClean } from 'next-sanity'
import type { ComponentType } from 'react'

import { BadgeRow } from '@/components/ui/badge-row'
import { LaunchDateLine } from '@/components/ui/launch-date-line'
import { LogoRow } from '@/components/ui/logo-row'
import { StatsBar } from '@/components/ui/stats-bar'

import type { SlotBlockType } from './registry'
import { SlotVideo } from './slot-video'
import type { SectionProps } from '../types'

/**
 * One slot item as the page query projects it. Every family's slot uses the same block fragments, so
 * the hero's union describes them all; a family whose slot takes fewer blocks simply never sees some.
 */
export type SlotItem = NonNullable<SectionProps<'hero'>['data']['supporting']>[number]

interface SlotProps<T extends SlotBlockType> {
  /** The block, projected by `heroSupportingFields` (fragments.ts). */
  item: Extract<SlotItem, { _type: T }>
  /** The host's text is centred, so the block centres too. */
  centred: boolean
  /** The host section's Animation is not None, so figures may count up. */
  animate: boolean
}

/**
 * The component for each block (the rules are in `registry.ts`). These have no frame and no colours of
 * their own (they take the host's tone) and size themselves to the room they are given, so any slot
 * can host any block it is allowed in. Keyed by every block type, so the type checker fails until a
 * new block has its line (README, "Adding a slot block").
 */
const COMPONENTS: { [T in SlotBlockType]: ComponentType<SlotProps<T>> } = {
  statsBar: ({ item, centred, animate }) => (
    <StatsBar items={item.items} caption={item.caption} centred={centred} animate={animate} />
  ),
  badgeRow: ({ item, centred }) => <BadgeRow badges={item.badges} centred={centred} />,
  logoRow: ({ item, centred }) => (
    <LogoRow logos={item.logos} greyscale={item.greyscale !== false} centred={centred} />
  ),
  launchDate: ({ item, centred }) => <LaunchDateLine item={item} centred={centred} />,
  slotVideo: ({ item, centred }) => <SlotVideo item={item} centred={centred} />,
}

/** The components, for the registry test: every block type has one. */
export const SLOT_COMPONENTS: Readonly<Record<SlotBlockType, unknown>> = COMPONENTS

interface Props {
  item: SlotItem | null | undefined
  centred: boolean
  animate: boolean
}

/**
 * Draws a slot's block, or nothing when the slot is empty. A block from a later release (a type this
 * deployment does not know) is skipped, not a crash. The host owns what surrounds it: its placement,
 * spacing and animation.
 */
export function renderSlot({ item, centred, animate }: Props) {
  if (!item) return null
  const Component = COMPONENTS[stegaClean(item._type)] as
    ComponentType<SlotProps<SlotBlockType>> | undefined
  if (!Component) return null
  return <Component item={item} centred={centred} animate={animate} />
}
