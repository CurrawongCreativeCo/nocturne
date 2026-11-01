import type { SchemaTypeDefinition } from 'sanity'

import { location } from './location'
// new-schema:import

export const locationsSchemaTypes: SchemaTypeDefinition[] = [
  location,
  // new-schema:register
]
