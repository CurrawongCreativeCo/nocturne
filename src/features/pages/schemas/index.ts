import type { SchemaTypeDefinition } from 'sanity'

import { page } from './page'
import { redirect } from './redirect'
import { sectionTypes } from './sections'

export const pageSchemaTypes: SchemaTypeDefinition[] = [page, redirect, ...sectionTypes]
