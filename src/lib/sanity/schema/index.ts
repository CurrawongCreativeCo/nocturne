import type { SchemaTypeDefinition } from 'sanity'

import { badgeRow } from './badge-row'
import { blockContent } from './block-content'
import { cta } from './cta'
import { headingText } from './heading-text'
import { imageDesign } from './image-design'
import { launchDate } from './launch-date'
import { link } from './link'
import { logoRow } from './logo-row'
import { sectionStyle } from './section-style'
import { seo } from './seo'
import { statItem, statsBar } from './stats'

/** Reusable object types any feature's schema can reference by name. */
export const sharedSchemaTypes: SchemaTypeDefinition[] = [
  link,
  cta,
  seo,
  blockContent,
  headingText,
  sectionStyle,
  statItem,
  statsBar,
  badgeRow,
  logoRow,
  launchDate,
  imageDesign,
]
