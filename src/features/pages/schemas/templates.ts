import { createElement } from 'react'
import type { Template } from 'sanity'

import { PRELAUNCH_LOOKS, applyPrelaunchLook, type TemplateSection } from '../utils/prelaunch-looks'

/** Templates only the agency may start from: clients never see them in the New document menu. */
export const AGENCY_ONLY_TEMPLATE_IDS: ReadonlySet<string> = new Set([
  'page-coming-soon',
  'page-under-construction',
  // The looks are design choices, so they are the agency's (see `prelaunchLookTemplates`).
  ...PRELAUNCH_LOOKS.flatMap(({ value }) => [
    `page-links-coming-soon--${value}`,
    `page-coming-soon--${value}`,
  ]),
])

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
  {
    id: 'page-links-coming-soon',
    title: 'Link page + coming soon',
    schemaType: 'page',
    // The permanent /links page with a "new website on its way" note: remove the note at launch. It
    // stays indexed, because /links is a page people keep. Every link blocks publishing until it has
    // an address.
    value: () => ({
      title: 'Links',
      slug: { _type: 'slug', current: 'links' },
      minimalLayout: true,
      pageBuilder: [
        section('richText', {
          style: { _type: 'sectionStyle', align: 'center', spacing: 'compact' },
          body: [paragraph('Our new website is on its way. Until then, everything is here.')],
        }),
        section('linkList', {
          variant: 'stacked',
          thumbnailSize: 'standard',
          style: { _type: 'sectionStyle', align: 'center', spacing: 'compact' },
          profile: {
            name: 'Replace: Your name or business',
            bio: 'Replace: One short line about who you are and what you do.',
          },
          socialSource: 'business',
          links: ['Book now', 'Replace: Second link', 'Replace: Third link'].map(linkItem),
        }),
        section('newsletterSignup', {
          title: 'Be the first to know',
          text: 'Get one email when the new website launches.',
          submitLabel: 'Subscribe',
          successMessage: 'Thanks! Check your inbox for a message from us.',
          style: { _type: 'sectionStyle', align: 'center', spacing: 'compact' },
        }),
        section('richText', {
          body: [paragraph('Replace: © Your business name.')],
        }),
      ],
    }),
  },
  {
    id: 'page-coming-soon',
    title: 'Coming soon',
    schemaType: 'page',
    // Agency only. Hidden from search engines until the site launches; delete the page (or the
    // redirect in front of it) at launch.
    value: () => ({
      title: 'Coming soon',
      slug: { _type: 'slug', current: 'coming-soon' },
      minimalLayout: true,
      seo: { _type: 'seo', noIndex: true },
      pageBuilder: [
        // The "Centred text, no image" hero preset, filling the screen.
        section('hero', {
          variant: 'overlay',
          title: 'Something new is on its way',
          description: 'Replace: Opening [date]',
          style: { _type: 'sectionStyle', tone: 'surface', fillScreen: true },
        }),
        section('newsletterSignup', {
          title: 'Be the first to know',
          text: 'Get one email when we open.',
          submitLabel: 'Subscribe',
          successMessage: 'Thanks! Check your inbox for a message from us.',
          style: { _type: 'sectionStyle', align: 'center', spacing: 'compact' },
        }),
        // The Compact preset, centred: social icons from Business info, no links of its own.
        section('linkList', {
          variant: 'compact',
          thumbnailSize: 'standard',
          style: { _type: 'sectionStyle', align: 'center', spacing: 'compact' },
          socialSource: 'business',
          links: [],
        }),
      ],
    }),
  },
  {
    id: 'page-under-construction',
    title: 'Under construction',
    schemaType: 'page',
    // Agency only. Contact details come from Business info (the Location section, no map), so they
    // are typed once and stay in step with the footer; a rich-text block would duplicate them.
    value: () => ({
      title: 'Under construction',
      slug: { _type: 'slug', current: 'under-construction' },
      minimalLayout: true,
      seo: { _type: 'seo', noIndex: true },
      pageBuilder: [
        section('hero', {
          variant: 'overlay',
          title: 'We’re updating our website',
          description:
            'Replace: A line or two on what is changing and when it will be back. In the meantime, get in touch below.',
          style: { _type: 'sectionStyle', tone: 'surface' },
        }),
        section('location', {
          title: 'Contact us',
          showHours: true,
          showOpenNow: true,
          showContact: true,
          directionsLabel: 'Get directions',
        }),
        // No form chosen: the section blocks publishing until one is.
        section('formSection', {
          title: 'Send us a message',
          text: 'We’ll reply as soon as we can.',
        }),
      ],
    }),
  },
]

/** The pre-launch templates that offer looks: the Link page's combined default, and Coming soon. */
const LOOK_BASES = ['page-links-coming-soon', 'page-coming-soon']

/**
 * Each look of each base template, as a template of its own: "Link page + coming soon: Dark and
 * atmospheric". The same page as the base with the look's values set (`applyPrelaunchLook`), so no
 * field is stored for the look and the page edits like any other. The base templates are unchanged.
 * Agency only. The thumbnail is the New menu's icon.
 */
function prelaunchLookTemplates(): Template[] {
  return LOOK_BASES.flatMap((baseId) => {
    const base = pageTemplates.find(({ id }) => id === baseId)
    if (!base) return []
    const baseValue = base.value as () => { pageBuilder: TemplateSection[] }
    return PRELAUNCH_LOOKS.map((look) => ({
      id: `${baseId}--${look.value}`,
      title: `${base.title}: ${look.title}`,
      description: look.description,
      schemaType: 'page',
      icon: () => createElement(look.thumbnail, { scheme: 'light', selected: false }),
      value: () => {
        const value = baseValue()
        return { ...value, pageBuilder: applyPrelaunchLook(look, value.pageBuilder) }
      },
    }))
  })
}

pageTemplates.push(...prelaunchLookTemplates())

function section(type: string, fields: Record<string, unknown>) {
  return { _key: key(), _type: type, ...fields }
}

function linkItem(label: string, index: number) {
  return {
    _key: key(),
    _type: 'linkItem',
    label,
    link: { _type: 'link', linkType: 'external', openInNewTab: false },
    visibility: 'show',
    featured: index === 0,
  }
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
