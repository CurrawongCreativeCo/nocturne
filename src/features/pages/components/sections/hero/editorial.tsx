import { SanityImage } from '@/components/ui/sanity-image'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'

import { HeroText } from './hero-text'
import type { SectionProps } from '../../../types'

const DEFAULTS: SectionDefaults = {
  tone: 'surface',
  spacing: 'spacious',
  container: 'max-w-content',
  align: 'start',
}

/**
 * Oversized display type and plenty of whitespace. The heading is the LCP element; the small
 * picture (`secondaryImage`) is optional and sits beside it on wide screens.
 */
export function HeroEditorial({ data, isFirst = false, greeting }: SectionProps<'hero'>) {
  const { tone, block, text, justify } = sectionTraits(data.style, DEFAULTS)
  const hasInset = Boolean(data.secondaryImage?.asset)

  return (
    <SectionFrame
      style={data.style}
      defaults={DEFAULTS}
      isFirst={isFirst}
      containerClassName={`grid items-end gap-12 lg:gap-20 ${hasInset ? 'lg:grid-cols-[1fr_16rem]' : ''}`}
    >
      <div className={text}>
        <HeroText
          data={data}
          isFirst={isFirst}
          greeting={greeting}
          tone={tone}
          block={block}
          justify={justify}
          // 1.5 times the display size on wide screens, so no new font size is hard-coded here.
          headingClassName="text-display font-semibold tracking-tight text-balance lg:text-[calc(var(--text-display)*1.5)]"
        />
      </div>
      {hasInset && (
        <SanityImage
          image={data.secondaryImage}
          width={512}
          preload={isFirst}
          sizes="(min-width: 1024px) 16rem, 50vw"
          className="aspect-square w-48 rounded-card object-cover lg:w-full"
        />
      )}
    </SectionFrame>
  )
}
