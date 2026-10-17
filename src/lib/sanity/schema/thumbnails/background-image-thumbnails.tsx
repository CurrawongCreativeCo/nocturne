import type { ReactNode } from 'react'

import { colorHex } from '@/config/tokens.generated'

import {
  SECTION_IMAGE_STRENGTH_OPACITY,
  SECTION_WASH_COLOURS,
  type SECTION_IMAGE_SIZES,
  type SECTION_IMAGE_STRENGTHS,
  type SECTION_WASHES,
} from '../../section-style-options'
import type { PresetThumbnailProps } from '../preset-field'
import { HEIGHT, WIDTH } from './wireframe'

type Size = (typeof SECTION_IMAGE_SIZES)[number]
type Strength = (typeof SECTION_IMAGE_STRENGTHS)[number]
type Wash = (typeof SECTION_WASHES)[number]

/** A picture (sky, sun, hill) in a frame, drawn at `x y w h`. */
function Picture({
  x,
  y,
  w,
  h,
  opacity = 1,
}: Record<'x' | 'y' | 'w' | 'h', number> & { opacity?: number }) {
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={w} height={h} fill="#bfdbfe" />
      <circle cx={x + w * 0.75} cy={y + h * 0.3} r={Math.min(w, h) * 0.12} fill="#fde047" />
      <path
        d={`M${x} ${y + h} L${x} ${y + h * 0.7} L${x + w * 0.35} ${y + h * 0.4} L${x + w * 0.65} ${y + h * 0.75} L${x + w} ${y + h * 0.55} L${x + w} ${y + h} Z`}
        fill="#166534"
      />
    </g>
  )
}

function Frame({ name, children }: { name: string; children: ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      data-wireframe={name}
      style={{ display: 'block' }}
    >
      <rect width={WIDTH} height={HEIGHT} fill={colorHex.surfaceAlt} />
      {children}
    </svg>
  )
}

function SizeThumbnail({ size }: { size: Size }) {
  return (
    <Frame name={`image-size-${size}`}>
      {size === 'cover' ? <Picture x={0} y={0} w={WIDTH} h={HEIGHT} /> : null}
      {size === 'contain' ? <Picture x={WIDTH / 2 - 40} y={0} w={80} h={HEIGHT} /> : null}
      {size === 'actual' ? <Picture x={WIDTH / 2 - 22} y={HEIGHT - 44} w={44} h={36} /> : null}
    </Frame>
  )
}

function StrengthThumbnail({ strength }: { strength: Strength }) {
  return (
    <Frame name={`image-strength-${strength}`}>
      <Picture
        x={0}
        y={0}
        w={WIDTH}
        h={HEIGHT}
        opacity={SECTION_IMAGE_STRENGTH_OPACITY[strength]}
      />
    </Frame>
  )
}

function WashThumbnail({ wash }: { wash: Wash }) {
  const fill =
    wash === 'background'
      ? colorHex.surfaceAlt
      : wash === 'light'
        ? SECTION_WASH_COLOURS.light
        : SECTION_WASH_COLOURS.dark
  return (
    <Frame name={`image-wash-${wash}`}>
      <Picture x={0} y={0} w={WIDTH} h={HEIGHT} />
      <rect width={WIDTH} height={HEIGHT} fill={fill} opacity={0.7} />
      <rect
        x={32}
        y={50}
        width={96}
        height={9}
        rx={2}
        fill={wash === 'dark' ? colorHex.inkInverse : colorHex.ink}
      />
    </Frame>
  )
}

export const ImageSizeCoverThumbnail = (_props: PresetThumbnailProps) => (
  <SizeThumbnail size="cover" />
)
export const ImageSizeContainThumbnail = (_props: PresetThumbnailProps) => (
  <SizeThumbnail size="contain" />
)
export const ImageSizeActualThumbnail = (_props: PresetThumbnailProps) => (
  <SizeThumbnail size="actual" />
)
export const ImageStrengthFullThumbnail = (_props: PresetThumbnailProps) => (
  <StrengthThumbnail strength="full" />
)
export const ImageStrengthSoftThumbnail = (_props: PresetThumbnailProps) => (
  <StrengthThumbnail strength="soft" />
)
export const ImageStrengthFaintThumbnail = (_props: PresetThumbnailProps) => (
  <StrengthThumbnail strength="faint" />
)
export const WashBackgroundThumbnail = (_props: PresetThumbnailProps) => (
  <WashThumbnail wash="background" />
)
export const WashLightThumbnail = (_props: PresetThumbnailProps) => <WashThumbnail wash="light" />
export const WashDarkThumbnail = (_props: PresetThumbnailProps) => <WashThumbnail wash="dark" />
