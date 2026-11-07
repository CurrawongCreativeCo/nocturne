import { MOTION_DEFAULTS } from '@/components/motion/presets'
import { SectionFrame } from '@/components/ui/section-frame'
import { SectionHeader } from '@/components/ui/section-header'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { sectionTitle } from '@/lib/sanity/section-title'
import { resolveTextRoles } from '@/lib/sanity/text-role'

import { LogoItem } from './logo-item'
import type { SectionProps } from '../../../types'

const HEADER_ROLES = ['eyebrow', 'heading', 'intro'] as const

/** The heading is a small caption over the logos: Medium is that size, and the steps move from it. */
const OWN_CAPTION = { size: 'text-small', weight: 'semibold', colour: 'text-ink-muted' } as const

export const LOGO_CLOUD_DEFAULTS: SectionDefaults = {
  spacing: 'compact',
  container: 'max-w-content',
  align: 'center',
  motion: MOTION_DEFAULTS.still,
}

export function LogoCloudGrid({ data, isFirst }: SectionProps<'logoCloud'>) {
  const { heading, intro, logos } = data
  const title = sectionTitle(data)
  const { text, justify } = sectionTraits(data.style, LOGO_CLOUD_DEFAULTS)

  return (
    <SectionFrame style={data.style} defaults={LOGO_CLOUD_DEFAULTS} isFirst={isFirst}>
      <SectionHeader
        as={null}
        eyebrow={data.eyebrow}
        title={title}
        heading={heading}
        intro={intro}
        design={resolveTextRoles(data.headerDesign, HEADER_ROLES)}
        headingClass="text-small font-semibold text-ink-muted"
        own={{ heading: OWN_CAPTION }}
        each={text}
      />
      <ul className={`mt-8 flex flex-wrap items-center gap-x-12 gap-y-8 ${justify}`}>
        {logos.map((logo) => (
          <li key={logo._key}>
            <LogoItem logo={logo} />
          </li>
        ))}
      </ul>
    </SectionFrame>
  )
}
