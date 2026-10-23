import { stegaClean } from 'next-sanity'
import { Fragment, Suspense, useId } from 'react'

import { DecorativeDivider } from '@/components/ui/decorative-divider'
import { RichHeading } from '@/components/ui/rich-heading'
import { SectionFrame } from '@/components/ui/section-frame'
import { ctaSurfaceFor, sectionTraits } from '@/components/ui/section-style'
import { SocialLinks } from '@/components/ui/social-links'
import { glassStrengthOf } from '@/lib/color/glass-contrast'
import { requestTime } from '@/lib/request-time'
import { resolveDepth } from '@/lib/sanity/depth-options'
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
import { resolveSurface } from '@/lib/sanity/surface-options'
import { themeColourCss } from '@/lib/sanity/theme-colour'
import { showsWordmark } from '@/lib/sanity/wordmark-options'

import type { LinkContext, LinkListLayout, ListLink, StoredLink } from './link-list-types'
import { Profile, hasProfile } from './profile'
import { WordmarkHeading, type WordmarkImage } from './wordmark-heading'
import type { SectionProps } from '../../../types'
import {
  cardOverrides,
  layerLinkCardDesign,
  listCardDesignInput,
  resolveLinkCardDesign,
} from '../../../utils/link-card-design'
import { defaultLinkArrow, headingLevels } from '../../../utils/link-list'
import {
  drawableLinks,
  groupDrawn,
  prepareLinks,
  resolveSocials,
  type PreparedLink,
} from '../../../utils/link-list-items'

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
  const socialHeadingId = useId()
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
  const socialHeading =
    dividers.aboveSocial?.centre?.kind === 'text' &&
    parts.some((part) => typeof part === 'object' && part.divider === 'aboveSocial')
  const socialRow = (
    <SocialLinks
      profiles={socials}
      labelledBy={socialHeading ? socialHeadingId : undefined}
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
              <DecorativeDivider
                key={part.divider}
                divider={divider}
                block={traits.block}
                id={socialHeading && part.divider === 'aboveSocial' ? socialHeadingId : undefined}
              />
            ) : null
          }
        }
      })}
    </SectionFrame>
  )
}
