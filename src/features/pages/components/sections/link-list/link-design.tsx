import { stegaClean } from 'next-sanity'
import type { CSSProperties, ReactNode } from 'react'

import { BadgeIcon } from '@/components/ui/badge-icon'
import { SanityImage } from '@/components/ui/sanity-image'
import { trackAttributes } from '@/lib/analytics/track-script'
import { OWN_SHADOW } from '@/lib/sanity/depth-options'
import { iconLook, type IconDesign, type OwnIcon } from '@/lib/sanity/surface-options'
import { textLook, type OwnText } from '@/lib/sanity/text-style-options'
import type { SanityImageData } from '@/types/sanity'

import type { LinkContext, ListLink } from './link-list-types'
import type { LinkCardDesign } from '../../../utils/link-card-design'
import { linkTrackProps } from '../../../utils/link-list-items'

const clean = (value: string | null | undefined) => (value ? stegaClean(value).trim() : '')

/**
 * The shadow class for a link and the style its `<li>` carries: the layout's own class while Depth
 * and glow leaves links alone, else the chosen shadow (and glow), fed by a custom property on the
 * `<li>` that the link inherits. `ownClass` is the layout's class, `own` the shadow it draws.
 */
export function linkShadow(
  context: Pick<LinkContext, 'linkDepth'>,
  own: keyof typeof OWN_SHADOW,
  ownClass = '',
): { className: string; style: CSSProperties | undefined } {
  const depth = context.linkDepth(OWN_SHADOW[own])
  return depth ?? { className: ownClass, style: undefined }
}

/**
 * The shell of one link: the `<li>` that tells analytics what a click on it means (see
 * `TRACK_SCRIPT`, which listens once for the whole page).
 */
export function LinkItem({
  link,
  className,
  style,
  children,
}: {
  link: ListLink
  className?: string
  /** Custom properties the link inherits (Depth and glow, its card surface); later ones win. */
  style?: CSSProperties | readonly (CSSProperties | undefined)[]
  children: ReactNode
}) {
  const merged = Array.isArray(style)
    ? (style as readonly (CSSProperties | undefined)[]).reduce<CSSProperties | undefined>(
        (all, next) => (next ? { ...all, ...next } : all),
        undefined,
      )
    : (style as CSSProperties | undefined)
  return (
    <li
      {...trackAttributes('link_click', linkTrackProps(link))}
      className={className}
      style={merged}
    >
      {children}
    </li>
  )
}

/**
 * The line under a link's label. It is part of the link's accessible name, so a visually hidden full
 * stop keeps it from running into the label when read aloud ("Book a consultation. Thirty minutes").
 */
export function LinkDescription({
  text,
  className,
  style,
}: {
  text: string | null | undefined
  className: string
  style?: CSSProperties
}) {
  if (!text) return null
  return (
    <span className={className} style={style}>
      <span className="sr-only">. </span>
      {text}
    </span>
  )
}

/** What a layout draws for a link's three lines with nothing chosen, and the classes it always adds. */
export interface OwnLinkText {
  eyebrow: OwnText
  label: OwnText
  description: OwnText
  /** Classes the label always has (`text-balance`). */
  labelClass?: string
  /** Classes the description always has (spacing, `text-pretty`). */
  descriptionClass?: string
}

/** The usual eyebrow: small spaced capitals in the medium weight, in the description's colour. */
export function ownEyebrow(colour?: string): OwnText {
  return {
    size: 'text-small',
    defaultSize: 'small',
    weight: 'medium',
    textCase: 'uppercase',
    colour,
  }
}

/**
 * A link's eyebrow, label and description, each in the layout's own look with the card's text design
 * over it. The eyebrow is read first, then a visually hidden full stop, so it doesn't run into the
 * label ("New. Book a consultation. Thirty minutes"); an empty one draws nothing and takes no space.
 */
export function LinkText({
  link,
  design,
  own,
  className = '',
}: {
  link: ListLink
  design: LinkCardDesign
  own: OwnLinkText
  /** The column's own classes (width, alignment). */
  className?: string
}) {
  const eyebrowText = clean(link.item.eyebrow)
  const eyebrow = textLook(design.eyebrow, own.eyebrow)
  const label = textLook(design.label, own.label)
  const description = textLook(design.description, own.description)
  return (
    <span className={`flex min-w-0 flex-col ${className}`.trim()}>
      {eyebrowText && (
        <span className={`mb-0.5 ${eyebrow.className}`} style={eyebrow.style} data-link-eyebrow="">
          {link.item.eyebrow}
          <span className="sr-only">. </span>
        </span>
      )}
      <span className={`${label.className} ${own.labelClass ?? ''}`.trim()} style={label.style}>
        {link.label}
      </span>
      <LinkDescription
        text={link.item.description}
        className={`${description.className} ${own.descriptionClass ?? ''}`.trim()}
        style={description.style}
      />
    </span>
  )
}

/**
 * A link's icon in its container (the card's icon design over the layout's own). `box` sizes the
 * container; `keepBox` keeps that box for a plain icon too, so rows with and without containers line
 * up (Glass rows, Cards). Draws nothing for a link without an icon.
 */
export function LinkIcon({
  link,
  design,
  own,
  box,
  iconClass,
  keepBox = false,
}: {
  link: ListLink
  design: IconDesign
  own: OwnIcon
  box: string
  iconClass: string
  keepBox?: boolean
}) {
  if (!link.item.icon) return null
  const look = iconLook(design, own)
  const icon = <BadgeIcon name={clean(link.item.icon)} className={iconClass} />
  if (look.shape === 'plain' && !keepBox) {
    return look.className || look.style ? (
      <span className={`contents ${look.className}`} style={look.style}>
        {icon}
      </span>
    ) : (
      icon
    )
  }
  return (
    <span
      className={`grid shrink-0 place-items-center ${box} ${look.className}`}
      style={look.style}
      data-icon-shape={look.shape}
    >
      {icon}
    </span>
  )
}

/** A link's thumbnail if it has one, else its icon, else nothing. `thumbClass` shapes the picture. */
export function LinkVisual({
  link,
  thumbClass,
  sizes,
  icon,
  useThumbnail = true,
}: {
  link: ListLink
  thumbClass: string
  sizes: string
  /** The icon, drawn when there is no thumbnail. */
  icon: ReactNode
  useThumbnail?: boolean
}) {
  const thumbnail = link.item.thumbnail as SanityImageData | null | undefined
  if (useThumbnail && thumbnail?.asset) {
    return (
      <SanityImage
        image={thumbnail}
        alt=""
        width={600}
        height={450}
        sizes={sizes}
        className={thumbClass}
      />
    )
  }
  return icon
}

/** Whether a link has a picture to draw (a thumbnail, when the layout shows them). */
export function hasThumbnail(link: ListLink): boolean {
  return Boolean((link.item.thumbnail as SanityImageData | null | undefined)?.asset)
}
