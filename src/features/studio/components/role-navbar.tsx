import { Flex, Stack, useMediaIndex } from '@sanity/ui'
import { type NavbarProps, useCurrentUser } from 'sanity'

import { isAgency } from '../roles'
import { AgencyControls, AgencyStrip } from './agency-controls'
import { BrandZone } from './brand-zone'
import { showsBrandZone } from '../utils/brand-zone'

/**
 * The Studio navbar. From 900px it is one row: a brand zone holding the wordmark or the client's
 * logo, Sanity's navbar, then (agency staff only) the "Agency view" badge and a switch to preview
 * what clients see. Below 900px agency staff get a thin strip with the same switch above the plain
 * navbar. Clients never see either. The tools, desk structure and document actions are resolved
 * when the Studio loads, so the switch reloads the page.
 */
export function RoleNavbar(props: NavbarProps) {
  const user = useCurrentUser()
  const wide = showsBrandZone(useMediaIndex())
  const agency = isAgency(user)

  if (!wide) {
    return agency ? (
      <Stack>
        <AgencyStrip />
        {props.renderDefault(props)}
      </Stack>
    ) : (
      props.renderDefault(props)
    )
  }

  return (
    <Flex align="stretch">
      <BrandZone />
      <Flex direction="column" flex={1} style={{ minWidth: 0 }}>
        {props.renderDefault(props)}
      </Flex>
      {agency && <AgencyControls />}
    </Flex>
  )
}
