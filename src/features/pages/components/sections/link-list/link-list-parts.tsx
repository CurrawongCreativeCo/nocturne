import { stegaClean } from 'next-sanity'
import { Fragment, Suspense, type ReactNode, type CSSProperties } from 'react'

import { BadgeIcon } from '@/components/ui/badge-icon'
import { ProfileImage, type ProfileImageScale } from '@/components/ui/profile-image'
import { RichHeading } from '@/components/ui/rich-heading'
import { SanityImage } from '@/components/ui/sanity-image'
import { SectionFrame } from '@/components/ui/section-frame'
import { ctaSurfaceFor, sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { SocialLinks } from '@/components/ui/social-links'
import { Wordmark } from '@/components/ui/wordmark'
import { trackAttributes } from '@/lib/analytics/track-script'
import { glassStrengthOf, type GlassStrength } from '@/lib/color/glass-contrast'
import { requestTime } from '@/lib/request-time'
import { linkArrowOf, type LinkArrowStyle } from '@/lib/sanity/link-arrow-options'
import { resolveProfileImage } from '@/lib/sanity/profile-image-options'
import { sectionTitle } from '@/lib/sanity/section-title'
import { socialPositionOf, socialStyleOf } from '@/lib/sanity/social-style-options'
import { themeColourCss, themeColourStyle } from '@/lib/sanity/theme-colour'
import { showsWordmark, wordmarkSizeOf } from '@/lib/sanity/wordmark-options'
import type { SanityImageData } from '@/types/sanity'

import type { SectionProps } from '../../../types'
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
  /** The indicator at the end of each link (Design › Links › Arrow style, else the layout's default). */
  arrow: LinkArrowStyle
  /** Colour overrides from Design › Links, as inline styles; undefined keeps the layout's colours. */
  arrowStyle: CSSProperties | undefined
  iconStyle: CSSProperties | undefined
}

const clean = (value: string | null | undefined) => (value ? stegaClean(value).trim() : '')

type WordmarkImage = SanityImageData & { size?: string | null }

/**
 * The picture, the name and the bio. The name can be drawn as a wordmark (Content › Profile › Show
 * as); its text is then the picture's alt text, so the heading keeps its name.
 */
function Profile({
  data,
  layout,
  isFirst,
  block,
  nameLevel: Name,
}: {
  data: Data
  layout: LinkListLayout
  isFirst: boolean
  block: string
  nameLevel: 'h2'
}) {
  const name = clean(data.profile?.name)
  const bio = clean(data.profile?.bio)
  const image = data.profile?.image as SanityImageData | null | undefined
  const nameImage = data.profile?.nameImage as WordmarkImage | null | undefined
  const wordmark = showsWordmark(data.profile?.nameDisplay, nameImage) ? nameImage : null
  if (!name && !bio && !image?.asset && !wordmark) return null
  const design = data.profileDesign

  return (
    <div className="mb-6">
      <ProfileImage
        image={image}
        design={resolveProfileImage(design)}
        scale={layout.profile.picture}
        colour={themeColourCss(design?.borderColour)}
        preload={isFirst}
        className={`mb-4 ${block}`}
      />
      {wordmark ? (
        // Without the name as text the picture is only decoration, so it is not a heading.
        <WordmarkHeading
          as={name ? Name : 'div'}
          alt={name}
          image={wordmark}
          preload={isFirst && !image?.asset}
        />
      ) : name ? (
        <Name
          className={`${layout.profile.name} font-semibold text-balance`}
          style={themeColourStyle(design?.nameColour)}
        >
          {name}
        </Name>
      ) : null}
      {bio && (
        <p
          className={`${name || wordmark ? 'mt-2' : ''} max-w-measure-narrow text-pretty text-ink-muted ${block}`}
          style={themeColourStyle(design?.bioColour)}
        >
          {bio}
        </p>
      )}
    </div>
  )
}

/**
 * A wordmark standing in for a heading's text. The text is the picture's alt text: one heading, one
 * name, nothing read twice, and the words stay in the page for search engines.
 */
function WordmarkHeading({
  as: Element,
  alt,
  image,
  preload,
  className,
}: {
  as: 'h1' | 'h2' | 'h3' | 'div'
  alt: string
  image: WordmarkImage
  preload: boolean
  className?: string
}) {
  return (
    <Element className={className}>
      <Wordmark image={image} alt={alt} size={wordmarkSizeOf(image.size)} preload={preload} />
    </Element>
  )
}

