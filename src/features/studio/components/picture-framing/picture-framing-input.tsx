import { createImageUrlBuilder } from '@sanity/image-url'
import { Stack } from '@sanity/ui'
import { useEffect, useMemo, useState } from 'react'
import { useClient, useFormValue, type ObjectInputProps, type Path } from 'sanity'

import { FRAMING_RESOLVERS } from '@/lib/sanity/image-frame-geometry'
import { assetSizeFromId } from '@/lib/sanity/image-framing'
import { framingKeyOf } from '@/lib/sanity/schema/image-framing-option'

import type { PictureSource } from './adjust-picture-dialog'
import { PictureFraming } from './picture-framing'

const API_VERSION = '2025-01-01'
const PREVIEW_WIDTH = 1200

/** Placeholders and frame artwork never change for an id, so each is fetched once per session. */
const lookups = new Map<string, Promise<string | undefined>>()

function lookup(key: string, run: () => Promise<string | null>): Promise<string | undefined> {
  let pending = lookups.get(key)
  if (!pending) {
    pending = run().then(
      (found) => found ?? undefined,
      () => undefined,
    )
    lookups.set(key, pending)
    // A failure or a still-processing asset is asked again next time.
    void pending.then((found) => {
      if (found === undefined) lookups.delete(key)
    })
  }
  return pending
}

/** `query` is told the document id as `$id`. */
function useLookup(key: string | undefined, query: string) {
  const client = useClient({ apiVersion: API_VERSION })
  const [found, setFound] = useState<{ key: string; value: string } | undefined>()
  useEffect(() => {
    if (!key) return undefined
    let current = true
    void lookup(`${query}:${key}`, () => client.fetch<string | null>(query, { id: key })).then(
      (value) => {
        if (current && value !== undefined) setFound({ key, value })
      },
    )
    return () => {
      current = false
    }
  }, [client, key, query])
  return found && found.key === key ? found.value : undefined
}

/**
 * Sanity's own image input with "Adjust picture" under it, for image fields that declare
 * `options.framing` (a key into lib/sanity/image-frame-geometry.ts). The shapes come from the
 * design the key's resolver reads from the document, so the stage shows what the page draws.
 */
export function PictureFramingInput(props: ObjectInputProps) {
  const { value, path, readOnly, onChange, schemaType } = props
  const key = framingKeyOf(schemaType.options)
  const resolver = key ? FRAMING_RESOLVERS[key] : undefined

  const designPath: Path = resolver
    ? [
        ...path.slice(0, -resolver.designPath.drop),
        ...(resolver.designPath.field ? [resolver.designPath.field] : []),
      ]
    : []
  const design = useFormValue(designPath)
  const frameRef = resolver?.frameRef?.(design)
  const frameUrl = useLookup(
    frameRef,
    '*[_id == $id][0]{"url": select(format == "picture" => picture.asset->url, svg.asset->url)}.url',
  )
  const shapes = useMemo(
    () => resolver?.resolve(design, frameUrl, path) ?? [],
    [resolver, design, frameUrl, path],
  )

  const client = useClient({ apiVersion: API_VERSION })
  const assetId = (value as { asset?: { _ref?: string } } | undefined)?.asset?._ref
  const lqip = useLookup(assetId, '*[_id == $id][0].metadata.lqip')
  const source = useMemo<PictureSource | undefined>(() => {
    const size = assetSizeFromId(assetId)
    if (!assetId || !size) return undefined
    const { projectId, dataset } = client.config()
    if (!projectId || !dataset) return undefined
    // The whole upload (no crop or hotspot), at editing size: never the original file.
    const previewUrl = createImageUrlBuilder({ projectId, dataset })
      .image({ asset: { _ref: assetId } })
      .width(PREVIEW_WIDTH)
      .fit('max')
      .auto('format')
      .url()
    return { size, previewUrl, lqip }
  }, [assetId, client, lqip])

  return (
    <Stack gap={3}>
      {props.renderDefault(props)}
      <PictureFraming
        value={value}
        shapes={shapes}
        source={source}
        readOnly={Boolean(readOnly)}
        onChange={onChange}
      />
    </Stack>
  )
}
