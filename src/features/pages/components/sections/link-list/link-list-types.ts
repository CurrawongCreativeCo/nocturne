import type { CSSProperties, ReactNode } from 'react'

import type { ProfileImageScale } from '@/components/ui/profile-image'
import type { SectionDefaults } from '@/components/ui/section-style'
import type { GlassStrength } from '@/lib/color/glass-contrast'
import type { BoxDepth } from '@/lib/sanity/depth-options'
import type { LinkArrowStyle } from '@/lib/sanity/link-arrow-options'

import type { SectionProps } from '../../../types'
import type { LinkCardDesign } from '../../../utils/link-card-design'
import type { DrawnLink } from '../../../utils/link-list-items'

type Data = SectionProps<'linkList'>['data']
export type StoredLink = NonNullable<Data['links']>[number]
export type ListLink = DrawnLink<StoredLink>

/** What a layout supplies: how it starts, how its header and list look, and how a link is drawn. */
export interface LinkListLayout {
  /** How this layout looks without a style. Keep `align` equal to the matching preset's. */
  defaults: SectionDefaults
  /** Size of the profile block: the picture at each size (Medium is the layout's own), and the name. */
  profile: { picture: ProfileImageScale; name: string }
  /** Classes for the `<ul>` of one group. */
  listClassName: string
  renderLink: (link: ListLink, context: LinkContext) => ReactNode
}

export interface LinkContext {
  /** Whether the section's background is dark, which decides the button colours. */
  surface: 'dark' | 'light'
  thumbnailSize: 'standard' | 'large'
  /** Minimal only: plain buttons, or the frosted rows of the Glass rows preset. */
  rowStyle: 'solid' | 'glass'
  glassStrength: GlassStrength
  /** The indicator at the end of this link: its own, else the list's Arrow style, else the layout's. */
  arrow: LinkArrowStyle
  /** The arrow's colour, as an inline style; undefined keeps the layout's colour. */
  arrowStyle: CSSProperties | undefined
  /** Depth and glow for this link (its own shadow, else the list's), given the shadow it draws on its own. */
  linkDepth: BoxDepth
  /** This link's card design: the list's Cards and icons, with the link's own Appearance over it. */
  design: LinkCardDesign
}
