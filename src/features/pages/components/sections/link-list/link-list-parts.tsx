import { stegaClean } from 'next-sanity'
import { Fragment, Suspense, type ReactNode } from 'react'

import { BadgeIcon } from '@/components/ui/badge-icon'
import { RichHeading } from '@/components/ui/rich-heading'
import { SanityImage } from '@/components/ui/sanity-image'
import { SectionFrame } from '@/components/ui/section-frame'
import { ctaSurfaceFor, sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { SocialIcon } from '@/components/ui/social-icon'
import { trackAttributes } from '@/lib/analytics/track-script'
import { glassStrengthOf, type GlassStrength } from '@/lib/color/glass-contrast'
import { requestTime } from '@/lib/request-time'
import { sectionTitle } from '@/lib/sanity/section-title'
import { socialPlatformTitle } from '@/lib/social-platforms'
import type { SanityImageData } from '@/types/sanity'

import type { SectionProps } from '../../../types'
import { headingLevels } from '../../../utils/link-list'
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
  /** Size of the profile block: the picture, the name and the bio. */
  profile: { picture: string; name: string }
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
  /** Glass rows only: whether each row ends in a round arrow. */
  showArrows: boolean
}

const clean = (value: string | null | undefined) => (value ? stegaClean(value).trim() : '')

/** Round, with room for a thumb and an icon under the same rules. */
const SOCIAL_LINK =
  'inline-flex size-11 items-center justify-center rounded-button text-ink-muted transition-colors duration-(--duration-fast) hover:bg-surface-alt hover:text-ink motion-reduce:transition-none'

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
  if (!name && !bio && !image?.asset) return null

  return (
    <div className="mb-6">
      {image?.asset && (
        <SanityImage
          image={image}
          width={256}
          height={256}
          sizes="128px"
          preload={isFirst}
          className={`mb-4 block rounded-full object-cover ${layout.profile.picture} ${block}`}
        />
      )}
      {name && <Name className={`${layout.profile.name} font-semibold text-balance`}>{name}</Name>}
      {bio && (
        <p
          className={`${name ? 'mt-2' : ''} max-w-measure-narrow text-pretty text-ink-muted ${block}`}
        >
          {bio}
        </p>
      )}
    </div>
  )
}

function Socials({
  profiles,
  justify,
}: {
  profiles: ReturnType<typeof resolveSocials>
  justify: string
}) {
  if (profiles.length === 0) return null
  return (
    <nav aria-label="Social profiles" className="mb-8">
      <ul className={`flex flex-wrap gap-1 ${justify}`}>
        {profiles.map((profile) => (
          <li key={profile._key}>
            <a
              href={profile.url}
              aria-label={socialPlatformTitle(clean(profile.platform))}
              className={SOCIAL_LINK}
            >
              <SocialIcon platform={clean(profile.platform)} />
            </a>
          </li>
        ))}
      </ul>
    </nav>
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
  sizes,
  useThumbnail = true,
}: {
  link: ListLink
  thumbClass: string
  iconClass?: string
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
  return link.item.icon ? <BadgeIcon name={clean(link.item.icon)} className={iconClass} /> : null
}

/** Whether a link has a picture to draw (a thumbnail, when the layout shows them). */
export function hasThumbnail(link: ListLink): boolean {
  return Boolean((link.item.thumbnail as SanityImageData | null | undefined)?.asset)
}

/** The shared arrow of the editorial list and of Glass rows; it points out of the page for another website. */
export function ArrowIcon({ out, className = '' }: { out: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`size-6 shrink-0 ${className}`}
    >
      {out ? <path d="M8 16 16 8m-6 0h6v6" /> : <path d="M5 12h14m-5-5 5 5-5 5" />}
    </svg>
  )
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
  const shared = {
    layout,
    context: {
      surface,
      thumbnailSize,
      rowStyle: stegaClean(data.rowStyle) === 'glass' ? 'glass' : 'solid',
      glassStrength: glassStrengthOf(clean(data.glassStrength)),
      showArrows: data.showArrows !== false,
    } satisfies LinkContext,
    groupHeading: levels.group,
  }

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
      {title && (
        <RichHeading
          as={Title}
          blocks={data.heading}
          fallback={title}
          className={`mb-8 text-balance ${hasName ? 'text-h4 font-semibold' : 'text-h2 font-semibold'}`}
        />
      )}
      <Socials profiles={socials} justify={traits.justify} />
      {prepared.some((link) => link.scheduled) ? (
        // A scheduled link is due only at some times. The prerendered page shows the links that
        // always are; the visitor's request fills in the rest.
        <Suspense fallback={<LinkGroups links={drawableLinks(prepared)} {...shared} />}>
          <DueLinkGroups prepared={prepared} {...shared} />
        </Suspense>
      ) : (
        <LinkGroups links={drawableLinks(prepared)} {...shared} />
      )}
    </SectionFrame>
  )
}
