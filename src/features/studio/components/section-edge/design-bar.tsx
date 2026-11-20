import { Button, Flex, Stack, Text, TextInput } from '@sanity/ui'
import { useEffect, useId, useState } from 'react'
import { useClient } from 'sanity'

import type { EdgeDesign, EdgeValue } from '@/lib/sanity/composed-edge-editor'
import {
  EdgeDesignError,
  applyEdgeDesign,
  deleteEdgeDesign,
  fetchEdgeDesigns,
  renameEdgeDesign,
  saveEdgeDesign,
  type DesignClient,
} from '@/lib/sanity/edge-designs'

/**
 * Named site designs. A design is an independent copy: saving copies this edge into Design settings, applying
 * copies a design's settings into this section, and neither follows the other afterwards. The designs live in
 * Design settings (agency only), so the bar needs no permission of its own, and saving writes the draft there:
 * it reaches the public site only when Design settings is published, and the site never reads it.
 */
export function DesignBar({
  value,
  problems,
  readOnly,
  onApply,
}: {
  value: EdgeValue
  problems: number
  readOnly?: boolean
  onApply: (edge: EdgeValue) => void
}) {
  const client = useClient({ apiVersion: '2025-01-01' }) as unknown as DesignClient
  const id = useId()
  const [designs, setDesigns] = useState<EdgeDesign[] | null>(null)
  const [name, setName] = useState('')
  const [chosen, setChosen] = useState('')
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)

  const unreadable = 'Saved designs could not be read. Try again in a moment.'
  useEffect(() => {
    let current = true
    fetchEdgeDesigns(client).then(
      (found) => {
        if (current) setDesigns(found)
      },
      () => {
        if (!current) return
        setDesigns([])
        setStatus({ tone: 'error', text: unreadable })
      },
    )
    return () => {
      current = false
    }
  }, [client])
  const reload = async () => {
    try {
      setDesigns(await fetchEdgeDesigns(client))
    } catch {
      setStatus({ tone: 'error', text: unreadable })
    }
  }

  const run = async (work: () => Promise<string>) => {
    setBusy(true)
    setStatus(null)
    try {
      setStatus({ tone: 'ok', text: await work() })
    } catch (error) {
      setStatus({
        tone: 'error',
        text:
          error instanceof EdgeDesignError
            ? error.message
            : 'Design settings could not be saved. Check your connection and try again.',
      })
    } finally {
      setBusy(false)
    }
  }
  const selected = designs?.find((design) => design._key === chosen)

  return (
    <Stack gap={3} data-edge-control="designs">
      <Text size={1} weight="semibold">
        Site designs
      </Text>
      <Text size={1} muted>
        A design is a copy. Applying one copies its settings into this section; after that, editing
        either one never changes the other. Designs are kept in Brand colours and are available to
        every section.
      </Text>
      <Stack gap={2}>
        <label htmlFor={`${id}-apply`} style={{ fontSize: 13, fontWeight: 500 }}>
          Apply a saved design
        </label>
        <Flex gap={2} wrap="wrap">
          <select
            id={`${id}-apply`}
            value={chosen}
            // Not disabled when empty: focusing it is how a design saved elsewhere since loading turns up.
            disabled={readOnly === true || busy}
            onFocus={() => {
              // Another section may have saved a design since this one loaded.
              void reload()
            }}
            onChange={(event) => {
              setChosen(event.currentTarget.value)
              setRenaming(null)
            }}
            style={{ padding: 6, fontSize: 13, minWidth: 180 }}
          >
            <option value="">
              {designs
                ? designs.length
                  ? 'Choose a design…'
                  : 'No designs saved yet'
                : 'Loading…'}
            </option>
            {designs?.map((design) => (
              <option key={design._key} value={design._key}>
                {design.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            mode="ghost"
            fontSize={1}
            padding={2}
            text="Apply copy to this section"
            disabled={readOnly === true || busy || !selected}
            onClick={() => {
              if (!selected) return
              onApply(applyEdgeDesign(selected))
              setStatus({
                tone: 'ok',
                text: `Copied “${selected.name}” into this section. Edit it freely: the saved design is unchanged.`,
              })
            }}
          />
          <Button
            type="button"
            mode="bleed"
            fontSize={1}
            padding={2}
            text="Rename design"
            aria-label={selected ? `Rename the design ${selected.name}` : 'Rename design'}
            disabled={readOnly === true || busy || !selected}
            onClick={() => {
              setRenaming(selected?.name ?? '')
            }}
          />
          <Button
            type="button"
            mode="bleed"
            tone="critical"
            fontSize={1}
            padding={2}
            text="Delete design"
            aria-label={selected ? `Delete the design ${selected.name}` : 'Delete design'}
            disabled={readOnly === true || busy || !selected}
            onClick={() => {
              if (!selected) return
              const key = selected._key
              void run(async () => {
                await deleteEdgeDesign(client, key)
                setChosen('')
                await reload()
                return `Deleted “${selected.name}”. Sections that used it keep their own copy.`
              })
            }}
          />
        </Flex>
      </Stack>
      {selected && renaming !== null && (
        <Stack gap={2} data-edge-control="rename">
          <label htmlFor={`${id}-rename`} style={{ fontSize: 13, fontWeight: 500 }}>
            New name for “{selected.name}”
          </label>
          <Flex gap={2} wrap="wrap">
            <div style={{ flex: 1, minWidth: 180 }}>
              <TextInput
                id={`${id}-rename`}
                value={renaming}
                disabled={busy}
                onChange={(event) => {
                  setRenaming(event.currentTarget.value)
                }}
              />
            </div>
            <Button
              type="button"
              mode="ghost"
              fontSize={1}
              padding={2}
              text="Save new name"
              disabled={busy || !renaming.trim()}
              onClick={() => {
                const key = selected._key
                void run(async () => {
                  const next = await renameEdgeDesign(client, key, renaming)
                  setRenaming(null)
                  await reload()
                  return `Renamed to “${next}”. Sections that used it are unchanged.`
                })
              }}
            />
            <Button
              type="button"
              mode="bleed"
              fontSize={1}
              padding={2}
              text="Cancel"
              onClick={() => {
                setRenaming(null)
              }}
            />
          </Flex>
        </Stack>
      )}
      <Stack gap={2}>
        <label htmlFor={`${id}-name`} style={{ fontSize: 13, fontWeight: 500 }}>
          Save this edge as a new design
        </label>
        <Flex gap={2} wrap="wrap">
          <div style={{ flex: 1, minWidth: 180 }}>
            <TextInput
              id={`${id}-name`}
              value={name}
              placeholder="For example Sunrise ridge"
              disabled={readOnly === true || busy}
              onChange={(event) => {
                setName(event.currentTarget.value)
              }}
            />
          </div>
          <Button
            type="button"
            mode="ghost"
            fontSize={1}
            padding={2}
            text="Save copy as design"
            disabled={readOnly === true || busy || problems > 0 || !name.trim()}
            onClick={() => {
              void run(async () => {
                const saved = await saveEdgeDesign(client, name, value)
                setName('')
                await reload()
                setChosen(saved._key)
                return `Saved “${saved.name}” in Brand colours as a draft. Publish Brand colours to keep it for everyone.`
              })
            }}
          />
        </Flex>
      </Stack>
      <div role="status" aria-live="polite" style={{ fontSize: 13, minHeight: 18 }}>
        {status && (
          <span
            style={{
              color:
                status.tone === 'error'
                  ? 'var(--card-badge-critical-fg-color, #b00020)'
                  : undefined,
            }}
          >
            {status.text}
          </span>
        )}
      </div>
    </Stack>
  )
}
