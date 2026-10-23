import { stegaClean } from 'next-sanity'

import { DecorativeDivider } from '@/components/ui/decorative-divider'
import { InlineList } from '@/components/ui/inline-list'
import { PlainText } from '@/components/ui/plain-text'
import { ProfileImage } from '@/components/ui/profile-image'
import { bioParagraphs, plainTextParagraphs } from '@/lib/plain-text'
import type { ElementDepth } from '@/lib/sanity/depth-options'
import type { ResolvedDivider } from '@/lib/sanity/divider-options'
import { inlineListItems, resolveInlineListDesign } from '@/lib/sanity/inline-list-options'
import { resolveProfileImage } from '@/lib/sanity/profile-image-options'
import { themeColourCss, themeColourStyle } from '@/lib/sanity/theme-colour'
import { showsWordmark } from '@/lib/sanity/wordmark-options'
import type { SanityImageData } from '@/types/sanity'

import type { LinkListLayout } from './link-list-types'
import { WordmarkHeading, type WordmarkImage } from './wordmark-heading'
import type { SectionProps } from '../../../types'

type Data = SectionProps<'linkList'>['data']
const clean = (value: string | null | undefined) => (value ? stegaClean(value).trim() : '')

/** Whether the profile draws anything: a picture, a name or wordmark, categories or a bio. */
export function hasProfile(data: Data): boolean {
  const profile = data.profile
  const nameImage = profile?.nameImage as WordmarkImage | null | undefined
  return Boolean(
    clean(profile?.name) ||
    inlineListItems(profile?.categories).length > 0 ||
    plainTextParagraphs(profile?.bio).length > 0 ||
    (profile?.image as SanityImageData | null | undefined)?.asset ||
    (showsWordmark(profile?.nameDisplay, nameImage) && nameImage),
  )
}

/**
 * The picture, the name, the service categories and the bio. The name can be drawn as a wordmark
 * (Content › Profile › Show as); its text is then the picture's alt text, so the heading keeps its
 * name. The categories are their own list (Design › Service categories), and the bio is paragraphs.
 */
export function Profile({
  data,
  layout,
  isFirst,
  block,
  align,
  pictureDepth,
  categoriesDivider,
  className,
  nameLevel: Name,
}: {
  data: Data
  layout: LinkListLayout
  isFirst: boolean
  block: string
  align: 'start' | 'center'
  pictureDepth: ElementDepth | undefined
  /** Design › Dividers › Between the categories and the bio; drawn only when both show. */
  categoriesDivider: ResolvedDivider | null
  /** The space below: none when a divider follows, which brings its own. */
  className: string
  nameLevel: 'h2'
}) {
  const name = clean(data.profile?.name)
  const categories = inlineListItems(data.profile?.categories)
  const bio = bioParagraphs(data.profile?.bio, categories)
  const image = data.profile?.image as SanityImageData | null | undefined
  const nameImage = data.profile?.nameImage as WordmarkImage | null | undefined
  const wordmark = showsWordmark(data.profile?.nameDisplay, nameImage) ? nameImage : null
  if (!hasProfile(data)) return null
  const design = data.profileDesign
  const { textColour, ...categoryLook } = resolveInlineListDesign(data.categoryDesign)
  const hasHeading = Boolean(name || wordmark)
  const bioGap = categories.length > 0 ? 'mt-3' : hasHeading ? 'mt-2' : ''

  return (
    <div className={className || undefined}>
      <ProfileImage
        image={image}
        design={resolveProfileImage(design)}
        scale={layout.profile.picture}
        colour={themeColourCss(design?.borderColour)}
        preload={isFirst}
        className={`mb-4 ${block} ${pictureDepth?.className ?? ''}`}
        style={pictureDepth?.style}
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
      <InlineList
        items={categories}
        {...categoryLook}
        colour={textColour}
        align={align}
        label="Services"
        className={`${hasHeading ? 'mt-2' : ''} ${block}`}
      />
      {categoriesDivider && categories.length > 0 && bio.length > 0 && (
        <DecorativeDivider divider={categoriesDivider} block={block} className="my-4!" />
      )}
      <PlainText
        paragraphs={bio}
        className={`${bioGap} max-w-measure-narrow text-pretty text-ink-muted ${block}`}
        style={themeColourStyle(design?.bioColour)}
      />
    </div>
  )
}
