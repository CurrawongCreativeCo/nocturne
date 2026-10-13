import type { SchemaTypeDefinition } from 'sanity'

import { page } from './page'
import { redirect } from './redirect'
import { sectionTypes } from './sections'
import { sharedSection } from './shared-section'
// new-schema:import

export const pageSchemaTypes: SchemaTypeDefinition[] = [
  page,
  sharedSection,
  redirect,
  ...sectionTypes,
  // new-schema:register
]
