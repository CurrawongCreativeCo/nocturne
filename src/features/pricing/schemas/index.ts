import type { SchemaTypeDefinition } from 'sanity'

import { stripePrice } from './stripe-price'
// new-schema:import

export const pricingSchemaTypes: SchemaTypeDefinition[] = [
  stripePrice,
  // new-schema:register
]
