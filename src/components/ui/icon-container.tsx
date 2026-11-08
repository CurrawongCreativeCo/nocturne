import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from 'react'

import type { GlassStrength } from '@/lib/color/glass-contrast'
import { SHAPE_RADIUS } from '@/lib/sanity/social-style-options'
import {
  glassSurfaceLook,
  iconLook,
  type IconDesign,
  type OwnIcon,
} from '@/lib/sanity/surface-options'

// The frosted surface of Glass rows (`.glass-row` in globals.css), so icons and rows match.
const GLASS = 'glass-row text-ink'
const GLASS_STRENGTH: Record<GlassStrength, string> = {
  light: 'glass-row-light',
  medium: '',
  strong: 'glass-row-strong',
}

/** A 44 px target, the size of a social icon's container. */
export const ICON_BOX_TOUCH = 'size-11'

type Props = Omit<ComponentPropsWithoutRef<'a'>, 'color'> & {
  children: ReactNode
  /** What is chosen: shape, fill, strength, border and colour, one property at a time. */
  design?: IconDesign
  /** What the place draws with nothing chosen. */
  own: OwnIcon
  /** The container's width and height classes. */
  size?: string
  /** Solid takes the surface's fill; glass is the frosted surface of Glass rows. */
  surface?: 'solid' | 'glass'
  strength?: GlassStrength
  /** `a` makes the container the link itself, as the social icons are. */
  as?: 'span' | 'a'
  /** The layout of the container and its icon. */
  base?: string
  /** Extra classes for a plain icon's own box (its hover, for a link). */
  plainClassName?: string
  /** Keep the box for a plain icon, so rows with and without containers line up. */
  keepBox?: boolean
  style?: CSSProperties
}

/**
 * The one container an icon sits in (task 158): its shape, fill, strength, border, colour and size.
 * `iconLook` turns the choices into classes (a plain icon has no container, so fill and border don't
 * apply); the Link list's icons, the social icons and the badges all come through here.
 */
export function IconContainer({
  children,
  design = {},
  own,
  size = '',
  surface = 'solid',
  strength = 'medium',
  as = 'span',
  base = 'grid shrink-0 place-items-center',
  plainClassName = '',
  keepBox = false,
  className = '',
  style,
  ...rest
}: Props) {
  const Tag: ElementType = as
  const solid = iconLook(design, own)
  const glass = surface === 'glass' && solid.shape !== 'plain'
  const glassLook = glass ? glassSurfaceLook(design, { strength }) : undefined
  const shape = solid.shape
  const look = glassLook
    ? {
        className:
          `${SHAPE_RADIUS[shape as keyof typeof SHAPE_RADIUS]} ${GLASS} ${GLASS_STRENGTH[strength]}`.trim(),
        style:
          design.colour || glassLook.style
            ? { color: design.colour, ...glassLook.style }
            : undefined,
      }
    : solid
  const merged: CSSProperties | undefined =
    look.style || style ? { ...look.style, ...style } : undefined

  if (shape === 'plain' && !keepBox && as === 'span') {
    return look.className || merged ? (
      <span className={`contents ${look.className}`.trim()} style={merged}>
        {children}
      </span>
    ) : (
      <>{children}</>
    )
  }
  const classes = [base, size, shape === 'plain' ? plainClassName : '', look.className, className]
    .filter(Boolean)
    .join(' ')
  return (
    <Tag
      {...rest}
      className={classes}
      style={merged}
      data-icon-shape={as === 'span' ? shape : undefined}
    >
      {children}
    </Tag>
  )
}
