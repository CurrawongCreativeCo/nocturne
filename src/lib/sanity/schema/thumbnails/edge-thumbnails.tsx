import { closeToTop, edgeBackLine, edgeFill } from '@/components/ui/section-edges'
import { colorHex } from '@/config/tokens.generated'

import type { SectionEdge } from '../../section-style-options'
import type { PresetThumbnailProps } from '../preset-field'
import { HEIGHT, WIDTH } from './wireframe'

/** Where the edge band sits in the picture: the shape's 0-1 box is stretched over it. */
const BAND_TOP = 54
const BAND_HEIGHT = 44

/**
 * Two sections one above the other: a dark one on top, cut to the shape, and a light one showing
 * through the cut below. Drawn from the real paths (components/ui/section-edges.ts), so the picture
 * is the edge the site draws. In the site's colours, as the tone thumbnails are.
 */
function EdgeThumbnail({ edge }: { edge: SectionEdge }) {
  const band = `translate(0 ${BAND_TOP}) scale(${WIDTH} ${BAND_HEIGHT})`
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      data-wireframe={`edge-${edge}`}
      style={{ display: 'block' }}
    >
      <rect width={WIDTH} height={HEIGHT} fill={colorHex.surfaceAlt} />
      <rect
        x={44}
        y={BAND_TOP + BAND_HEIGHT + 8}
        width={72}
        height={6}
        rx={2}
        fill={colorHex.ink}
      />
      <rect
        x={32}
        y={BAND_TOP + BAND_HEIGHT + 19}
        width={96}
        height={3}
        rx={1.5}
        fill={colorHex.inkMuted}
      />
      {edge === 'layered' ? (
        <path
          d={closeToTop(edgeBackLine())}
          transform={band}
          fill={colorHex.accent2}
          fillOpacity={0.55}
        />
      ) : null}
      <rect
        width={WIDTH}
        height={BAND_TOP + (edge === 'none' ? BAND_HEIGHT / 2 : 0)}
        fill={colorHex.surfaceInverse}
      />
      {edge === 'none' ? null : (
        <path d={edgeFill(edge)} transform={band} fill={colorHex.surfaceInverse} />
      )}
      <rect x={32} y={16} width={96} height={9} rx={2} fill={colorHex.inkInverse} />
      <rect x={44} y={31} width={72} height={3} rx={1.5} fill={colorHex.inkInverseMuted} />
    </svg>
  )
}

export const EdgeNoneThumbnail = (_props: PresetThumbnailProps) => <EdgeThumbnail edge="none" />
export const EdgeDiagonalThumbnail = (_props: PresetThumbnailProps) => (
  <EdgeThumbnail edge="diagonal" />
)
export const EdgeWaveThumbnail = (_props: PresetThumbnailProps) => <EdgeThumbnail edge="wave" />
export const EdgeCurveThumbnail = (_props: PresetThumbnailProps) => <EdgeThumbnail edge="curve" />
export const EdgeArchThumbnail = (_props: PresetThumbnailProps) => <EdgeThumbnail edge="arch" />
export const EdgeLayeredThumbnail = (_props: PresetThumbnailProps) => (
  <EdgeThumbnail edge="layered" />
)
