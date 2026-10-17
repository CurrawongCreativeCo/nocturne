import type { SchemaTypeDefinition } from 'sanity'

import { event } from './event'
import { eventCategory } from './event-category'
// new-schema:import

export const eventsSchemaTypes: SchemaTypeDefinition[] = [
  event,
  eventCategory,
  // new-schema:register
]
