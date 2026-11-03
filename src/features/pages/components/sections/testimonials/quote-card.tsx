import { PARAGRAPH_GAP, PlainLines } from '@/components/ui/plain-text'
import { ProfileImage, type ProfileImageScale } from '@/components/ui/profile-image'
import { plainTextParagraphs } from '@/lib/plain-text'
import { resolveAvatar } from '@/lib/sanity/profile-image-options'
import { themeColourCss } from '@/lib/sanity/theme-colour'

import type { SectionProps } from '../../../types'

type Data = SectionProps<'testimonials'>['data']
type Item = Data['items'][number]

/** Medium is the 48 px circle the avatar always was. */
const AVATAR_SCALE: ProfileImageScale = {
  box: { small: 'size-10', medium: 'size-12', large: 'size-16' },
  height: { small: 'h-10', medium: 'h-12', large: 'h-16' },
  px: { small: 40, medium: 48, large: 64 },
}

/** One quote with its author, shared by every layout. Fills the height it is given. */
export function QuoteCard({
  item,
  avatarDesign,
}: {
  item: Item
  avatarDesign?: Data['avatarDesign']
}) {
  const quote = plainTextParagraphs(item.quote)
  return (
    <figure className="flex h-full w-full flex-col rounded-card bg-surface p-8 shadow-card ring-1 ring-line">
      <blockquote className={`flex-1 text-lead text-pretty text-ink ${PARAGRAPH_GAP}`}>
        {quote.length === 1 ? (
          <>
            “<PlainLines lines={quote[0] ?? []} />”
          </>
        ) : (
          // Several paragraphs: the quotation marks open the first and close the last.
          quote.map((lines, index) => (
            // eslint-disable-next-line react/no-array-index-key -- split from one string, never reordered
            <p key={index}>
              {index === 0 && '“'}
              <PlainLines lines={lines} />
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
          className="shrink-0"
        />
        <div>
          <div className="font-semibold">{item.name}</div>
          {item.role && <div className="text-small text-ink-muted">{item.role}</div>}
        </div>
      </figcaption>
    </figure>
  )
}
