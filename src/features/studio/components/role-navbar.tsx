import { Badge, Button, Card, Flex, Stack } from '@sanity/ui'
import { type NavbarProps, useCurrentUser } from 'sanity'

import { isAgency, readClientViewPreview, writeClientViewPreview } from '../roles'

/**
 * The Studio navbar. Agency staff get a thin strip above it with an "Agency view" badge and a
 * switch to preview what clients see; clients get the plain navbar. The tools, desk structure
 * and document actions are resolved when the Studio loads, so the switch reloads the page.
 */
export function RoleNavbar(props: NavbarProps) {
  const user = useCurrentUser()
  if (!isAgency(user)) return props.renderDefault(props)

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
      {props.renderDefault(props)}
    </Stack>
  )
}
