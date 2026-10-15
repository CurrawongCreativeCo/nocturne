import type { PresetThumbnailProps } from '../preset-field'
import { Heading, Picture, Wireframe } from './wireframe'

const FG = 'var(--card-fg-color)'

/** Grid: a title over rows of equal pictures. */
export function GalleryGridThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="gallery-grid">
      <Heading x={50} y={12} w={60} />
      {[0, 1].flatMap((row) =>
        [0, 1, 2].map((col) => (
          <Picture key={`${row}-${col}`} x={12 + col * 46} y={30 + row * 40} w={42} h={34} />
        )),
      )}
    </Wireframe>
  )
}

/** Masonry: columns of pictures in different heights. */
export function GalleryMasonryThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="gallery-masonry">
      <Heading x={50} y={12} w={60} />
      <Picture x={12} y={30} w={42} h={46} glyph={false} />
      <Picture x={12} y={80} w={42} h={28} glyph={false} />
      <Picture x={58} y={30} w={42} h={28} glyph={false} />
      <Picture x={58} y={62} w={42} h={46} glyph={false} />
      <Picture x={104} y={30} w={42} h={38} glyph={false} />
      <Picture x={104} y={72} w={42} h={36} glyph={false} />
    </Wireframe>
  )
}

/** Slider: pictures running off the edge, then arrows and dots underneath. */
export function GallerySliderThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="gallery-slider">
      <Heading x={50} y={12} w={60} />
      <Picture x={10} y={32} w={64} h={52} />
      <Picture x={82} y={32} w={64} h={52} />
      <Picture x={154} y={32} w={64} h={52} />
      <circle cx={58} cy={100} r={3.5} style={{ fill: FG, fillOpacity: 0, stroke: FG }} />
      <circle cx={72} cy={100} r={2.5} style={{ fill: FG }} />
      <circle cx={80} cy={100} r={2.5} style={{ fill: FG, fillOpacity: 0.35 }} />
      <circle cx={88} cy={100} r={2.5} style={{ fill: FG, fillOpacity: 0.35 }} />
      <circle cx={102} cy={100} r={3.5} style={{ fill: FG, fillOpacity: 0, stroke: FG }} />
    </Wireframe>
  )
}
