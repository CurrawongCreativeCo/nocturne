import Link from 'next/link'
import { stegaClean } from 'next-sanity'

import { ActionIndicator } from '@/components/ui/action-indicator'
import { CardSurface } from '@/components/ui/card-surface'
import { SanityImage } from '@/components/ui/sanity-image'
import { siteLanguage } from '@/config/env'
import { postPath } from '@/config/paths'
import { formatDate } from '@/lib/format-date'
import { resolveCardAction, type OwnAction } from '@/lib/sanity/card-action'
import { resolveCardDesign } from '@/lib/sanity/card-design'
import {
  CARD_SHADOW_CLASS,
  OWN_SHADOW,
  resolveCardDepth,
  resolveCardLift,
} from '@/lib/sanity/depth-options'
import { textRoleProps } from '@/lib/sanity/text-role'

import type { BlogCardDesign, PostCardData } from '../types'
import { authorName } from '../utils/author'

/** The text roles a card draws (post-card-capabilities.ts), and what each draws with nothing chosen. */
const ROLES = ['meta', 'title', 'body'] as const
const OWN_META = { size: 'text-small', weight: 'regular', colour: 'text-ink-muted' } as const
const OWN_TITLE = { size: 'text-h4', weight: 'semibold' } as const
const OWN_BODY = { size: 'text-body', weight: 'regular', colour: 'text-ink-muted' } as const

/** No indicator until Blog settings › Post cards › Indicator chooses one. */
const OWN_ACTION: OwnAction = { glyph: 'none', motion: 'nudge' }

// A card draws no surface of its own, so a chosen one also brings its corners and the room inside it.
const OWN_SURFACE = { background: '', border: '', still: true }
const DRAWN = 'rounded-card p-4'

interface Props {
  post: PostCardData
  /** Heading level of the title: h2 under the page's <h1>, h3 inside a section with its own h2. */
  headingLevel?: 'h2' | 'h3'
  /** Preload the image: for the card most likely to be the largest paint. */
  preload?: boolean
  /** The post cards' design, from Blog settings. */
  cardDesign?: BlogCardDesign | null
  /** The tone the card sits on, which its mark is measured against. */
  tone?: string
}

/** One post in a list. The title link stretches over the whole card, so there is a single link per post. */
export function PostCard({
  post,
  headingLevel: Heading = 'h2',
  preload = false,
  cardDesign,
  tone,
}: Props) {
  const publishedAt = stegaClean(post.publishedAt)
  const author = authorName(post.author)
  const look = resolveCardDesign(cardDesign, ROLES)
  const action = resolveCardAction(cardDesign, OWN_ACTION)
  // A card with no fill or border has nothing for a shadow to sit on, so depth waits for a surface. Then
  // the site's Card depth reaches it, and a depth chosen here replaces it.
  const { background, border } = look.surface
  const surfaced = background !== 'transparent' && (Boolean(background) || Boolean(border))
  const depth = surfaced ? resolveCardDepth([cardDesign], OWN_SHADOW.siteCardFree) : undefined

  return (
    <CardSurface
      as="article"
      className="group relative flex h-full flex-col"
      own={OWN_SURFACE}
      drawnClass={surfaced && !depth ? `${DRAWN} ${CARD_SHADOW_CLASS.free}` : DRAWN}
      depth={depth}
      lift={resolveCardLift([cardDesign]) === 'lift'}
      design={look.surface}
      mark={{ input: cardDesign?.mark, scope: 'card', tone, levels: [cardDesign] }}
    >
      <SanityImage
        image={post.mainImage}
        width={800}
        height={450}
        preload={preload}
        sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
        className="aspect-video w-full rounded-card object-cover"
      />
      <p {...textRoleProps('meta', 'mt-4 text-small text-ink-muted', OWN_META, look.text.meta)}>
        <time dateTime={publishedAt}>{formatDate(publishedAt, siteLanguage)}</time>
        {author && <> · {author}</>}
      </p>
      <Heading
        {...textRoleProps(
          'title',
          'mt-2 text-h4 font-semibold text-balance',
          OWN_TITLE,
          look.text.title,
        )}
      >
        <Link
          href={postPath(stegaClean(post.slug))}
          className="group-hover:underline after:absolute after:inset-0"
        >
          {post.title}
        </Link>
      </Heading>
      <p {...textRoleProps('body', 'mt-2 text-ink-muted', OWN_BODY, look.text.body)}>
        {post.excerpt}
      </p>
      {/* Decoration: the title link above is stretched over the card and stays its one destination. */}
      <ActionIndicator
        glyph={action.glyph}
        external={false}
        motion={action.motion}
        distance={action.distance}
        colour={action.colour}
        className="mt-4"
      />
    </CardSurface>
  )
}
