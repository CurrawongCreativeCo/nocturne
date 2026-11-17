import Link from 'next/link'
import { stegaClean } from 'next-sanity'
import type { ElementType } from 'react'

import { HoverLift } from '@/components/motion/hover-lift'
import { ActionIndicator } from '@/components/ui/action-indicator'
import { CardSurface } from '@/components/ui/card-surface'
import { FramedImage } from '@/components/ui/framed-image'
import { PlainText } from '@/components/ui/plain-text'
import { ProfileImage, type ProfileImageScale } from '@/components/ui/profile-image'
import { teamPath } from '@/config/paths'
import { hasTeamProfiles } from '@/config/profile'
import { resolveCardAction, type OwnAction } from '@/lib/sanity/card-action'
import { resolveCardDesign } from '@/lib/sanity/card-design'
import {
  CARD_SHADOW_CLASS,
  OWN_SHADOW,
  pictureClearance,
  pictureInset,
  pictureInsetBeyond,
  resolveCardDepth,
  resolveCardLift,
  resolvePictureDepth,
} from '@/lib/sanity/depth-options'
import { forcedAspect, resolveImageDesign } from '@/lib/sanity/image-design-options'
import { resolveAvatar } from '@/lib/sanity/profile-image-options'
import { hasImageDesign } from '@/lib/sanity/team-portrait'
import { textRoleProps } from '@/lib/sanity/text-role'
import type { TextStyle } from '@/lib/sanity/text-style-options'
import { themeColourCss } from '@/lib/sanity/theme-colour'

import type { SectionProps } from '../../../types'

export type Member = NonNullable<SectionProps<'team'>['data']['members']>[number]

const surface = `relative rounded-card bg-surface ${CARD_SHADOW_CLASS.shadowed} ring-1 ring-line`

/** The card's and the row's own surface: the whole card is the link, so a chosen fill has no hover shade. */
const OWN_SURFACE = { background: 'bg-surface', border: 'ring-1 ring-line', still: true }

/** The text roles a card and a row draw (team-capabilities.ts), and what each draws with nothing chosen. */
const ROLES = ['title', 'meta', 'body'] as const
const OWN_TITLE = { size: 'text-h4', weight: 'semibold' } as const
const OWN_META = { size: 'text-small', weight: 'medium', colour: 'text-ink-muted' } as const
const OWN_BODY = { size: 'text-body', weight: 'regular', colour: 'text-ink-muted' } as const

type Design = SectionProps<'team'>['data']['imageDesign']

/** A portrait's corners are the card's until the design names a shape. */
const PORTRAIT_SHAPE = { fallbackShape: 'square' } as const
/** The margin a shaped portrait sits in already: 24px at the sides and above (`px-6 pt-6`), none below. */
const SHAPED_MARGIN = { side: 24, top: 24 } as const
/** A flush portrait that is inset for its shadow (task 147) has the card's corners until the design names a shape. */
const INSET_PORTRAIT_SHAPE = { fallbackShape: 'standard' } as const

interface CardProps {
  member: Member
  /** The section's `imageDesign`: shape, motion and frame for every portrait. */
  design?: Design
  /** The section's `pictureDepthDesign`: a shadow and glow on every portrait (task 147). */
  pictureDepth?: SectionProps<'team'>['data']['pictureDepthDesign']
  /** The member's name is a heading: one level under the section's title (or its own level without one). */
  headingLevel: 'h2' | 'h3'
  /** Preload the portrait (the first card of a section at the top of the page). */
  eager?: boolean
  /** The section's Cards box: fill, border, text roles and mark for every card and row. */
  cardDesign?: SectionProps<'team'>['data']['cardDesign']
  /** The section's tone, which the card's mark is measured against. */
  tone?: string
}

/** Nothing is drawn at the end of a linked card until Cards › Indicator chooses a glyph. */
const OWN_ACTION: OwnAction = { glyph: 'none', motion: 'nudge' }

/** Whether the card is a link: the site has profile pages and the member has one. */
const isLinked = (member: Member) => Boolean(stegaClean(member.slug)) && hasTeamProfiles()

/** The classes that make the card the group its indicator moves with, only when one is drawn. */
const groupOf = (member: Member, cardDesign: CardProps['cardDesign']) =>
  isLinked(member) && resolveCardAction(cardDesign, OWN_ACTION).glyph !== 'none' ? ' group' : ''

