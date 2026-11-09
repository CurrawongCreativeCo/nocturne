import { createElement, type ElementType, type ReactNode } from 'react'

import { DecorativeMark, type DecorativeMarkProps } from '@/components/ui/decorative-mark'
import { resolveDecorativeMark } from '@/lib/sanity/decorative-mark-options'
import type { ElementDepth } from '@/lib/sanity/depth-options'
import {
  ringSurfaceLook,
  type OwnRingSurface,
  type SurfaceDesign,
} from '@/lib/sanity/surface-options'
import { swapClasses } from '@/lib/sanity/swap-classes'

/**
 * A card family's own element, with a chosen fill and border (task 156): only the classes for chosen
 * properties are replaced, so with nothing chosen the element is exactly what the family drew. It is not
 * a universal card: each family keeps its element, layout and spacing. `shadow` is the family's own
 * shadow classes: a transparent card has no edge for a shadow to sit on, so it drops them.
 */
export function CardSurface({
  as,
  className,
  own,
  shadow = '',
  depth,
  lift = false,
  drawnClass,
  design,
  mark,
  children,
}: {
  as: ElementType
  /** Every class the family draws with nothing chosen, its surface included. */
  className: string
  /** Which of those classes are the surface's. */
  own: OwnRingSurface
  shadow?: string
  /** A chosen shadow level or glow (resolveCardDepth), put in place of `shadow`. A transparent card has no edge for it, so it drops it too. */
  depth?: ElementDepth
  /**
   * The card is one link and lifts under the pointer or keyboard focus (resolveCardLift). Wraps it in a
   * block that carries the movement and a shadow layer, so an `overflow-hidden` card can't clip either.
   */
  lift?: boolean
  /** Added once a fill or border is chosen, for a family with no surface of its own (a post card's corners and padding). */
  drawnClass?: string
  design: SurfaceDesign
  /** The family's mark at this level (DecorativeMark), drawn behind its content, over its fill. */
  mark?: Omit<DecorativeMarkProps, 'nested'>
  children: ReactNode
}) {
  const look = ringSurfaceLook(design, own)
  const hasMark = resolveDecorativeMark(mark?.input) !== null
  const swapped = swapClasses(
    className,
    `${own.background} ${own.border}`,
    look.style ? look.className : `${own.background} ${own.border}`,
  )
  const transparent = design.background === 'transparent'
  const lifted = depth && !transparent ? depth : undefined
  const surface = transparent
    ? swapClasses(swapped, shadow, '')
    : lifted
      ? swapClasses(swapped, shadow, lifted.className)
      : swapped
  const props = {
    className: `${surface}${look.style && drawnClass ? ` ${drawnClass}` : ''}${hasMark ? ' relative isolate' : ''}`,
    style: lifted ? { ...look.style, ...lifted.style } : look.style,
  }
  // Only present with a mark: an empty slot would shift every useId inside the card.
  const card =
    mark && hasMark
      ? createElement(as, props, <DecorativeMark {...mark} nested />, children)
      : createElement(as, props, children)
  return lift ? (
    <div className="card-lift">
      <span aria-hidden="true" className="card-lift__shadow" />
      {card}
    </div>
  ) : (
    card
  )
}
