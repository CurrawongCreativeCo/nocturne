import { Badge, Button, Card, Flex } from '@sanity/ui'

import { readClientViewPreview, writeClientViewPreview } from '../roles'

/**
 * Flips the stored client-view setting and reloads: the tools, desk structure and document actions
 * are resolved when the Studio loads, so the new view only takes effect after a reload.
 */
export function toggleClientViewPreview(previewing: boolean) {
  writeClientViewPreview(!previewing)
  window.location.reload()
}

/**
 * The agency badge and client-view switch for the end of the navbar, from 900px. Below that
 * `AgencyStrip` carries the same switch above the navbar.
 */
export function AgencyControls() {
  const previewing = readClientViewPreview()
  return (
    <Card borderBottom flex="none" tone={previewing ? 'caution' : 'primary'}>
      <Flex align="center" gap={2} paddingX={3} paddingY={2}>
        <Badge tone={previewing ? 'caution' : 'primary'} fontSize={1}>
          {previewing ? 'Client view' : 'Agency view'}
        </Badge>
        <Button
          mode="bleed"
          fontSize={1}
          padding={2}
          text={previewing ? 'Back to agency' : 'Preview client view'}
          onClick={() => {
            toggleClientViewPreview(previewing)
          }}
        />
      </Flex>
    </Card>
  )
}

/** The thin strip above the navbar for agency staff below 900px, where the bar has no room. */
export function AgencyStrip() {
  const previewing = readClientViewPreview()
  return (
    <Card tone={previewing ? 'caution' : 'primary'} paddingX={3} paddingY={1} borderBottom>
      <Flex align="center" gap={3}>
        <Badge tone={previewing ? 'caution' : 'primary'} fontSize={1}>
          {previewing ? 'Previewing client view' : 'Agency view'}
        </Badge>
        <Button
          mode="bleed"
          fontSize={1}
          padding={2}
          text={previewing ? 'Back to agency view' : 'Preview client view'}
          onClick={() => {
            toggleClientViewPreview(previewing)
          }}
        />
      </Flex>
    </Card>
  )
}
