import type { SchemaTypeDefinition } from 'sanity'

import { author } from './author'
import { blogSettings } from './blog-settings'
import { category } from './category'
import { post } from './post'
// new-schema:import

export const blogSchemaTypes: SchemaTypeDefinition[] = [
  post,
  author,
  category,
  blogSettings,
  // new-schema:register
]
