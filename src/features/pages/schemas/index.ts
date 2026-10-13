import type { SchemaTypeDefinition } from 'sanity'

import { page } from './page'
import { redirect } from './redirect'
import { sectionTypes } from './sections'
import { sharedSection } from './shared-section'

export const pageSchemaTypes: SchemaTypeDefinition[] = [
  page,
  sharedSection,
  redirect,
  ...sectionTypes,
]
