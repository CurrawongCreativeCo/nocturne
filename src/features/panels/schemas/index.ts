import type { SchemaTypeDefinition } from 'sanity'

import { panel } from './panel'
import { panelForm } from './panel-form'
import { panelText } from './panel-text'
// new-schema:import

export const panelsSchemaTypes: SchemaTypeDefinition[] = [
  panel,
  panelText,
  panelForm,
  // new-schema:register
]
