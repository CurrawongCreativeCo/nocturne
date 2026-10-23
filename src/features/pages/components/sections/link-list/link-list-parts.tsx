import { stegaClean } from 'next-sanity'
import { Fragment, Suspense, type ReactNode, type CSSProperties } from 'react'

import { BadgeIcon } from '@/components/ui/badge-icon'
import { DecorativeDivider } from '@/components/ui/decorative-divider'
import type { ProfileImageScale } from '@/components/ui/profile-image'
import { RichHeading } from '@/components/ui/rich-heading'
import { SanityImage } from '@/components/ui/sanity-image'
import { SectionFrame } from '@/components/ui/section-frame'
import { ctaSurfaceFor, sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { SocialLinks } from '@/components/ui/social-links'
import { trackAttributes } from '@/lib/analytics/track-script'
import { glassStrengthOf, type GlassStrength } from '@/lib/color/glass-contrast'
import { requestTime } from '@/lib/request-time'
import { OWN_SHADOW, resolveDepth, type BoxDepth } from '@/lib/sanity/depth-options'
import {
  LINK_LIST_DIVIDER_PLACEMENTS,
  linkListParts,
  resolveDivider,
  type DividerInput,
  type LinkListDividerPlacement,
  type LinkListPart,
  type ResolvedDivider,
} from '@/lib/sanity/divider-options'
import { linkArrowOf, type LinkArrowStyle } from '@/lib/sanity/link-arrow-options'
import { sectionTitle } from '@/lib/sanity/section-title'
import { socialPositionOf, socialStyleOf } from '@/lib/sanity/social-style-options'
import {
  iconLook,
  resolveSurface,
  type IconDesign,
  type OwnIcon,
} from '@/lib/sanity/surface-options'
import { textLook, type OwnText } from '@/lib/sanity/text-style-options'
import { themeColourCss } from '@/lib/sanity/theme-colour'
import { showsWordmark } from '@/lib/sanity/wordmark-options'
import type { SanityImageData } from '@/types/sanity'

import { Profile, hasProfile } from './profile'
import { WordmarkHeading, type WordmarkImage } from './wordmark-heading'
import type { SectionProps } from '../../../types'
import {
  cardOverrides,
  layerLinkCardDesign,
  listCardDesignInput,
  resolveLinkCardDesign,
  type LinkCardDesign,
} from '../../../utils/link-card-design'
import { defaultLinkArrow, headingLevels } from '../../../utils/link-list'
import {
  drawableLinks,
  groupDrawn,
  linkTrackProps,
  prepareLinks,
  resolveSocials,
  type DrawnLink,
  type PreparedLink,
} from '../../../utils/link-list-items'

type Data = SectionProps<'linkList'>['data']
type StoredLink = NonNullable<Data['links']>[number]
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

const clean = (value: string | null | undefined) => (value ? stegaClean(value).trim() : '')

/** Each of Design › Dividers' placements, resolved (null where none is drawn). */
function resolveLinkListDividers(
  design: Partial<Record<LinkListDividerPlacement, DividerInput | null>> | null | undefined,
): Record<LinkListDividerPlacement, ResolvedDivider | null> {
  return {
    afterCategories: resolveDivider(design?.afterCategories),
    afterProfile: resolveDivider(design?.afterProfile),
    aboveSocial: resolveDivider(design?.aboveSocial),
    belowSocial: resolveDivider(design?.belowSocial),
  }
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

/** The groups of links, each under its heading, drawn by the layout. */
function LinkGroups({
  links,
  layout,
  context,
  groupHeading: GroupHeading,
}: {
  links: ListLink[]
  layout: LinkListLayout
  context: (link: ListLink) => LinkContext
  groupHeading: 'h2' | 'h3'
}) {
  return groupDrawn(links).map((group, index) => (
    <div
      key={group.heading ?? `links-${String(index)}`}
      className={index > 0 ? 'mt-10' : undefined}
    >
      {group.heading && (
        <GroupHeading className="mb-4 text-small font-semibold text-ink-muted">
          {group.heading}
        </GroupHeading>
      )}
      <ul className={layout.listClassName}>
        {group.links.map((link) => (
          <Fragment key={link.item._key}>{layout.renderLink(link, context(link))}</Fragment>
        ))}
      </ul>
    </div>
  ))
}

/**
 * The same groups, once the time is known. Pages are cached, so the clock is read here, at request
 * time, in a boundary of its own: the rest of the page stays prerendered and only this streams in.
 */
async function DueLinkGroups({
  prepared,
  ...rest
}: {
  prepared: PreparedLink<StoredLink>[]
  layout: LinkListLayout
  context: (link: ListLink) => LinkContext
  groupHeading: 'h2' | 'h3'
}) {
  return <LinkGroups links={drawableLinks(prepared, await requestTime())} {...rest} />
}

export function LinkListView({
  data,
  business,
  isFirst,
  layout,
}: SectionProps<'linkList'> & { layout: LinkListLayout }) {
  const traits = sectionTraits(data.style, layout.defaults)
  const surface = ctaSurfaceFor(traits.tone)
  const prepared = prepareLinks(data.links)
  const socials = resolveSocials(data.socialSource, data.socialLinks, business?.socialLinks)
  const title = clean(sectionTitle(data))
  const hasName = Boolean(clean(data.profile?.name))
  const levels = headingLevels({ hasProfileName: hasName, hasTitle: Boolean(title) })
  const Title = levels.title
  const thumbnailSize = stegaClean(data.thumbnailSize) === 'large' ? 'large' : 'standard'
  const rowStyle = stegaClean(data.rowStyle) === 'glass' ? 'glass' : 'solid'
  const glassStrength = glassStrengthOf(clean(data.glassStrength))
  const depth = resolveDepth(data.depthDesign)
  // The list's card design, once; each link lays its own Appearance over it (design-overrides.ts).
  const listDesign = resolveLinkCardDesign(listCardDesignInput(data))
  const layoutArrow = defaultLinkArrow({
    layout: data.variant,
    rowStyle,
    showArrows: data.showArrows,
  })
  const contextFor = (link: ListLink): LinkContext => {
    const own = cardOverrides(link.item.design)
    const design = own ? layerLinkCardDesign(listDesign, resolveLinkCardDesign(own)) : listDesign
    return {
      surface,
      thumbnailSize,
      rowStyle,
      glassStrength,
      arrow: design.arrow ?? linkArrowOf(undefined, layoutArrow),
      arrowStyle: design.arrowColour ? { color: design.arrowColour } : undefined,
      // A card's own shadow replaces the list's; the glow is the list's either way.
      linkDepth:
        own && design.shadow !== listDesign.shadow
          ? resolveDepth({ ...data.depthDesign, linkShadow: design.shadow }).links
          : depth.links,
      design,
    }
  }
  const shared = { layout, context: contextFor, groupHeading: levels.group }
  const headingImage = data.headingImage as WordmarkImage | null | undefined
  const headingWordmark = showsWordmark(data.headingDisplay, headingImage) ? headingImage : null
  const socialDesign = data.socialDesign
  // Every layout but these three is drawn by Minimal (index.tsx), so only Minimal has glass rows.
  const glassRows =
    rowStyle === 'glass' && !['cards', 'editorial', 'compact'].includes(stegaClean(data.variant))
  const socialsBelow = socialPositionOf(socialDesign?.position) === 'below'
  // Design › Dividers: which parts are drawn, in order, with the dividers between them.
  const dividers = resolveLinkListDividers(data.dividerDesign)
  const parts = linkListParts({
    profile: hasProfile(data),
    heading: Boolean(headingWordmark ?? title),
    social: socials.some((profile) => profile.url),
    socialsBelow,
    dividers: LINK_LIST_DIVIDER_PLACEMENTS.filter((placement) => dividers[placement]),
  })
  // A divider brings its own space, so the part beside it drops its margin on that side.
  const besideDivider = (part: LinkListPart, side: -1 | 1) =>
    typeof parts[parts.indexOf(part) + side] === 'object'
  const socialSpace = socialsBelow
    ? besideDivider('social', -1)
      ? ''
      : 'mt-10'
    : besideDivider('social', 1)
      ? ''
      : 'mb-8'
  const socialRow = (
    <SocialLinks
      profiles={socials}
      shape={socialStyleOf(socialDesign?.style)}
      // Glass rows' icons are frosted glass too, at the rows' strength, so the two read as one design.
      surface={glassRows ? 'glass' : 'solid'}
      strength={glassStrength}
      colour={themeColourCss(socialDesign?.iconColour)}
      design={resolveSurface(socialDesign)}
      depth={depth.social}
      className={`${socialSpace} ${traits.justify}`.trim()}
    />
  )

  return (
    <SectionFrame
      style={data.style}
      defaults={layout.defaults}
      isFirst={isFirst}
      containerClassName={traits.text}
    >
      {parts.map((part) => {
        switch (part) {
          case 'profile':
            return (
              <Profile
                key="profile"
                data={data}
                layout={layout}
                isFirst={Boolean(isFirst)}
                block={traits.block}
                align={traits.align}
                pictureDepth={depth.picture}
                categoriesDivider={dividers.afterCategories}
                className={besideDivider('profile', 1) ? '' : 'mb-6'}
                nameLevel={levels.top}
              />
            )
          case 'heading':
            return headingWordmark ? (
              <WordmarkHeading
                key="heading"
                as={title ? Title : 'div'}
                alt={title}
                image={headingWordmark}
                preload={Boolean(isFirst) && !hasName}
                className={besideDivider('heading', 1) ? '' : 'mb-8'}
              />
            ) : (
              <RichHeading
                key="heading"
                as={Title}
                blocks={data.heading}
                fallback={title}
                className={`${besideDivider('heading', 1) ? '' : 'mb-8'} text-balance ${hasName ? 'text-h4 font-semibold' : 'text-h2 font-semibold'}`}
              />
            )
          case 'social':
            return <Fragment key="social">{socialRow}</Fragment>
          case 'links':
            return prepared.some((link) => link.scheduled) ? (
              // A scheduled link is due only at some times. The prerendered page shows the links that
              // always are; the visitor's request fills in the rest.
              <Suspense
                key="links"
                fallback={<LinkGroups links={drawableLinks(prepared)} {...shared} />}
              >
                <DueLinkGroups prepared={prepared} {...shared} />
              </Suspense>
            ) : (
              <LinkGroups key="links" links={drawableLinks(prepared)} {...shared} />
            )
          default: {
            const divider = dividers[part.divider]
            return divider ? (
              <DecorativeDivider key={part.divider} divider={divider} block={traits.block} />
            ) : null
          }
        }
      })}
    </SectionFrame>
  )
}
