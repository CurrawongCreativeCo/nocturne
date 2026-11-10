import { CardSurface } from '@/components/ui/card-surface'
import { PARAGRAPH_GAP, PlainLines, type Highlights } from '@/components/ui/plain-text'
import { ProfileImage, type ProfileImageScale } from '@/components/ui/profile-image'
import { siteLanguage } from '@/config/env'
import { formatDate } from '@/lib/format-date'
import { plainTextParagraphs } from '@/lib/plain-text'
import { resolveCardDesign } from '@/lib/sanity/card-design'
import {
  CARD_SHADOW_CLASS,
  OWN_SHADOW,
  resolveCardDepth,
  resolvePictureDepth,
} from '@/lib/sanity/depth-options'
import { resolveAvatar } from '@/lib/sanity/profile-image-options'
import { highlightLook, textRoleProps } from '@/lib/sanity/text-role'
import { themeColourCss } from '@/lib/sanity/theme-colour'
import {
  testimonialDate,
  testimonialRating,
  testimonialSourceLabel,
} from '@/lib/testimonial-source'

import { TestimonialRating } from './rating'
import type { SectionProps } from '../../../types'

type Data = SectionProps<'testimonials'>['data']
type Item = Data['items'][number]

/** Medium is the 48 px circle the avatar always was. */
const AVATAR_SCALE: ProfileImageScale = {
  box: { small: 'size-10', medium: 'size-12', large: 'size-16' },
  height: { small: 'h-10', medium: 'h-12', large: 'h-16' },
  px: { small: 40, medium: 48, large: 64 },
}

/** The text roles a quote card draws (testimonials-capabilities.ts). */
const ROLES = ['quote', 'attribution', 'label'] as const

/** What the card draws with nothing chosen. Each role's own look, for its steps and swaps. */
const CARD = `flex h-full w-full flex-col rounded-card bg-surface p-8 ${CARD_SHADOW_CLASS.shadowed} ring-1 ring-line`
const OWN_SURFACE = { background: 'bg-surface', border: 'ring-1 ring-line', still: true }
const OWN_QUOTE = { size: 'text-lead', weight: 'regular', colour: 'text-ink' } as const
const OWN_NAME = { size: 'text-body', weight: 'semibold' } as const
const OWN_SMALL = { size: 'text-small', weight: 'regular', colour: 'text-ink-muted' } as const

/** One quote with its author, shared by every layout. Fills the height it is given. */
export function QuoteCard({
  item,
  avatarDesign,
  pictureDepth,
  cardDesign,
  tone,
}: {
  item: Item
  avatarDesign?: Data['avatarDesign']
  /** The section's `pictureDepthDesign`: a shadow and glow on the avatar (task 147). */
  pictureDepth?: Data['pictureDepthDesign']
  cardDesign?: Data['cardDesign']
  /** The section's tone, which the card's mark is measured against. */
  tone?: string
}) {
  const design = resolveCardDesign(cardDesign, ROLES)
  const quote = plainTextParagraphs(item.quote)
  const highlights: Highlights | undefined = item.highlights?.length
    ? { phrases: item.highlights, ...highlightLook(cardDesign?.quote?.highlight) }
    : undefined
  const rating = testimonialRating(item.rating)
  const source = testimonialSourceLabel(item.source)
  const date = testimonialDate(item.date)
  return (
    <CardSurface
      as="figure"
      className={CARD}
      own={OWN_SURFACE}
      shadow={CARD_SHADOW_CLASS.shadowed}
      depth={resolveCardDepth([cardDesign], OWN_SHADOW.siteCard)}
      design={design.surface}
      mark={{ input: cardDesign?.mark, scope: 'card', tone, levels: [cardDesign] }}
    >
      {rating && <TestimonialRating rating={rating} />}
      <blockquote
        {...textRoleProps(
          'quote',
          `flex-1 text-lead text-pretty text-ink ${PARAGRAPH_GAP}`,
          OWN_QUOTE,
          design.text.quote,
        )}
      >
        {quote.length === 1 ? (
          <>
            “<PlainLines lines={quote[0] ?? []} highlights={highlights} />”
          </>
        ) : (
          // Several paragraphs: the quotation marks open the first and close the last.
          quote.map((lines, index) => (
            // eslint-disable-next-line react/no-array-index-key -- split from one string, never reordered
            <p key={index}>
              {index === 0 && '“'}
              <PlainLines lines={lines} highlights={highlights} />
              {index === quote.length - 1 && '”'}
            </p>
          ))
        )}
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-4">
        <ProfileImage
          image={item.avatar}
          design={resolveAvatar(avatarDesign, 'circle')}
          scale={AVATAR_SCALE}
          colour={themeColourCss(avatarDesign?.ringColour)}
          depth={resolvePictureDepth(pictureDepth)}
          className="shrink-0"
        />
        <div>
          <div
            {...textRoleProps('attribution', 'font-semibold', OWN_NAME, design.text.attribution)}
          >
            {item.name}
          </div>
          {item.attribution && (
            <div
              {...textRoleProps(
                'attribution',
                'text-small text-ink-muted',
                OWN_SMALL,
                design.text.attribution,
              )}
            >
              {item.attribution}
            </div>
          )}
          {item.role && (
            <div
              {...textRoleProps('label', 'text-small text-ink-muted', OWN_SMALL, design.text.label)}
            >
              {item.role}
            </div>
          )}
          {(source || date) && (
            <div
              {...textRoleProps('label', 'text-small text-ink-muted', OWN_SMALL, design.text.label)}
            >
              {source}
              {source && date && ' · '}
              {date && <time dateTime={date}>{formatDate(date, siteLanguage)}</time>}
            </div>
          )}
        </div>
      </figcaption>
    </CardSurface>
  )
}
