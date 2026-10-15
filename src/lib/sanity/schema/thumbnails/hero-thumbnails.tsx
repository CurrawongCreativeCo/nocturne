import type { CSSProperties } from 'react'

import type { PresetThumbnailProps } from '../preset-field'
import { Button, Eyebrow, Heading, Lines, Picture, Wireframe } from './wireframe'

const FG = 'var(--card-fg-color)'
const picturePaint: CSSProperties = {
  fill: FG,
  fillOpacity: 0.1,
  stroke: FG,
  strokeOpacity: 0.4,
  strokeWidth: 1,
}

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

/** Split with the picture on the left: the same page, mirrored. */
export function HeroSplitLeftThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="hero-split-left">
      <Picture x={12} y={16} w={60} h={88} />
      <Eyebrow x={86} y={30} />
      <Heading x={86} y={38} w={62} />
      <Heading x={86} y={49} w={46} />
      <Lines x={86} y={66} w={56} count={3} />
      <Button x={86} y={88} />
    </Wireframe>
  )
}

/** Centred text on a plain background: no picture at all. */
export function HeroCentredTextThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="hero-centred-text">
      <Eyebrow x={72} y={28} w={16} />
      <Heading x={34} y={38} w={92} />
      <Heading x={50} y={49} w={60} />
      <Lines x={46} y={66} w={68} count={2} />
      <Button x={49} y={88} />
      <Button x={79} y={88} />
    </Wireframe>
  )
}

/** The split proportions: how much of the width the text and the picture take. */
function ProportionThumbnail({ label, text }: { label: string; text: number }) {
  const total = 128
  const textWidth = Math.round(total * text)
  const gap = 8
  return (
    <Wireframe label={label}>
      <Heading x={16} y={40} w={textWidth - gap} />
      <Lines x={16} y={56} w={textWidth - gap} count={3} />
      <Button x={16} y={80} w={Math.min(22, textWidth - gap)} />
      <Picture x={16 + textWidth} y={20} w={total - textWidth} h={80} />
    </Wireframe>
  )
}

export function HeroProportionEvenThumbnail(_props: PresetThumbnailProps) {
  return <ProportionThumbnail label="hero-proportion-even" text={0.5} />
}

export function HeroProportionTextThumbnail(_props: PresetThumbnailProps) {
  return <ProportionThumbnail label="hero-proportion-text" text={0.6} />
}

export function HeroProportionImageThumbnail(_props: PresetThumbnailProps) {
  return <ProportionThumbnail label="hero-proportion-image" text={0.4} />
}

/** The split picture's shapes, drawn as the picture alone, large. */
export function HeroShapeRoundedThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="hero-shape-rounded">
      <rect x={32} y={30} width={96} height={72} rx={9} style={picturePaint} />
    </Wireframe>
  )
}

export function HeroShapeSquareThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="hero-shape-square">
      <rect x={32} y={30} width={96} height={72} style={picturePaint} />
    </Wireframe>
  )
}

export function HeroShapeCircleThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="hero-shape-circle">
      <circle cx={80} cy={60} r={38} style={picturePaint} />
    </Wireframe>
  )
}

export function HeroShapeArchThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="hero-shape-arch">
      <path d="M52 102 V58 A28 28 0 0 1 108 58 V102 Z" style={picturePaint} />
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
