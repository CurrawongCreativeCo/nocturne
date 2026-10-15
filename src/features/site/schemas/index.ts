import type { SchemaTypeDefinition } from 'sanity'

import { announcement } from './announcement'
import { cookieBanner } from './cookie-banner'
import { designSettings } from './design-settings'
import { navItem } from './nav-item'
import { siteIdentity } from './site-identity'
import { siteNavigation } from './site-navigation'
// new-schema:import

export const siteSchemaTypes: SchemaTypeDefinition[] = [
  navItem,
  siteIdentity,
  siteNavigation,
  announcement,
  cookieBanner,
  designSettings,
  // new-schema:register
]
