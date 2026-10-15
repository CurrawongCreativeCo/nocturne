import type { SchemaTypeDefinition } from 'sanity'

import { teamMember } from './team-member'
// new-schema:import

export const teamSchemaTypes: SchemaTypeDefinition[] = [
  teamMember,
  // new-schema:register
]
