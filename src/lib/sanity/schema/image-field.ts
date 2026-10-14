import { defineField, type ImageDefinition, type ImageOptions, type ImageRule } from 'sanity'

import { getAutoAltText } from './auto-alt-text'
import {
  describeImageProblem,
  recommendation,
  type Dimensions,
  type ImageGuidance,
} from './image-guidance'

/**
 * Options shared by every image: hotspot, plus Sanity AI Assist writing the alt text from the
 * picture. Manual by default: an editor picks "Generate image description" on the alt field. The
 * "AI settings" Studio tool can switch on automatic runs on upload (each run spends AI credits); the
 * getter is read live by the plugin. Inert where AI Assist isn't available (see README).
 */
export const imageOptions = {
  hotspot: true,
  aiAssist: {
    imageDescriptionField: {
      path: 'alt',
      get updateOnImageChange() {
        return getAutoAltText()
      },
    },
  },
} satisfies ImageOptions

/**
 * Alt text field for any image. With `required`, publishing is blocked while an image is set
 * but has no alt text. Shared by `imageField` and rich-text images.
 */
export function altField({ required }: { required: boolean }) {
  return defineField({
    name: 'alt',
    title: 'Alternative text',
    type: 'string',
    description: 'Describe the image for screen readers. Leave empty only if decorative.',
    validation: (rule) =>
      required
        ? rule.custom((alt, { parent }) =>
            (parent as { asset?: unknown } | undefined)?.asset && !alt
              ? 'Alt text is required'
              : true,
          )
        : rule,
  })
}

/** Asset id -> dimensions. An asset never changes, so each is fetched once per Studio session. */
const dimensionsCache = new Map<string, Promise<Dimensions | undefined>>()

function fetchDimensions(
  assetId: string,
  getClient: (options: { apiVersion: string }) => {
    fetch: <T>(query: string, params: Record<string, unknown>) => Promise<T>
  },
) {
  let pending = dimensionsCache.get(assetId)
  if (!pending) {
    pending = getClient({ apiVersion: '2025-01-01' })
      .fetch<Dimensions | null>('*[_id == $id][0].metadata.dimensions{width, height}', {
        id: assetId,
      })
      .then((found) => (found?.width && found.height ? found : undefined))
      .catch(() => undefined)
    dimensionsCache.set(assetId, pending)
    // Don't remember a failure or a still-processing asset: check again next time.
    void pending.then((found) => {
      if (!found) dimensionsCache.delete(assetId)
    })
  }
  return pending
}

/** Warning-level check that the uploaded picture suits its spot. Never blocks publishing. */
function imageSuitability(guidance: ImageGuidance) {
  return (rule: ImageRule) =>
    rule
      .custom(async (value, { getClient }) => {
        const ref = value?.asset?._ref
        // Vector images scale to any size and shape.
        if (!ref || ref.endsWith('-svg')) return true
        const dimensions = await fetchDimensions(ref, getClient)
        return (dimensions ? describeImageProblem(dimensions, guidance) : undefined) ?? true
      })
      .warning()
}

type ImageFieldOptions = Omit<ImageDefinition, 'type'> &
  ImageGuidance & {
    requireAlt?: boolean
    group?: string | string[]
    /** Mention that SVG is preferred (logos). SVGs are never size-checked. */
    preferSvg?: boolean
  }

/**
 * Field factory for images with hotspot + required alt text. A factory (rather
 * than a named object type) keeps the stored shape a plain `image`, so
 * @sanity/image-url and Studio's image tooling work unchanged.
 *
 * `aspect`, `minWidth` and `orientation` describe the spot the picture fills. They add
 * "Recommended: 2400 × 1600 px, landscape." to the description and a warning (not an error)
 * when the uploaded picture is narrower or a different shape by more than 15%.
 */
export function imageField(overrides: ImageFieldOptions) {
  const {
    requireAlt = true,
    fields = [],
    aspect,
    minWidth,
    orientation,
    preferSvg,
    description,
    validation,
    ...rest
  } = overrides
  const guidance: ImageGuidance = { aspect, minWidth, orientation }
  const hint =
    typeof description === 'string' || description === undefined
      ? [description, preferSvg ? 'SVG preferred.' : '', recommendation(guidance)]
          .filter(Boolean)
          .join(' ')
      : ''
  const hasGuidance = Boolean(aspect || minWidth || orientation)
  const userRules = typeof validation === 'function' ? validation : undefined
  return defineField({
    type: 'image',
    options: imageOptions,
    ...rest,
    ...(hint ? { description: hint } : {}),
    ...(hasGuidance || userRules
      ? {
          validation: (rule: ImageRule) => [
            ...(userRules ? [userRules(rule)].flat() : []),
            ...(hasGuidance ? [imageSuitability(guidance)(rule)] : []),
          ],
        }
      : {}),
    fields: [altField({ required: requireAlt }), ...fields],
  })
}
