import { stegaClean } from 'next-sanity'

import { MOTION_DEFAULTS } from '@/components/motion/presets'
import { SanityImage } from '@/components/ui/sanity-image'
import { NewTabNotice } from '@/components/ui/sanity-link'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'

import type { SectionProps } from '../../types'

const DEFAULTS: SectionDefaults = {
  spacing: 'compact',
  container: 'max-w-content',
  align: 'center',
  motion: MOTION_DEFAULTS.still,
}

export function LogoCloud({ data, isFirst }: SectionProps<'logoCloud'>) {
  const { title, logos } = data
  const { text, justify } = sectionTraits(data.style, DEFAULTS)

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      {title && <h2 className={`text-small font-semibold text-ink-muted ${text}`}>{title}</h2>}
      <ul className={`mt-8 flex flex-wrap items-center gap-x-12 gap-y-8 ${justify}`}>
        {logos.map((logo) => {
          const img = (
            <SanityImage
              image={logo.image}
              alt={logo.name}
              height={40}
              className="h-10 w-auto object-contain opacity-70 grayscale transition group-hover:opacity-100 group-hover:grayscale-0 group-focus-visible:opacity-100 group-focus-visible:grayscale-0"
            />
          )
          return (
            <li key={logo._key}>
              {logo.url ? (
                <a
                  href={stegaClean(logo.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  {img}
                  <NewTabNotice />
                </a>
              ) : (
                <div className="group">{img}</div>
              )}
            </li>
          )
        })}
      </ul>
    </SectionFrame>
  )
}
