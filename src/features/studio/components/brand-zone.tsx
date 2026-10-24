import { Button, Card, Flex } from '@sanity/ui'
import { StateLink } from 'sanity/router'

import { StudioLogo } from './studio-logo'
import { BRAND_ZONE_WIDTH } from '../utils/brand-zone'

/**
 * The Nocturne wordmark (or the client's logo) as the Studio's home link, in a fixed-width zone at
 * the start of the navbar. Sanity 6.19 never renders `studio.components.logo`, so this is the
 * supported way to show it.
 */
export function BrandZone() {
  return (
    <Card borderBottom borderRight flex="none" style={{ width: BRAND_ZONE_WIDTH }}>
      {/* Lined up with Sanity's top row (12px padding around 25px controls), not the whole bar:
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
