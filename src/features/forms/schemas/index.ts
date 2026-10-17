import type { SchemaTypeDefinition } from 'sanity'

import { enquiry } from './enquiry'
import { form } from './form'
// new-schema:import

export const formSchemaTypes: SchemaTypeDefinition[] = [
  form,
  enquiry,
  // new-schema:register
]
