import type { SchemaTypeDefinition } from 'sanity'

import { teamMember } from './team-member'
import { teamPageSettings } from './team-page-settings'
// new-schema:import

export const teamSchemaTypes: SchemaTypeDefinition[] = [
  teamMember,
  teamPageSettings,
  // new-schema:register
]
