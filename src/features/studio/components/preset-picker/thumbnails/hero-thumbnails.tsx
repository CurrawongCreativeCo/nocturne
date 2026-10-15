import type { PresetThumbnailProps } from '@/lib/sanity/schema/preset-field'

import { Button, Eyebrow, Heading, Lines, Picture, Wireframe } from './wireframe'

/** Overlay: text centred over a picture that fills the section. */
export function HeroOverlayThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="hero-overlay">
      <Picture x={0} y={0} w={160} h={120} frame={false} />
      <Heading x={36} y={34} w={88} />
      <Heading x={52} y={45} w={56} />
      <Lines x={48} y={62} w={64} />
      <Button x={49} y={80} />
      <Button x={79} y={80} />
    </Wireframe>
  )
}

/** Split: text on one side, a framed picture on the other. */
export function HeroSplitThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="hero-split">
      <Eyebrow x={14} y={30} />
      <Heading x={14} y={38} w={62} />
      <Heading x={14} y={49} w={46} />
      <Lines x={14} y={66} w={56} count={3} />
      <Button x={14} y={88} />
      <Picture x={88} y={16} w={60} h={88} />
    </Wireframe>
  )
}

/** Editorial: an oversized heading, a small square picture beside it, text underneath. */
export function HeroEditorialThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="hero-editorial">
      <Heading x={14} y={20} w={96} h={13} />
      <Heading x={14} y={38} w={74} h={13} />
      <Heading x={14} y={56} w={50} h={13} />
      <Picture x={116} y={20} w={30} h={30} />
      <Lines x={14} y={82} w={70} count={2} />
      <Button x={14} y={98} />
    </Wireframe>
  )
}

/** Full bleed: the picture runs edge to edge and the text sits low on it, to one side. */
export function HeroFullBleedThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="hero-full-bleed">
      <Picture x={0} y={0} w={160} h={120} frame={false} />
      <Heading x={14} y={68} w={78} h={9} />
      <Heading x={14} y={81} w={52} h={9} />
      <Lines x={14} y={97} w={60} count={1} />
      <Button x={14} y={106} w={20} />
    </Wireframe>
  )
}
