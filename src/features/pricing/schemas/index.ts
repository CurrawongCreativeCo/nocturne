import type { SchemaTypeDefinition } from 'sanity'

import { stripePrice } from './stripe-price'

export const pricingSchemaTypes: SchemaTypeDefinition[] = [stripePrice]
