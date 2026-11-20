import { Button, Flex, Stack, Text } from '@sanity/ui'
import { useId, useState } from 'react'
import { useClient } from 'sanity'

import type { EdgeCentre } from '@/lib/sanity/composed-edge-editor'

const ACCEPTED = 'image/png,image/jpeg,image/webp,image/gif,image/avif'
const MAX_BYTES = 10 * 1024 * 1024

/** The stored reference's asset id, when the centre holds a picture. */
export const pictureRef = (centre: EdgeCentre | undefined): string | undefined => {
  const image = centre?.image as { asset?: { _ref?: unknown } } | undefined
  return typeof image?.asset?._ref === 'string' ? image.asset._ref : undefined
}

/**
 * The centre picture. The editor owns this control (rather than rendering Sanity's nested image field): it
 * uploads the file with the Studio's client and writes `centre.image` in the same single change the rest of the
 * editor uses, so the picture is saved with the edge, can be undone with it, and is copied with a design. The
 * page draws the picture decoratively, so it needs no alt text.
 */
export function CentrePicture({
  centre,
  readOnly,
  begin,
  onPick,
  onClear,
}: {
  centre: EdgeCentre
  readOnly?: boolean
  /** Called when an upload starts: the editor's ticket for it, which stops counting once the selection moves on. */
  begin: () => number
  /** Attaches the picture to the edge as it is now; false when the ticket is stale or the editor has moved on. */
  onPick: (ref: string, ticket: number) => boolean
  onClear: () => void
}) {
  const client = useClient({ apiVersion: '2025-01-01' })
  const id = useId()
  const [state, setState] = useState<{ tone: 'idle' | 'busy' | 'error'; text: string }>({
    tone: 'idle',
    text: '',
  })
  const ref = pictureRef(centre)

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setState({ tone: 'error', text: 'Choose a picture file (PNG, JPEG, WebP, GIF or AVIF).' })
      return
    }
    if (file.size > MAX_BYTES) {
      setState({ tone: 'error', text: 'Use a picture under 10 MB.' })
      return
    }
    const ticket = begin()
    setState({ tone: 'busy', text: 'Uploading…' })
    try {
      const asset = await client.assets.upload('image', file, { filename: file.name })
      const attached = onPick(asset._id, ticket)
      setState({
        tone: 'idle',
        text: attached
          ? `Added ${file.name}.`
          : 'The picture was uploaded but not added: the centre choice changed while it was uploading.',
      })
    } catch {
      setState({ tone: 'error', text: 'The picture could not be uploaded. Try again.' })
    }
  }

  return (
    <Stack gap={2} data-edge-control="centre-image">
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 500 }}>
        Decorative picture
      </label>
      <Flex gap={2} align="center" wrap="wrap">
        <input
          id={id}
          type="file"
          accept={ACCEPTED}
          disabled={readOnly === true || state.tone === 'busy'}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (file) void upload(file)
          }}
          style={{ fontSize: 13 }}
        />
        {ref && (
          <Button
            type="button"
            mode="bleed"
            tone="critical"
            fontSize={1}
            padding={2}
            text="Remove picture"
            disabled={readOnly === true}
            onClick={() => {
              onClear()
              setState({ tone: 'idle', text: 'Picture removed.' })
            }}
          />
        )}
      </Flex>
      <Text size={1} muted data-edge-picture="">
        {ref
          ? `Picture chosen (${ref}).`
          : 'No picture chosen yet: the artwork draws without a centre.'}
      </Text>
      <div role="status" aria-live="polite" style={{ fontSize: 13, minHeight: 18 }}>
        {state.text}
      </div>
    </Stack>
  )
}
