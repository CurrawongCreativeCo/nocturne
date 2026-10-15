import { AddIcon } from '@sanity/icons/Add'
import { ArrowDownIcon } from '@sanity/icons/ArrowDown'
import { ArrowUpIcon } from '@sanity/icons/ArrowUp'
import { DragHandleIcon } from '@sanity/icons/DragHandle'
import { Badge, Box, Button, Card, Flex, Spinner, Stack, Text } from '@sanity/ui'
import { useToast } from '@sanity/ui/toast'
import { useEffect, useRef, useState } from 'react'
import { useClient, useDocumentStore } from 'sanity'
import { IntentLink, useRouter } from 'sanity/router'

import { apiVersion } from '@/config/env'

import { moveItem, orderWrites, toRows, type TeamDoc, type TeamRow } from './team-order'

const QUERY = `*[_type == "teamMember"]{ _id, name, role, order }`
const LIST_STYLE = { listStyle: 'none', margin: 0, padding: 0 } as const

/**
 * The desk's Team list: members in the order the website shows them, which editors change by
 * dragging a row (or with the Move up / Move down buttons, for keyboard and touch). Each move
 * numbers everyone 1, 2, 3… in the `order` field and writes only the members whose number changed
 * (`team-order.ts`). Live: it listens to the dataset, so a change by someone else shows up too.
 */
export function TeamOrderPane() {
  const documentStore = useDocumentStore()
  const client = useClient({ apiVersion })
  const router = useRouter()
  const toast = useToast()
  const [rows, setRows] = useState<TeamRow[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const moveButtons = useRef(new Map<string, HTMLButtonElement>())
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    const subscription = documentStore.listenQuery(QUERY, {}, {}).subscribe({
      next: (docs: TeamDoc[] | null) => {
        setRows(toRows(docs ?? []))
      },
      error: () => {
        setRows([])
        setLoadFailed(true)
      },
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [documentStore])

  const move = async (from: number, to: number, label: string) => {
    if (!rows || saving || from === to) return
    const next = moveItem(rows, from, to)
    const writes = orderWrites(next)
    setRows(next)
    if (writes.length === 0) return
    setSaving(true)
    try {
      const transaction = client.transaction()
      for (const { ids, order } of writes) {
        for (const id of ids) transaction.patch(id, { set: { order } })
      }
      await transaction.commit()
      setStatus(`${label} is now number ${to + 1} of ${next.length}`)
    } catch {
      setRows(rows)
      toast.push({
        status: 'error',
        title: 'The new order was not saved',
        description: 'Check you can edit team members, then try again.',
      })
    } finally {
      setSaving(false)
      // The list re-renders in the new order; keep the keyboard user on the button they pressed.
      const id = next[to]?.id
      if (id) moveButtons.current.get(`${id}:${to > from ? 'down' : 'up'}`)?.focus()
    }
  }

  return (
    <Box padding={4}>
      <Stack gap={4}>
        <Flex align="center" justify="space-between" gap={3} wrap="wrap">
          <Text muted size={1}>
            Drag a row, or use the arrows, to change the order the website shows.
          </Text>
          <Button
            icon={AddIcon}
            text="New team member"
            tone="primary"
            fontSize={1}
            onClick={() => {
              router.navigateIntent('create', { type: 'teamMember' })
            }}
          />
        </Flex>

        {rows === null && (
          <Flex align="center" gap={3} role="status">
            <Spinner muted />
            <Text muted size={1}>
              Loading the team…
            </Text>
          </Flex>
        )}
        {loadFailed && (
          <Card padding={4} radius={2} border tone="critical">
            <Text size={1}>The team list could not be loaded. Reload the Studio to try again.</Text>
          </Card>
        )}
        {rows?.length === 0 && !loadFailed && (
          <Card padding={4} radius={2} border tone="transparent">
            <Text size={1}>No team members yet. Add the first one with the button above.</Text>
          </Card>
        )}

        {rows && rows.length > 0 && (
          <ol style={LIST_STYLE} aria-label="Team members, in website order">
            {rows.map((row, index) => (
              // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- dragging is the pointer shortcut; the Move up / Move down buttons are the keyboard and touch way
              <li
                key={row.id}
                draggable={!saving}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move'
                  setDragging(index)
                }}
                onDragOver={(event) => {
                  if (dragging === null) return
                  event.preventDefault()
                  setOver(index)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  if (dragging !== null) void move(dragging, index, rows[dragging]?.name ?? '')
                  setDragging(null)
                  setOver(null)
                }}
                onDragEnd={() => {
                  setDragging(null)
                  setOver(null)
                }}
                style={{ marginBottom: '0.5rem' }}
              >
                <Card
                  padding={3}
                  radius={2}
                  border
                  tone={over === index && dragging !== index ? 'primary' : 'default'}
                  style={{
                    opacity: dragging === index ? 0.5 : 1,
                    cursor: saving ? 'wait' : 'grab',
                  }}
                >
                  <Flex align="center" gap={3}>
                    <Text muted aria-hidden>
                      <DragHandleIcon />
                    </Text>
                    <Box flex={1}>
                      <Stack gap={2}>
                        <Flex align="center" gap={2} wrap="wrap">
                          <Text size={1} weight="medium">
                            <IntentLink
                              intent="edit"
                              params={{ id: row.id, type: 'teamMember' }}
                              draggable={false}
                            >
                              {row.name}
                            </IntentLink>
                          </Text>
                          {!row.hasPublished && (
                            <Badge tone="caution" fontSize={0}>
                              Not published
                            </Badge>
                          )}
                        </Flex>
                        {row.role && (
                          <Text muted size={1}>
                            {row.role}
                          </Text>
                        )}
                      </Stack>
                    </Box>
                    <Text muted size={1}>
                      {index + 1}
                    </Text>
                    <Flex gap={1}>
                      <Button
                        ref={(node) => {
                          if (node) moveButtons.current.set(`${row.id}:up`, node)
                          else moveButtons.current.delete(`${row.id}:up`)
                        }}
                        icon={ArrowUpIcon}
                        mode="bleed"
                        fontSize={1}
                        aria-label={`Move ${row.name} up`}
                        disabled={saving || index === 0}
                        onClick={() => void move(index, index - 1, row.name)}
                      />
                      <Button
                        ref={(node) => {
                          if (node) moveButtons.current.set(`${row.id}:down`, node)
                          else moveButtons.current.delete(`${row.id}:down`)
                        }}
                        icon={ArrowDownIcon}
                        mode="bleed"
                        fontSize={1}
                        aria-label={`Move ${row.name} down`}
                        disabled={saving || index === rows.length - 1}
                        onClick={() => void move(index, index + 1, row.name)}
                      />
                    </Flex>
                  </Flex>
                </Card>
              </li>
            ))}
          </ol>
        )}
        <Text muted size={1} role="status" aria-live="polite">
          {status}
        </Text>
      </Stack>
    </Box>
  )
}
