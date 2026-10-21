import type { assist } from '@sanity/assist'

import { siteProfile } from '@/config/profile'

type Presets = NonNullable<Exclude<Parameters<typeof assist>[0], void>['__presets']>
type PresetField = NonNullable<Presets[string]['fields']>[number]
type Instruction = NonNullable<PresetField['instructions']>[number]

const voice = [
  'Always write in Australian English (en-AU), using Australian spelling such as organise and colour.',
  `Our voice: ${siteProfile.voice.summary}`,
  ...siteProfile.voice.do.map((instruction) => `Do: ${instruction}`),
  ...siteProfile.voice.dont.map((instruction) => `Don't: ${instruction}`),
].join('\n')

function instruction(
  key: string,
  title: string,
  task: string,
  context: { label: string; path: string }[],
): Instruction {
  return {
    _key: key,
    title,
    prompt: [
      {
        _type: 'block',
        _key: `${key}-prompt`,
        style: 'normal',
        markDefs: [],
        children: [
          { _type: 'span', _key: 'task', text: `${task}\n${voice}\n`, marks: [] },
          ...context.flatMap(({ label, path }, index) => [
            { _type: 'span' as const, _key: `label-${index}`, text: `${label}: `, marks: [] },
            { _type: 'sanity.assist.instruction.fieldRef' as const, _key: `ref-${index}`, path },
          ]),
        ],
      },
    ],
  }
}

function metaDescription(content: string): PresetField {
  return {
    path: 'seo.metaDescription',
    instructions: [
      {
        ...instruction(
          // A new key installs the voice-aware instruction where the old preset was already saved.
          'summarise-meta-description-voice',
          'Write meta description',
          'Summarise this document in one sentence under 155 characters for search results (the field warns above 160 characters). Use only facts in the supplied content.',
          [
            { label: 'Title', path: 'title' },
            { label: 'Content', path: content },
          ],
        ),
        icon: 'search',
      },
    ],
  }
}

function improveBody(path: string): PresetField {
  return {
    path,
    instructions: [
      instruction(
        'improve-in-our-voice',
        'Improve this in our voice',
        'Improve the selected body text in our voice. This field has no character limit: keep a similar length and preserve meaning, facts, links, images and Portable Text formatting. Do not add unsupported claims.',
        [{ label: 'Existing text', path }],
      ),
    ],
  }
}

function sectionPresets(array: string): PresetField[] {
  // Assist uses type paths, replacing item keys with schema names and escaping the brackets.
  const hero = `${array}|_key:hero|`
  return [
    ...['heading', 'title'].map((field) => ({
      path: `${hero}.${field}`,
      instructions: [
        instruction(
          'suggest-three-headlines',
          'Suggest three headlines',
          'Suggest three distinct headlines for this hero. Each headline must be at most 80 characters, including spaces. Keep each suggestion separate and preserve the meaning; do not invent claims.',
          [{ label: 'Hero content', path: hero }],
        ),
      ],
    })),
    improveBody(`${array}|_key:richText|.body`),
  ]
}

/** Static instructions only: the plugin keeps its existing plan checks and runs on editor request. */
export const assistPresets: Presets = {
  page: { fields: [metaDescription('sections'), ...sectionPresets('sections')] },
  sharedSection: { fields: sectionPresets('section') },
  post: {
    fields: [
      {
        // The summary is stored as `excerpt`; keep existing content and queries unchanged.
        path: 'excerpt',
        instructions: [
          instruction(
            'write-summary',
            'Write a summary',
            'Write a concise summary of this post, at most 300 characters including spaces. Use only facts in the supplied post.',
            [
              { label: 'Post title', path: 'title' },
              { label: 'Post body', path: 'body' },
            ],
          ),
        ],
      },
      improveBody('body'),
      metaDescription('body'),
    ],
  },
}
