import type { SchemaTypeDefinition } from 'sanity'

import { navItem } from './nav-item'
import { settings } from './settings'
// new-schema:import

export const siteSchemaTypes: SchemaTypeDefinition[] = [
  settings,
  navItem,
  // new-schema:register
]
