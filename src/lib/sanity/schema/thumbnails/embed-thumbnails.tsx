import type { PresetThumbnailProps } from '../preset-field'
import { Button, Heading, Picture, Wireframe } from './wireframe'

/** A heading over a frame of the chosen height, with the "Show" button inside it. */
function Frame({ label, h }: { label: string; h: number }) {
  return (
    <Wireframe label={label}>
      <Heading x={14} y={12} w={60} />
      <Picture x={14} y={28} w={132} h={h} glyph={false} />
      <Button x={61} y={28 + h / 2 - 4} w={38} />
    </Wireframe>
  )
}

export function EmbedShortThumbnail(_props: PresetThumbnailProps) {
  return <Frame label="embed-short" h={30} />
}

export function EmbedMediumThumbnail(_props: PresetThumbnailProps) {
  return <Frame label="embed-medium" h={52} />
}

export function EmbedTallThumbnail(_props: PresetThumbnailProps) {
  return <Frame label="embed-tall" h={78} />
}
