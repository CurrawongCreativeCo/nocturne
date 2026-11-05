import { Box, Button, Card, Flex, Stack, Text } from '@sanity/ui'
import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'

import type { BreadcrumbSegment } from '../utils/page-breadcrumb'

export type BreadcrumbLink = ComponentType<{ id: string; children: ReactNode }>

/** Below this width the middle segments fold into one button. */
const NARROW_PX = 380
const COLLAPSE_FROM = 3

const Separator = () => (
  <Text size={1} muted aria-hidden="true">
    ›
  </Text>
)

/**
 * "Pages › services › web-design" above a page's fields. Each ancestor with a page is a link; the
 * current page is last with aria-current. In a narrow pane the middle segments sit behind a
 * disclosure button (a plain toggle, so every ancestor stays reachable by keyboard and touch).
 */
export function PageBreadcrumb({
  segments,
  Link,
}: {
  segments: readonly BreadcrumbSegment[]
  Link: BreadcrumbLink
}) {
  const nav = useRef<HTMLElement>(null)
  const listId = useId()
  const [narrow, setNarrow] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const element = nav.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setNarrow(entry.contentRect.width < NARROW_PX)
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [])

  const collapse = narrow && segments.length >= COLLAPSE_FROM
  const hidden = collapse ? segments.slice(0, -1) : []
  const shown = collapse ? segments.slice(-1) : segments

  const render = (segment: BreadcrumbSegment) =>
    segment.current ? (
      <Text size={1} weight="medium" aria-current="page">
        {segment.label}
      </Text>
    ) : segment.id ? (
      <Text size={1}>
        <Link id={segment.id}>{segment.label}</Link>
      </Text>
    ) : (
      <Text size={1} muted>
        {segment.label}
      </Text>
    )

  return (
    <Card as="nav" ref={nav} aria-label="Page location" data-page-breadcrumb="" paddingBottom={4}>
      <Stack gap={2}>
        <Flex
          as="ol"
          align="center"
          gap={2}
          wrap="wrap"
          style={{ listStyle: 'none', margin: 0, padding: 0 }}
        >
          <Box as="li">
            <Text size={1} muted>
              Pages
            </Text>
          </Box>
          {collapse && (
            <Box as="li">
              <Flex align="center" gap={2}>
                <Separator />
                <Button
                  mode="bleed"
                  padding={1}
                  fontSize={1}
                  text="…"
                  aria-label="Show the pages above this one"
                  aria-expanded={open}
                  aria-controls={open ? listId : undefined}
                  onClick={() => {
                    setOpen((value) => !value)
                  }}
                />
              </Flex>
            </Box>
          )}
          {shown.map((segment) => (
            <Fragment key={segment.label + String(segment.current)}>
              <Box as="li">
                <Flex align="center" gap={2}>
                  <Separator />
                  {render(segment)}
                </Flex>
              </Box>
            </Fragment>
          ))}
        </Flex>
        {collapse && open && (
          <Card id={listId} padding={3} radius={2} border>
            <Stack as="ul" gap={3} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {hidden.map((segment) => (
                <li key={segment.label}>{render(segment)}</li>
              ))}
            </Stack>
          </Card>
        )}
      </Stack>
    </Card>
  )
}
