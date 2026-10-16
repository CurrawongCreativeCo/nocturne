import { MOTION_DEFAULTS } from '@/components/motion/presets'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'

import { LogoItem } from './logo-item'
import type { SectionProps } from '../../../types'

export const LOGO_CLOUD_DEFAULTS: SectionDefaults = {
  spacing: 'compact',
  container: 'max-w-content',
  align: 'center',
  motion: MOTION_DEFAULTS.still,
}

export function LogoCloudGrid({ data, isFirst }: SectionProps<'logoCloud'>) {
  const { title, logos } = data
  const { text, justify } = sectionTraits(data.style, LOGO_CLOUD_DEFAULTS)

  return (
    <SectionFrame style={data.style} defaults={LOGO_CLOUD_DEFAULTS} isFirst={isFirst}>
      {title && <h2 className={`text-small font-semibold text-ink-muted ${text}`}>{title}</h2>}
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
