import { colorHex } from '@/config/tokens.generated'

import type { SectionPanel } from '../../section-panel'
import type { PresetThumbnailProps } from '../preset-field'
import { HEIGHT, WIDTH } from './wireframe'

/**
 * A section's content on its background: a busy picture with a dark wash, text lines, and the panel
 * drawn as the option's real look (none, frosted glass, an opaque card). Drawn in the site's colours,
 * as the overlay thumbnails are, whatever the tone the section really has.
 */
function PanelThumbnail({ panel }: { panel: SectionPanel }) {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      data-wireframe={`section-panel-${panel}`}
      style={{ display: 'block' }}
    >
      <rect width={WIDTH} height={HEIGHT} fill="#bfdbfe" />
      <circle cx={126} cy={26} r={13} fill="#fde047" />
      <path
        d={`M0 ${HEIGHT} L0 76 L46 38 L88 80 L122 58 L${WIDTH} 82 L${WIDTH} ${HEIGHT} Z`}
        fill="#166534"
      />
      {/* The same calming overlay under all three, so None's text reads and the panels are compared like for like. */}
      <rect width={WIDTH} height={HEIGHT} fill={colorHex.surfaceInverse} opacity={0.5} />
      {panel === 'none' ? null : (
        <rect
          x={22}
          y={28}
          width={116}
          height={64}
          rx={8}
          fill={colorHex.surface}
          opacity={panel === 'glass' ? 0.7 : 1}
          stroke={colorHex.line}
        />
      )}
      <rect
        x={36}
        y={42}
        width={88}
        height={9}
        rx={2}
        fill={panel === 'none' ? colorHex.inkInverse : colorHex.ink}
      />
      <rect
        x={36}
        y={58}
        width={70}
        height={3}
        rx={1.5}
        fill={panel === 'none' ? colorHex.inkInverseMuted : colorHex.inkMuted}
      />
      <rect
        x={36}
        y={65}
        width={56}
        height={3}
        rx={1.5}
        fill={panel === 'none' ? colorHex.inkInverseMuted : colorHex.inkMuted}
      />
    </svg>
  )
}

export const PanelNoneThumbnail = (_props: PresetThumbnailProps) => <PanelThumbnail panel="none" />
export const PanelGlassThumbnail = (_props: PresetThumbnailProps) => (
  <PanelThumbnail panel="glass" />
)
export const PanelSolidThumbnail = (_props: PresetThumbnailProps) => (
  <PanelThumbnail panel="solid" />
)
