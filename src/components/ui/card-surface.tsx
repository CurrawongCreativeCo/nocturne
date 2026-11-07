import { createElement, type ElementType, type ReactNode } from 'react'

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
  design,
  children,
}: {
  as: ElementType
  /** Every class the family draws with nothing chosen, its surface included. */
  className: string
  /** Which of those classes are the surface's. */
  own: OwnRingSurface
  shadow?: string
  design: SurfaceDesign
  children: ReactNode
}) {
  const look = ringSurfaceLook(design, own)
  const swapped = swapClasses(
    className,
    `${own.background} ${own.border}`,
    look.style ? look.className : `${own.background} ${own.border}`,
  )
  return createElement(
    as,
    {
      className: design.background === 'transparent' ? swapClasses(swapped, shadow, '') : swapped,
      style: look.style,
    },
    children,
  )
}
