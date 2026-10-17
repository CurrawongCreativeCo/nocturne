import type { Template } from 'sanity'

/**
 * "New document" templates: pages that start with sections already in place, so
 * editors replace placeholder copy instead of building from an empty page.
 * Templates are functions so every new page gets fresh array `_key`s.
 */
export const pageTemplates: Template[] = [
  {
    id: 'page-landing',
    title: 'Landing page',
    schemaType: 'page',
    value: () => ({
      pageBuilder: [
        section('hero', {
          title: 'A clear headline about what you offer',
          description: 'One or two sentences that explain who this is for and why it matters.',
        }),
        section('featuresGrid', {
          title: 'Why choose us',
          columns: 3,
          items: [1, 2, 3].map((n) => ({
            _key: key(),
            _type: 'featureItem',
            title: `Benefit ${n}`,
            text: 'Describe the benefit in a sentence or two.',
          })),
        }),
        section('testimonials', {
          title: 'What our customers say',
          items: [
            {
              _key: key(),
              _type: 'testimonial',
              quote: 'A short, specific quote from a happy customer.',
              name: 'Customer name',
              role: 'Role, Company',
            },
          ],
        }),
        section('ctaBanner', {
          title: 'Ready to get started?',
          text: 'Tell visitors what to do next.',
          tone: 'brand',
        }),
      ],
    }),
  },
  {
    id: 'page-content',
    title: 'Content page',
    schemaType: 'page',
    value: () => ({
      pageBuilder: [
        section('hero', { title: 'Page title' }),
        section('richText', { body: [paragraph('Start writing here.')] }),
      ],
    }),
  },
  {
    id: 'page-links',
    title: 'Link page',
    schemaType: 'page',
    // A link-in-bio page: no header or footer, a profile, social icons and a list of links. The
    // links have no address yet, so each one blocks publishing until it is filled in.
    value: () => ({
      title: 'Links',
      slug: { _type: 'slug', current: 'links' },
      minimalLayout: true,
      pageBuilder: [
        section('linkList', {
          variant: 'stacked',
          thumbnailSize: 'standard',
          style: { _type: 'sectionStyle', align: 'center' },
          profile: {
            name: 'Your name or business',
            bio: 'One short line about who you are and what you do.',
          },
          socialSource: 'business',
          links: ['Book a consultation', 'Visit our website', 'Follow us on Instagram'].map(
            (label, index) => ({
              _key: key(),
              _type: 'linkItem',
              label,
              link: { _type: 'link', linkType: 'external', openInNewTab: false },
              visibility: 'show',
              featured: index === 0,
            }),
          ),
        }),
        section('richText', {
          body: [paragraph('A footer note, such as © Your business name.')],
        }),
      ],
    }),
  },
]

function section(type: string, fields: Record<string, unknown>) {
  return { _key: key(), _type: type, ...fields }
}

function paragraph(text: string) {
  return {
    _key: key(),
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{ _key: key(), _type: 'span', text, marks: [] }],
  }
}

function key() {
  return Math.random().toString(36).slice(2, 12)
}
