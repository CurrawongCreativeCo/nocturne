import type { SchemaTypeDefinition } from 'sanity'

import { page } from './page'
import { sectionTypes } from './sections'

export const pageSchemaTypes: SchemaTypeDefinition[] = [page, ...sectionTypes]