/**
 * The shell of one link: the `<li>` that tells analytics what a click on it means (see
 * `TRACK_SCRIPT`, which listens once for the whole page).
 */
export function LinkItem({
  link,
  className,
  children,
}: {
  link: ListLink
  className?: string
  children: ReactNode
}) {
  return (
    <li {...trackAttributes('link_click', linkTrackProps(link))} className={className}>
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
}: {
  text: string | null | undefined
  className: string
}) {
  if (!text) return null
  return (
    <span className={className}>
      <span className="sr-only">. </span>
      {text}
    </span>
  )
}

/** A link's thumbnail if it has one, else its icon, else nothing. `thumbClass` shapes the picture. */
export function LinkVisual({
  link,
  thumbClass,
  iconClass = '',
  iconStyle,
  sizes,
  useThumbnail = true,
}: {
  link: ListLink
  thumbClass: string
  iconClass?: string
  /** The icon colour from Design › Links. */
  iconStyle?: CSSProperties
  sizes: string
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
  if (!link.item.icon) return null
  return iconStyle ? (
    <span className="contents" style={iconStyle}>
      <BadgeIcon name={clean(link.item.icon)} className={iconClass} />
    </span>
  ) : (
    <BadgeIcon name={clean(link.item.icon)} className={iconClass} />
  )
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
  context: LinkContext
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
          <Fragment key={link.item._key}>{layout.renderLink(link, context)}</Fragment>
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
  context: LinkContext
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
  const shared = {
    layout,
    context: {
      surface,
      thumbnailSize,
      rowStyle,
      glassStrength,
      arrow: linkArrowOf(
        data.linkDesign?.arrowStyle,
        defaultLinkArrow({ layout: data.variant, rowStyle, showArrows: data.showArrows }),
      ),
      arrowStyle: themeColourStyle(data.linkDesign?.arrowColour),
      iconStyle: themeColourStyle(data.linkDesign?.iconColour),
    } satisfies LinkContext,
    groupHeading: levels.group,
  }
  const headingImage = data.headingImage as WordmarkImage | null | undefined
  const headingWordmark = showsWordmark(data.headingDisplay, headingImage) ? headingImage : null
  const socialDesign = data.socialDesign
  // Every layout but these three is drawn by Minimal (index.tsx), so only Minimal has glass rows.
  const glassRows =
    rowStyle === 'glass' && !['cards', 'editorial', 'compact'].includes(stegaClean(data.variant))
  const socialsBelow = socialPositionOf(socialDesign?.position) === 'below'
  const socialRow = (
    <SocialLinks
      profiles={socials}
      shape={socialStyleOf(socialDesign?.style)}
      // Glass rows' icons are frosted glass too, at the rows' strength, so the two read as one design.
      surface={glassRows ? 'glass' : 'solid'}
      strength={glassStrength}
      colour={themeColourCss(socialDesign?.iconColour)}
      background={themeColourCss(socialDesign?.background)}
      className={`${socialsBelow ? 'mt-10' : 'mb-8'} ${traits.justify}`}
    />
  )

  return (
    <SectionFrame
      style={data.style}
      defaults={layout.defaults}
      isFirst={isFirst}
      containerClassName={traits.text}
    >
      <Profile
        data={data}
        layout={layout}
        isFirst={Boolean(isFirst)}
        block={traits.block}
        nameLevel={levels.top}
      />
      {headingWordmark ? (
        <WordmarkHeading
          as={title ? Title : 'div'}
          alt={title}
          image={headingWordmark}
          preload={Boolean(isFirst) && !hasName}
          className="mb-8"
        />
      ) : title ? (
        <RichHeading
          as={Title}
          blocks={data.heading}
          fallback={title}
          className={`mb-8 text-balance ${hasName ? 'text-h4 font-semibold' : 'text-h2 font-semibold'}`}
        />
      ) : null}
      {socialsBelow ? null : socialRow}
      {prepared.some((link) => link.scheduled) ? (
        // A scheduled link is due only at some times. The prerendered page shows the links that
        // always are; the visitor's request fills in the rest.
        <Suspense fallback={<LinkGroups links={drawableLinks(prepared)} {...shared} />}>
          <DueLinkGroups prepared={prepared} {...shared} />
        </Suspense>
      ) : (
        <LinkGroups links={drawableLinks(prepared)} {...shared} />
      )}
      {socialsBelow ? socialRow : null}
    </SectionFrame>
  )
}
