import type { SchemaTypeDefinition } from 'sanity'

import { cta } from './cta'
import { link } from './link'
import { seo } from './seo'

/** Reusable object types any feature's schema can reference by name. */
export const sharedSchemaTypes: SchemaTypeDefinition[] = [link, cta, seo]
