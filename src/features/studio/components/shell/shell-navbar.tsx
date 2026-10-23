import { Badge, Button, Card, Flex, useMediaIndex } from '@sanity/ui'
import { type NavbarProps, useCurrentUser } from 'sanity'
import { StateLink } from 'sanity/router'

import { isAgency, readClientViewPreview, writeClientViewPreview } from '../../roles'
import { RoleNavbar } from '../role-navbar'
import { StudioLogo } from '../studio-logo'

/** SPIKE (task 174): the brand zone lines up with the expanded rail (VD-009: ~210 px wordmark zone, 224–248 px rail). */
export const SHELL_ZONE_WIDTH = 232
/** Sanity UI's third breakpoint: from here Studio puts the tools in the top bar, and the shell shows its rail. */
export const SHELL_WIDE_INDEX = 3

/** The wordmark (or the client's logo) as the Studio's home link, in a fixed-width zone. */
function BrandZone() {
  return (
    <Card borderBottom borderRight flex="none" style={{ width: SHELL_ZONE_WIDTH }}>
      {/* Lined up with Sanity's top row (12 px padding around 25 px controls), not the whole bar:
          the Version and Variant row below it is part of the default navbar too. */}
      <Flex align="center" paddingX={3} paddingY={2}>
        <Button
          as={StateLink}
          // Studio's root: it opens the default tool, as Sanity's own home button does.
          state={{}}
          mode="bleed"
          padding={1}
          aria-label="Studio home"
        >
          <StudioLogo />
        </Button>
      </Flex>
    </Card>
  )
}

/** The agency strip's badge and switch, inline at the end of the top bar. */
function AgencyControls() {
  const previewing = readClientViewPreview()
  const toggle = () => {
    writeClientViewPreview(!previewing)
    window.location.reload()
  }
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
          onClick={toggle}
        />
      </Flex>
    </Card>
  )
}

/**
 * SPIKE (task 174): one top bar — brand zone, Sanity's own navbar, then the agency controls — from
 * 900 px. Narrower screens keep today's RoleNavbar (strip above Sanity's navbar), with no brand
 * zone: the bar has no room for it there.
 */
export function ShellNavbar(props: NavbarProps) {
  const user = useCurrentUser()
  const wide = useMediaIndex() >= SHELL_WIDE_INDEX
  if (!wide) return <RoleNavbar {...props} />

  return (
    <Flex align="stretch">
      <BrandZone />
      <Flex direction="column" flex={1} style={{ minWidth: 0 }}>
        {props.renderDefault(props)}
      </Flex>
      {isAgency(user) && <AgencyControls />}
    </Flex>
  )
}
