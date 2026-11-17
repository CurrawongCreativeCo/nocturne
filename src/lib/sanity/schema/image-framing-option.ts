import { isFramingKey, type FramingKey } from '../image-frame-geometry'
import { builtOptions } from './capability-marker'

declare module 'sanity' {
  interface ImageOptions {
    /** A key into the shape registry (lib/sanity/image-frame-geometry.ts): the Studio adds "Adjust picture" (features/studio/components/picture-framing). */
    framing?: FramingKey
  }
}

/**
 * Opts an image field into "Adjust picture": `options: { ...imageOptions, ...framing('linkListProfile') }`.
 * It also marks the field as the picture framing capability (lib/design/capabilities.ts).
 */
export function framing(key: FramingKey): { framing: FramingKey; capability?: 'framing' } {
  return builtOptions('framing', { framing: key }, 'framing')
}

/** The framing key on an image field's options, if it opted in. */
export function framingKeyOf(options: unknown): FramingKey | undefined {
  const key = (options as { framing?: unknown } | null | undefined)?.framing
  return isFramingKey(key) ? key : undefined
}