/**
 * The indicator at the end of a linked card or row (components/ui/action-indicator.tsx). Decoration:
 * the name's stretched link is the one keyboard destination.
 */
function MemberIndicator({
  member,
  cardDesign,
  className,
}: Pick<CardProps, 'member' | 'cardDesign'> & { className: string }) {
  if (!isLinked(member)) return null
  const action = resolveCardAction(cardDesign, OWN_ACTION)
  return (
    <ActionIndicator
      glyph={action.glyph}
      external={false}
      motion={action.motion}
      distance={action.distance}
      colour={action.colour}
      className={className}
    />
  )
}

/** The name, linked to the member's page when the site has profile pages and they have one. */
function MemberName({
  member,
  headingLevel: Heading,
  style,
}: Pick<CardProps, 'member' | 'headingLevel'> & { style: TextStyle }) {
  const slug = stegaClean(member.slug)
  return (
    <Heading {...textRoleProps('title', 'text-h4 font-semibold text-balance', OWN_TITLE, style)}>
      {slug && hasTeamProfiles() ? (
        // The link stretches over the whole card, so there is a single link per member.
        <Link href={teamPath(slug)} className="after:absolute after:inset-0">
          {member.name}
        </Link>
      ) : (
        member.name
      )}
    </Heading>
  )
}

/** Portrait on top, then name, role and short bio. Fills the height it is given (grid and slider). */
/**
 * How a card or row moves. Unset keeps the Motion hover rise it always had; choosing None or Lift
 * replaces it, and Lift then applies only to a card that links to a member's page.
 */
function liftOf(member: Member, cardDesign: CardProps['cardDesign']) {
  const chosen = resolveCardLift([cardDesign])
  return {
    as: (chosen === undefined ? HoverLift : 'div') as ElementType,
    lift: chosen === 'lift' && isLinked(member),
  }
}

export function TeamCard({
  member,
  design,
  pictureDepth,
  headingLevel,
  eager,
  cardDesign,
  tone,
}: CardProps) {
  // The default portrait fills the top of the card; a shape of its own (a circle, an arch) sits inside it.
  const { shape } = resolveImageDesign(stegaClean(design), PORTRAIT_SHAPE)
  const inset = shape !== 'square'
  // The card clips, so a portrait's shadow would be cut off at the card's edge. When a depth is chosen the
  // portrait is inset by the room that depth needs, inside the space it already has: the card keeps its size
  // and the portrait its ratio. A flush portrait gets all of it. One that is already inset (24px at the sides
  // and above) keeps that, and takes more at the sides only where its depth needs more than 24px, the bottom
  // giving back exactly the height the narrower portrait loses. Unset changes nothing.
  const clearance = pictureClearance(pictureDepth)
  const room = clearance && !inset ? pictureInset(clearance) : undefined
  const wider =
    clearance && inset
      ? pictureInsetBeyond(clearance, SHAPED_MARGIN, forcedAspect(shape) === '4/5' ? 5 / 4 : 1)
      : undefined
  const look = resolveCardDesign(cardDesign, ROLES)
  const motion = liftOf(member, cardDesign)
  return (
    <CardSurface
      as={motion.as}
      lift={motion.lift}
      className={`${surface} flex h-full w-full flex-col overflow-hidden${groupOf(member, cardDesign)}`}
      own={OWN_SURFACE}
      shadow={CARD_SHADOW_CLASS.shadowed}
      depth={resolveCardDepth([cardDesign], OWN_SHADOW.siteCard)}
      design={look.surface}
      mark={{ input: cardDesign?.mark, scope: 'card', tone, levels: [cardDesign] }}
    >
      <div
        className={room ? 'aspect-square' : wider ? undefined : inset ? 'px-6 pt-6' : undefined}
        style={
          room
            ? { padding: `${room.top}px ${room.side}px ${room.bottom}px` }
            : wider
              ? { padding: `${wider.top}px ${wider.side}px ${wider.bottom}px` }
              : undefined
        }
      >
        <FramedImage
          image={member.portrait}
          design={design}
          depth={resolvePictureDepth(pictureDepth)}
          context={room ? INSET_PORTRAIT_SHAPE : PORTRAIT_SHAPE}
          width={600}
          height={600}
          sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
          preload={eager}
          aspect="1/1"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <MemberName member={member} headingLevel={headingLevel} style={look.text.title} />
        <MemberText member={member} look={look.text} bio="mt-3 text-pretty text-ink-muted" />
        <MemberIndicator member={member} cardDesign={cardDesign} className="mt-auto self-start" />
      </div>
    </CardSurface>
  )
}

