import type { CSSProperties, ReactNode } from 'react'

import { CardSurface } from '@/components/ui/card-surface'
import { resolveCardDesign } from '@/lib/sanity/card-design'
import {
  CARD_SHADOW_CLASS,
  OWN_SHADOW,
  resolveCardDepth,
  type CardDepthLevel,
} from '@/lib/sanity/depth-options'
import type { SurfaceInput } from '@/lib/sanity/surface-options'

/** The Cards box of a form, a newsletter signup or an embed, as the page query returns it (task 148). */
export type FormCardDesign = SurfaceInput & CardDepthLevel

/**
 * The card's standard look, which a depth-only choice draws and a chosen surface changes one property at
 * a time: the same tinted, outlined card the Location section's details sit on.
 */
export const FORM_CARD = `rounded-card bg-surface-alt p-8 ${CARD_SHADOW_CLASS.free} ring-1 ring-line`
export const FORM_CARD_SURFACE = {
  background: 'bg-surface-alt',
  border: 'ring-1 ring-line',
  fill: 'var(--color-surface-alt)',
  still: true,
}

/**
 * Whether the section itself chose a card: a fill, border, shadow level or glow in its Cards box. A site's
 * Card depth alone is not a choice, so a form with nothing set keeps its original markup. A glow chosen Off
 * with no shadow level is not one either (`depthLook` has nothing to draw).
 */
export function choseFormCard(cardDesign: FormCardDesign | null | undefined): boolean {
  if (!cardDesign) return false
  const { surface } = resolveCardDesign(cardDesign, [])
  return (
    Object.keys(surface).length > 0 || resolveCardDepth([cardDesign], OWN_SHADOW.none) !== undefined
  )
}

/** The element, marked so the evidence can find it; it takes the classes and style `CardSurface` computes. */
function FormCardBox({
  className,
  style,
  children,
}: {
  className?: string
  style?: CSSProperties
  children?: ReactNode
}) {
  return (
    <div data-form-card="" className={className} style={style}>
      {children}
    </div>
  )
}

/**
 * The card around a form or a signup form. No wrapper at all until the section chooses a surface or a depth
 * (children are returned as they were); a depth alone draws the standard card, and once there is a card the
 * site's Card depth reaches it like every card's. A transparent fill leaves no edge for a shadow to sit
 * on, so it draws none (`CardSurface`).
 */
export function FormCard({
  cardDesign,
  children,
}: {
  cardDesign: FormCardDesign | null | undefined
  children: ReactNode
}) {
  if (!choseFormCard(cardDesign)) return <>{children}</>
  const { surface } = resolveCardDesign(cardDesign, [])
  return (
    <CardSurface
      as={FormCardBox}
      className={FORM_CARD}
      own={FORM_CARD_SURFACE}
      shadow={CARD_SHADOW_CLASS.free}
      depth={resolveCardDepth([cardDesign], OWN_SHADOW.siteCardFree)}
      design={surface}
    >
      {children}
    </CardSurface>
  )
}
