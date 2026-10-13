import type { SchemaTypeDefinition } from 'sanity'

import { author } from './author'
import { category } from './category'
import { post } from './post'
// new-schema:import

export const blogSchemaTypes: SchemaTypeDefinition[] = [
  post,
  author,
  category,
  // new-schema:register
]
