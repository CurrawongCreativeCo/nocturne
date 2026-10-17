import { stegaClean } from 'next-sanity'
import type { CSSProperties } from 'react'

import { RichHeading } from '@/components/ui/rich-heading'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits } from '@/components/ui/section-style'
import { sectionTitle } from '@/lib/sanity/section-title'

import { LOGO_CLOUD_DEFAULTS } from './grid'
import { LogoItem } from './logo-item'
import { LazyMarqueeToggle } from './marquee-toggle-lazy'
import type { SectionProps } from '../../../types'

/**
 * An endless row of logos, moved by CSS (see "Marquee" in globals.css). The list is rendered twice and
 * the track slides one list's width, so the loop has no seam; the copy is hidden from assistive
 * technology and its links are out of the tab order. Without JavaScript or under reduced motion the
 * first list is the static wrapped grid and the copy is not shown.
 */
export function LogoCloudMarquee({ data, isFirst }: SectionProps<'logoCloud'>) {
  const { heading, logos } = data
  const title = sectionTitle(data)
  const { text, justify, align } = sectionTraits(data.style, LOGO_CLOUD_DEFAULTS)
  const colour = stegaClean(data.logoColour) === 'colour' ? 'colour' : 'grey'

  const track = {
    '--logo-count': logos.length,
    '--marquee-static-justify': align === 'center' ? 'center' : 'flex-start',
  } as CSSProperties
  // pr-12 matches the gap, so the distance between the lists equals the gap within them.
  const group = 'flex min-w-[100vw] shrink-0 items-center justify-around gap-x-12 pr-12'

  return (
    <SectionFrame style={data.style} defaults={LOGO_CLOUD_DEFAULTS} isFirst={isFirst}>
      {title && (
        <RichHeading
          as="h2"
          blocks={heading}
          fallback={title}
          className={`text-small font-semibold text-ink-muted ${text}`}
        />
      )}
      <div data-marquee style={track}>
        <div data-marquee-viewport className="mt-8 overflow-x-clip">
          <div data-marquee-track className="flex w-max">
            <ul data-marquee-group className={group}>
              {logos.map((logo) => (
                <li key={logo._key}>
                  <LogoItem logo={logo} colour={colour} />
                </li>
              ))}
            </ul>
            <ul data-marquee-copy data-marquee-group aria-hidden="true" className={group}>
              {logos.map((logo) => (
                <li key={logo._key}>
                  <LogoItem logo={logo} colour={colour} copy />
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div data-marquee-toggle className={`mt-6 flex min-h-9 ${justify}`}>
          <LazyMarqueeToggle />
        </div>
      </div>
    </SectionFrame>
  )
}
