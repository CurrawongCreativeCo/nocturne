import type { SchemaTypeDefinition } from 'sanity'

import { page } from './page'
import { redirect } from './redirect'
import { sectionTypes } from './sections'
import { sharedSection } from './shared-section'
import { slotVideo } from './slot-video'
// new-schema:import

export const pageSchemaTypes: SchemaTypeDefinition[] = [
  page,
  sharedSection,
  redirect,
  ...sectionTypes,
  // Slot blocks (slots/registry.ts): objects that sections offer in their slots.
  slotVideo,
  // new-schema:register
]
