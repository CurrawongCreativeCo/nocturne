import { defineQuery } from 'next-sanity'

/**
 * The running experiment, if any. Only one can run at a time (Studio enforces it); if two are
 * somehow active, the oldest wins.
 */
export const ACTIVE_EXPERIMENT_QUERY = defineQuery(/* groq */ `
  *[_type == "experiment" && active == true] | order(_createdAt asc)[0] {
    _id,
    name,
    "controlWeight": coalesce(controlWeight, 0),
    "variants": coalesce(variants[defined(variantId)] { "id": variantId, "weight": coalesce(weight, 0) }, [])
  }
`)
