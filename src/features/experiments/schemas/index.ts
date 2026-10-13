import type { SchemaTypeDefinition } from 'sanity'

import { experiment } from './experiment'
// new-schema:import

export const experimentSchemaTypes: SchemaTypeDefinition[] = [
  experiment,
  // new-schema:register
]
