import type { SchemaTypeDefinition } from 'sanity'

import { service } from './service'
// new-schema:import

export const servicesSchemaTypes: SchemaTypeDefinition[] = [
  service,
  // new-schema:register
]
