import { stegaClean } from 'next-sanity'

import { FramedImage } from '@/components/ui/framed-image'
import { PlainText } from '@/components/ui/plain-text'
import { RichHeading } from '@/components/ui/rich-heading'
import { SanityImage } from '@/components/ui/sanity-image'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { sectionTitle } from '@/lib/sanity/section-title'

import { OpenImageButton } from './lightbox-provider'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep it equal to the initial style in its schema.
export const DEFAULTS: SectionDefaults = { container: 'max-w-content', align: 'start' }

export type GalleryData = SectionProps<'gallery'>['data']
export type GalleryImage = GalleryData['images'][number]

/** Names the gallery for screen readers: the carousel, the lightbox and every thumbnail's button. */
export function galleryLabel(data: GalleryData): string {
  return sectionTitle(data) ?? 'Image gallery'
}

/** Columns the editor chose, kept within what the layouts have classes for (3 if unset). */
export function columnCount({ columns }: GalleryData): 2 | 3 | 4 {
  return columns <= 2 ? 2 : columns >= 4 ? 4 : 3
}

/**
 * `sizes` for a picture that takes one column of the container (80rem at most) from `lg` up, half
 * of it from `sm`, and all of it below.
 */
export function columnSizes(columns: number): string {
  return `(min-width: 1024px) calc(min(100vw, 80rem) / ${columns}), (min-width: 640px) 50vw, 100vw`
}

export function GalleryHeader({ data }: { data: GalleryData }) {
  const { heading, intro } = data
  const title = sectionTitle(data)
  const { block, text } = sectionTraits(data.style, DEFAULTS)
  if (!title && !intro) return null

  return (
    <header className={`mb-12 max-w-measure-narrow ${block} ${text}`}>
      {title && (
        <RichHeading
          as="h2"
          blocks={heading}
          fallback={title}
          className="text-h2 font-semibold text-balance"
        />
      )}
      <PlainText text={intro} className="mt-4 text-lead text-pretty text-ink-muted" />
    </header>
  )
}

/**
 * A picture as the button that opens it in the lightbox. The button's name says which picture it is
 * ("Open image 3 of 12: Alt text"), so the <img> inside is left silent.
 */
export function Thumbnail({
  image,
  index,
  total,
  className,
  eager,
  sizes,
  fill,
  design,
}: {
  image: GalleryImage
  index: number
  total: number
  className: string
  /** Above the fold: skip lazy loading. */
  eager?: boolean
  sizes: string
  /** Crop to a 4:3 box (the shape, motion and frame of the section's `imageDesign`); otherwise the picture keeps its own shape. */
  fill?: boolean
  design?: GalleryData['imageDesign']
}) {
  const alt = stegaClean(image.alt)
  const label = `Open image ${index + 1} of ${total}${alt ? `: ${alt}` : ''}`
  const loading = eager ? 'eager' : 'lazy'

  return (
    <OpenImageButton index={index} label={label} className={className}>
      {fill ? (
        // `clip` keeps the hover zoom inside the picture's shape, even with no design set.
        <FramedImage
          image={image}
          alt=""
          design={design}
          clip
          aspect="4/3"
          sizes={sizes}
          loading={loading}
          imageClassName="motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
        />
      ) : (
        <SanityImage
          image={image}
          alt=""
          width={900}
          sizes={sizes}
          loading={loading}
          className="h-auto w-full"
        />
      )}
    </OpenImageButton>
  )
}
