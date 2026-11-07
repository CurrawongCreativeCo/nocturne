import type { CapabilityId, TaskNumber } from './capabilities'

/**
 * Reviewed exceptions (task 275, approved by the owner on 6 November 2026): fields in a component's
 * Design group that no shared builder made (README, "Design capability contract"). The checks refuse
 * any other such field. An exception records how a field was built; it is never evidence that a
 * capability works, which only a passing evidence case shows (capability-evidence.ts).
 *
 * Each row names exact fields, as manifest paths. A row covers those fields and their own subfields,
 * nothing else: a new field needs a shared builder or a new, reviewed row.
 */
export interface CapabilityException {
  component: string
  fields: readonly string[]
  justification: string
  reviewer: string
  /** When the reviewer approved it (YYYY-MM-DD). */
  reviewed: string
  status: 'permanent' | 'temporary'
  /** The task that removes it. Required while temporary. */
  removalTask?: TaskNumber
  /**
   * What the field is. A query or content-source setting is never a design capability: it carries no
   * capability marker and never appears among a component's capabilities.
   */
  nature: 'design' | 'layout' | 'legacy' | 'query' | 'contentSource'
  /** The capability marker each listed field carries until a shared builder replaces it. */
  marked?: Readonly<Partial<Record<string, CapabilityId>>>
}

const OWNER = 'owner'
const APPROVED = '2026-11-06'

export const CAPABILITY_EXCEPTIONS: readonly CapabilityException[] = [
  {
    component: 'hero',
    fields: ['eyebrowDesign'],
    justification:
      'Separator and colours for the eyebrow label list. Colour and type overlap the eyebrow text role.',
    reviewer: OWNER,
    reviewed: APPROVED,
    status: 'temporary',
    removalTask: 213,
    nature: 'design',
  },
  {
    component: 'hero',
    fields: ['proportion'],
    justification:
      'How Split shares the width between text and picture. A layout choice no capability covers.',
    reviewer: OWNER,
    reviewed: APPROVED,
    status: 'permanent',
    nature: 'layout',
  },
  {
    component: 'hero',
    fields: ['imageShape'],
    justification:
      'Hidden and superseded by Image design, kept so stored choices still draw. Removing it needs a dry-run migration.',
    reviewer: OWNER,
    reviewed: APPROVED,
    status: 'temporary',
    removalTask: 213,
    nature: 'legacy',
  },
  {
    component: 'logoCloud',
    fields: ['logoColour'],
    justification: 'How logos are tinted. Specific to logos, and no capability covers it.',
    reviewer: OWNER,
    reviewed: APPROVED,
    status: 'permanent',
    nature: 'design',
  },
  {
    component: 'gallery',
    fields: ['columns'],
    justification: 'Pictures across on a wide screen. A layout count.',
    reviewer: OWNER,
    reviewed: APPROVED,
    status: 'permanent',
    nature: 'layout',
  },
  {
    component: 'location',
    fields: ['interactiveMap'],
    justification:
      'Switches the click-to-load map on: a content-source setting that sits in Advanced. The source needs its own evidence.',
    reviewer: OWNER,
    reviewed: APPROVED,
    status: 'permanent',
    nature: 'contentSource',
  },
  {
    component: 'embed',
    fields: ['customHeight'],
    justification: 'The exact height of a third-party frame, under Advanced.',
    reviewer: OWNER,
    reviewed: APPROVED,
    status: 'permanent',
    nature: 'layout',
  },
  {
    component: 'events',
    fields: ['category'],
    justification: 'A query filter that sits in Advanced. Not a look.',
    reviewer: OWNER,
    reviewed: APPROVED,
    status: 'permanent',
    nature: 'query',
  },
  {
    component: 'events',
    fields: ['count'],
    justification: 'A query limit that sits in Advanced. Not a look.',
    reviewer: OWNER,
    reviewed: APPROVED,
    status: 'permanent',
    nature: 'query',
  },
  {
    component: 'linkList',
    fields: ['profileDesign'],
    justification:
      'Picture size, shape, ring and frame, and the name and bio colours, written before the shared parts existed.',
    reviewer: OWNER,
    reviewed: APPROVED,
    status: 'temporary',
    // Proposed task 281 (Legacy Link list design migration, preserving stored data): provisional until
    // the canonical plan publishes it. No stored data is migrated before then.
    removalTask: 281,
    nature: 'design',
  },
  {
    component: 'linkList',
    fields: ['categoryDesign'],
    justification:
      'Inline list styling: its type overlaps the text roles. The separator and phone layout may stay.',
    reviewer: OWNER,
    reviewed: APPROVED,
    status: 'temporary',
    removalTask: 281,
    nature: 'design',
  },
  {
    component: 'linkList',
    fields: ['socialDesign'],
    justification: 'The social icon container and colour, overlapping the icon capability.',
    reviewer: OWNER,
    reviewed: APPROVED,
    status: 'temporary',
    removalTask: 158,
    nature: 'design',
  },
  {
    component: 'linkList',
    fields: [
      'depthDesign.linkShadow',
      'depthDesign.socialShadow',
      'depthDesign.pictureShadow',
      'depthDesign.glow',
      'depthDesign.glowTargets',
      'depthDesign.glowColour',
      'links[].design.shadow',
    ],
    justification:
      'Written inline, because depthFields does not exist yet. They carry the depth (and picture depth) marker.',
    reviewer: OWNER,
    reviewed: APPROVED,
    status: 'temporary',
    removalTask: 146,
    nature: 'design',
    marked: {
      'depthDesign.linkShadow': 'depth',
      'depthDesign.socialShadow': 'depth',
      'depthDesign.pictureShadow': 'pictureDepth',
      'depthDesign.glow': 'depth',
      'depthDesign.glowTargets': 'depth',
      'depthDesign.glowColour': 'depth',
      'links[].design.shadow': 'depth',
    },
  },
  {
    component: 'linkList',
    fields: [
      'linkDesign.arrowStyle',
      'linkDesign.arrowColour',
      'links[].design.arrowStyle',
      'links[].design.arrowColour',
    ],
    justification:
      'Written inline, because actionFields does not exist yet. They carry the action indicator marker.',
    reviewer: OWNER,
    reviewed: APPROVED,
    status: 'temporary',
    removalTask: 137,
    nature: 'design',
    marked: {
      'linkDesign.arrowStyle': 'action',
      'linkDesign.arrowColour': 'action',
      'links[].design.arrowStyle': 'action',
      'links[].design.arrowColour': 'action',
    },
  },
  {
    component: 'hero',
    fields: ['partMotion'],
    justification:
      'One animation per hero part (task 85), specific to the hero. It carries the motion marker.',
    reviewer: OWNER,
    reviewed: APPROVED,
    status: 'permanent',
    nature: 'design',
    marked: { partMotion: 'motion' },
  },
]
