import { colorHex } from '@/config/tokens.generated'

import { SECTION_OVERLAY_OPACITY, type SECTION_OVERLAYS } from '../../section-style-options'
import type { PresetThumbnailProps } from '../preset-field'
import { HEIGHT, WIDTH } from './wireframe'

type Overlay = (typeof SECTION_OVERLAYS)[number]

/**
 * A busy picture (bright sky, dark hill, a sun) under a dark wash at the option's real strength,
 * with light text on top: the stronger the overlay, the calmer the picture and the clearer the text.
 * Drawn in the site's colours, as the tone thumbnails are, whatever the tone the section really has.
 */
function OverlayThumbnail({ overlay }: { overlay: Overlay }) {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      data-wireframe={`overlay-${overlay}`}
      style={{ display: 'block' }}
    >
      <rect width={WIDTH} height={HEIGHT} fill="#bfdbfe" />
      <circle cx={122} cy={30} r={14} fill="#fde047" />
      <path
        d={`M0 ${HEIGHT} L0 78 L48 40 L90 82 L124 60 L${WIDTH} 84 L${WIDTH} ${HEIGHT} Z`}
        fill="#166534"
      />
      <rect
        width={WIDTH}
        height={HEIGHT}
        fill={colorHex.surfaceInverse}
        opacity={SECTION_OVERLAY_OPACITY[overlay]}
      />
      <rect x={32} y={44} width={96} height={9} rx={2} fill={colorHex.inkInverse} />
      <rect x={48} y={58} width={64} height={9} rx={2} fill={colorHex.inkInverse} />
      <rect x={40} y={76} width={80} height={3} rx={1.5} fill={colorHex.inkInverseMuted} />
      <rect x={48} y={82} width={64} height={3} rx={1.5} fill={colorHex.inkInverseMuted} />
    </svg>
  )
}

export const OverlayNoneThumbnail = (_props: PresetThumbnailProps) => (
  <OverlayThumbnail overlay="none" />
)
export const OverlayLightThumbnail = (_props: PresetThumbnailProps) => (
  <OverlayThumbnail overlay="light" />
)
export const OverlayMediumThumbnail = (_props: PresetThumbnailProps) => (
  <OverlayThumbnail overlay="medium" />
)
export const OverlayStrongThumbnail = (_props: PresetThumbnailProps) => (
  <OverlayThumbnail overlay="strong" />
)
