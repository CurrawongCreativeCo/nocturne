/* eslint-disable react/no-array-index-key -- the parsed guide is a fixed tree that is never reordered, so position is a stable key */
import { Heading, Stack, Text } from '@sanity/ui'
import type { ReactNode } from 'react'

import { parseMarkdown, type Inline } from '../utils/markdown'

const LIST_STYLE = { margin: 0, paddingLeft: '1.5rem' } as const
const SR_ONLY = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const

function Inlines({ inlines }: { inlines: Inline[] }): ReactNode {
  return inlines.map((inline, index) => {
    switch (inline.kind) {
      case 'text':
        return inline.text
      case 'bold':
        return <strong key={index}>{inline.text}</strong>
      case 'link':
        return (
          <a key={index} href={inline.href} target="_blank" rel="noopener noreferrer">
            {inline.text}
            <span style={SR_ONLY}> (opens in a new tab)</span>
          </a>
        )
    }
  })
}

/**
 * Renders the editor guide's markdown subset (see utils/markdown.ts) as Studio UI. Guide headings
 * start at "##" in the files and sit under the guide's own title, so they render as h4.
 */
export function Markdown({ source }: { source: string }) {
  return (
    <Stack gap={4}>
      {parseMarkdown(source).map((block, index) => {
        switch (block.kind) {
          case 'heading':
            return (
              <Heading key={index} as="h4" size={1}>
                <Inlines inlines={block.inlines} />
              </Heading>
            )
          case 'paragraph':
            return (
              <Text key={index} size={1}>
                <Inlines inlines={block.inlines} />
              </Text>
            )
          case 'list': {
            const List = block.ordered ? 'ol' : 'ul'
            return (
              <List key={index} style={LIST_STYLE}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} style={{ marginBottom: '0.5rem' }}>
                    <Text size={1}>
                      <Inlines inlines={item} />
                    </Text>
                  </li>
                ))}
              </List>
            )
          }
        }
      })}
    </Stack>
  )
}