/** The role line and short bio under a name, in their own text roles. */
function MemberText({
  member,
  look,
  bio,
}: {
  member: Member
  look: Record<(typeof ROLES)[number], TextStyle>
  /** The bio's classes with nothing chosen: the list's has a measure. */
  bio: string
}) {
  const bioLook = textRoleProps('body', bio, OWN_BODY, look.body)
  return (
    <>
      {member.role && (
        <p
          {...textRoleProps(
            'meta',
            'mt-1 text-small font-medium text-ink-muted',
            OWN_META,
            look.meta,
          )}
        >
          {member.role}
        </p>
      )}
      <PlainText
        text={member.shortBio}
        className={bioLook.className}
        style={bioLook.style}
        textRole="body"
      />
    </>
  )
}

type Portrait = SectionProps<'team'>['data']['portraitDesign']

/** Medium is the 96 px (128 px from sm) rounded square the list always drew. */
const PORTRAIT_SCALE: ProfileImageScale = {
  box: { small: 'size-16 sm:size-24', medium: 'size-24 sm:size-32', large: 'size-32 sm:size-40' },
  height: { small: 'h-16 sm:h-24', medium: 'h-24 sm:h-32', large: 'h-32 sm:h-40' },
  px: { small: 96, medium: 128, large: 160 },
}

/**
 * The list layout: a small portrait beside the text, drawn by ProfileImage with the section's Portrait
 * design (size, ring; Medium with no ring is the portrait it always was). A list that already has an
 * Image design saved keeps drawing with it (FramedImage), and Studio shows that control instead of
 * Portrait (lib/sanity/team-portrait.ts), so what is drawn matches the controls.
 */
export function TeamRow({
  member,
  design,
  pictureDepth,
  portrait,
  headingLevel,
  eager,
  cardDesign,
  tone,
}: CardProps & { portrait?: Portrait }) {
  const legacy = hasImageDesign(stegaClean(design))
  const look = resolveCardDesign(cardDesign, ROLES)
  const motion = liftOf(member, cardDesign)
  return (
    <CardSurface
      as={motion.as}
      lift={motion.lift}
      className={`${surface} flex items-start gap-5 p-4 sm:gap-8 sm:p-6${groupOf(member, cardDesign)}`}
      own={OWN_SURFACE}
      shadow={CARD_SHADOW_CLASS.shadowed}
      depth={resolveCardDepth([cardDesign], OWN_SHADOW.siteCard)}
      design={look.surface}
      mark={{ input: cardDesign?.mark, scope: 'card', tone, levels: [cardDesign] }}
    >
      {!legacy ? (
        <ProfileImage
          image={member.portrait}
          design={resolveAvatar(portrait, 'rounded')}
          scale={PORTRAIT_SCALE}
          colour={themeColourCss(portrait?.ringColour)}
          depth={resolvePictureDepth(pictureDepth)}
          preload={eager}
          className="shrink-0"
        />
      ) : (
        <div className="size-24 shrink-0 sm:size-32">
          <FramedImage
            image={member.portrait}
            // Too small to move in; the shape and frame still apply.
            design={{ ...design, motion: 'none' }}
            depth={resolvePictureDepth(pictureDepth)}
            context={{ fallbackShape: 'standard' }}
            width={256}
            height={256}
            sizes="(min-width: 640px) 128px, 96px"
            preload={eager}
            aspect="1/1"
          />
        </div>
      )}
      <div className="min-w-0">
        <MemberName member={member} headingLevel={headingLevel} style={look.text.title} />
        <MemberText
          member={member}
          look={look.text}
          bio="mt-3 max-w-measure text-pretty text-ink-muted"
        />
      </div>
      <MemberIndicator member={member} cardDesign={cardDesign} className="ms-auto self-center" />
    </CardSurface>
  )
}
