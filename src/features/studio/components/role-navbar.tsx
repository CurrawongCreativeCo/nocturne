import { Badge, Button, Card, Flex, Stack, useMediaIndex } from '@sanity/ui'
import { type NavbarProps, useCurrentUser } from 'sanity'

import { isAgency, readClientViewPreview, writeClientViewPreview } from '../roles'
import { BrandZone } from './brand-zone'
import { showsBrandZone } from '../utils/brand-zone'

/**
 * The Studio navbar. Agency staff get a thin strip above it with an "Agency view" badge and a
 * switch to preview what clients see; clients get the plain navbar. The tools, desk structure
 * and document actions are resolved when the Studio loads, so the switch reloads the page.
 * From 900px the navbar starts with a brand zone holding the wordmark or the client's logo.
 */
export function RoleNavbar(props: NavbarProps) {
  const user = useCurrentUser()
  const navbar = showsBrandZone(useMediaIndex()) ? (
    <Flex align="stretch">
      <BrandZone />
      <Flex direction="column" flex={1} style={{ minWidth: 0 }}>
        {props.renderDefault(props)}
      </Flex>
    </Flex>
  ) : (
    props.renderDefault(props)
  )
  if (!isAgency(user)) return navbar

  const previewing = readClientViewPreview()
  const toggle = () => {
    writeClientViewPreview(!previewing)
    window.location.reload()
  }

  return (
    <Stack>
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
            onClick={toggle}
          />
        </Flex>
      </Card>
      {navbar}
    </Stack>
  )
}
