import type { SchemaTypeDefinition } from 'sanity'

import { navItem } from './nav-item'
import { settings } from './settings'

export const siteSchemaTypes: SchemaTypeDefinition[] = [settings, navItem]
