import type { PresetThumbnailProps } from '../preset-field'
import { Button, Eyebrow, Heading, Lines, Picture, Wireframe } from './wireframe'

/** Media right: the text on the left, a framed picture on the right. */
export function SplitMediaRightThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="split-media-right">
      <Eyebrow x={14} y={30} />
      <Heading x={14} y={38} w={62} />
      <Heading x={14} y={49} w={46} />
      <Lines x={14} y={66} w={56} count={3} />
      <Button x={14} y={88} />
      <Picture x={88} y={16} w={60} h={88} />
    </Wireframe>
  )
}

/** Media left: the same page, mirrored. */
export function SplitMediaLeftThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="split-media-left">
      <Picture x={12} y={16} w={60} h={88} />
      <Eyebrow x={86} y={30} />
      <Heading x={86} y={38} w={62} />
      <Heading x={86} y={49} w={46} />
      <Lines x={86} y={66} w={56} count={3} />
      <Button x={86} y={88} />
    </Wireframe>
  )
}

/** Stacked: a wide picture above centred text. */
export function SplitStackedThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="split-stacked">
      <Picture x={24} y={10} w={112} h={52} />
      <Heading x={40} y={70} w={80} />
      <Lines x={46} y={84} w={68} count={2} />
      <Button x={65} y={102} />
    </Wireframe>
  )
}

/** Text over media: the picture fills the section and the text sits on it. */
export function SplitOverlayThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="split-overlay">
      <Picture x={0} y={0} w={160} h={120} frame={false} />
      <Heading x={14} y={36} w={72} />
      <Heading x={14} y={47} w={52} />
      <Lines x={14} y={64} w={60} count={2} />
      <Button x={14} y={84} />
    </Wireframe>
  )
}
