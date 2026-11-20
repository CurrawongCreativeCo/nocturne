import { defineArrayMember, defineField } from 'sanity'

import {
  COMPOSED_EDGE_ALIGNS,
  COMPOSED_EDGE_HEIGHTS,
  COMPOSED_EDGE_INTERPOLATIONS,
  COMPOSED_EDGE_MAX_LAYERS,
  COMPOSED_EDGE_MAX_POINTS,
  COMPOSED_EDGE_MODES,
  COMPOSED_EDGE_PLACEMENTS,
  COMPOSED_EDGE_ROLES,
} from '../composed-edge'

const choice = (name: string, title: string, choices: readonly string[]) =>
  defineField({ name, title, type: 'string', options: { list: [...choices] } })

/** Warnings only: see `composedEdgeField`. The renderer holds each number to its range or falls back. */
const numberField = (name: string, title: string, min: number, max: number) =>
  defineField({
    name,
    title,
    type: 'number',
    validation: (rule) => rule.min(min).max(max).warning(),
  })

const contour = (title: string) =>
  defineField({
    name: 'contour',
    title,
    type: 'object',
    fields: [
      choice('interpolation', 'Interpolation', COMPOSED_EDGE_INTERPOLATIONS),
      defineField({
        name: 'points',
        title: 'Contour points',
        type: 'array',
        of: [
          defineArrayMember({
            name: 'contourPoint',
            type: 'object',
            fields: [
              numberField('x', 'Horizontal position', 0, 100),
              numberField('y', 'Vertical position', 0, 100),
            ],
          }),
        ],
        validation: (rule) => rule.min(2).max(COMPOSED_EDGE_MAX_POINTS).warning(),
      }),
    ],
  })

/** The stored shape of one composition, shared by a section's edge and a saved site design's copy. */
export const composedEdgeFields = [
  numberField('version', 'Version', 1, 1),
  choice('mode', 'Edge mode', COMPOSED_EDGE_MODES),
  choice('height', 'Band height', COMPOSED_EDGE_HEIGHTS),
  numberField('width', 'Artwork width', 5, 100),
  choice('align', 'Artwork alignment', COMPOSED_EDGE_ALIGNS),
  contour('Shared contour'),
  defineField({
    name: 'layers',
    title: 'Paint layers',
    type: 'array',
    of: [
      defineArrayMember({
        name: 'edgePaintLayer',
        type: 'object',
        fields: [
          choice('placement', 'Paint placement', COMPOSED_EDGE_PLACEMENTS),
          contour('Independent contour'),
          numberField('offsetX', 'Horizontal offset', -8, 8),
          numberField('offsetY', 'Vertical offset', -30, 30),
          numberField('opacity', 'Opacity', 0, 100),
          numberField('strokeWidth', 'Stroke width', 1, 6),
          defineField({
            name: 'paint',
            title: 'Paint',
            type: 'object',
            fields: [
              choice('kind', 'Paint type', ['solid', 'gradient']),
              choice('colour', 'Colour', COMPOSED_EDGE_ROLES),
              choice('from', 'Gradient start', COMPOSED_EDGE_ROLES),
              choice('to', 'Gradient end', COMPOSED_EDGE_ROLES),
              defineField({ name: 'fadeEnds', title: 'Fade ends', type: 'boolean' }),
            ],
          }),
        ],
      }),
    ],
    validation: (rule) => rule.max(COMPOSED_EDGE_MAX_LAYERS).warning(),
  }),
  defineField({
    name: 'centre',
    title: 'Decorative centre',
    type: 'object',
    fields: [
      choice('kind', 'Centre type', ['icon', 'image']),
      numberField('gap', 'Opening width', 10, 60),
      defineField({ name: 'icon', title: 'Site icon', type: 'string' }),
      defineField({ name: 'image', title: 'Decorative image', type: 'image' }),
    ],
  }),
  defineField({
    name: 'shadow',
    title: 'Shadow depth',
    type: 'object',
    fields: [
      numberField('blur', 'Shadow blur', 1, 23),
      numberField('distance', 'Shadow distance', 0, 25),
      numberField('opacity', 'Shadow opacity', 0, 65),
    ],
  }),
]

/**
 * The stored composition and, since Task 2, its one editor (features/studio/components/section-edge). Studio
 * shows it in the section's Design tab, which only agency staff see; clients never reach it. Every range check
 * stays a warning: the editor only writes values the page draws, and a hand-edited value the page cannot draw
 * is listed in the editor with its fix and falls back to the saved shape, so nothing here can block publishing.
 */
export const composedEdgeField = defineField({
  name: 'composedEdge',
  title: 'Custom section edge',
  description:
    'Draw the bottom edge yourself with a contour, paint layers, a centre and a shadow. While one is saved here it draws instead of the Bottom edge choice above.',
  type: 'object',
  options: { edgeEditor: true },
  fields: composedEdgeFields,
})
