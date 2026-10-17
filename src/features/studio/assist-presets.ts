import type { assist } from '@sanity/assist'

type Presets = NonNullable<Exclude<Parameters<typeof assist>[0], void>['__presets']>

/**
 * Preset AI Assist instructions, keyed by document type. They appear in the field's AI Assist menu
 * without anyone having to write the prompt. Fields are referenced by path, so the instruction
 * reads the page title and every section's content.
 */
export const assistPresets: Presets = {
  page: {
    fields: [
      {
        path: 'seo.metaDescription',
        instructions: [
          {
            _key: 'summarize-meta-description',
            title: 'Write meta description',
            icon: 'search',
            prompt: [
              {
                _type: 'block',
                _key: 'summarize-meta-description-prompt',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 's1',
                    text: 'Summarise this page in one sentence under 155 characters for search results. Page title: ',
                    marks: [],
                  },
                  { _type: 'sanity.assist.instruction.fieldRef', _key: 'title-ref', path: 'title' },
                  { _type: 'span', _key: 's2', text: '. Page content: ', marks: [] },
                  {
                    _type: 'sanity.assist.instruction.fieldRef',
                    _key: 'sections-ref',
                    path: 'sections',
                  },
                  { _type: 'span', _key: 's3', text: '.', marks: [] },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
}
