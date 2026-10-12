/**
 * Starter content imported by the setup wizard (published, with fixed IDs, and
 * imported with `--missing` so existing documents are never overwritten).
 * The copy doubles as a short guide for whoever edits the site first.
 */
export function seedDocuments(siteName) {
  let n = 0
  const key = () => `seed${(++n).toString(36)}`

  const ref = (id) => ({ _type: 'reference', _ref: id })
  const internal = (id) => ({
    _type: 'link',
    linkType: 'internal',
    internal: ref(id),
    openInNewTab: false,
  })
  const cta = (label, id, variant = 'primary') => ({
    _key: key(),
    _type: 'cta',
    label,
    variant,
    link: internal(id),
  })
  const navItem = (label, id) => ({ _key: key(), _type: 'navItem', label, link: internal(id) })
  const span = (text, marks = []) => ({ _key: key(), _type: 'span', text, marks })
  const block = (children, extra = {}) => ({
    _key: key(),
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: (Array.isArray(children) ? children : [children]).map((c) =>
      typeof c === 'string' ? span(c) : c,
    ),
    ...extra,
  })
  const heading = (text, style = 'h2') => block(text, { style })
  const bullet = (text) => block(text, { listItem: 'bullet', level: 1 })

  const settings = {
    _id: 'settings',
    _type: 'settings',
    title: siteName,
    description: `${siteName}: replace this with one sentence about what you do. It appears in search results.`,
    headerNav: [navItem('Home', 'page-home'), navItem('About', 'page-about')],
    headerCta: {
      _type: 'cta',
      label: 'Get in touch',
      variant: 'primary',
      link: internal('page-about'),
    },
    footerNav: [navItem('About', 'page-about')],
    footerText: `${siteName}. All rights reserved.`,
  }

  const aboutLinkKey = key()
  const home = {
    _id: 'page-home',
    _type: 'page',
    title: 'Home',
    slug: { _type: 'slug', current: 'home' },
    seo: { _type: 'seo', noIndex: false },
    pageBuilder: [
      {
        _key: key(),
        _type: 'hero',
        title: `Welcome to ${siteName}`,
        description:
          'This is starter content. Open Studio, click any text on this page, and start typing.',
        ctas: [cta('About us', 'page-about'), cta('Get in touch', 'page-about', 'secondary')],
      },
      {
        _key: key(),
        _type: 'featuresGrid',
        title: 'Everything is a section',
        intro: 'Pages are built from sections you can add, remove and reorder in Studio.',
        columns: 3,
        items: [
          {
            _key: key(),
            _type: 'featureItem',
            title: 'Add sections',
            text: 'Use "Add item" under Sections to insert any block: hero, image + text, FAQ and more.',
          },
          {
            _key: key(),
            _type: 'featureItem',
            title: 'Reorder by dragging',
            text: 'Drag sections in the list, or right on the page preview in Presentation.',
          },
          {
            _key: key(),
            _type: 'featureItem',
            title: 'Publish when ready',
            text: 'Edits stay as drafts until you press Publish. The live site updates within seconds.',
          },
        ],
      },
      {
        _key: key(),
        _type: 'mediaText',
        eyebrow: 'Image + text',
        title: 'Tell your story next to a picture',
        body: [
          {
            ...block([
              span(
                'Upload an image in this section and choose which side it sits on. Rich text supports ',
              ),
              span('bold', ['strong']),
              span(', lists and '),
              span('links to other pages', [aboutLinkKey]),
              span('.'),
            ]),
            markDefs: [{ _key: aboutLinkKey, ...internal('page-about') }],
          },
        ],
        imagePosition: 'right',
        ctas: [cta('Read more', 'page-about')],
      },
      {
        _key: key(),
        _type: 'testimonials',
        title: 'What people say',
        items: [
          {
            _key: key(),
            _type: 'testimonial',
            quote: 'Swap these for real quotes from your customers. Short and specific works best.',
            name: 'Alex Example',
            role: 'Customer, Company',
          },
          {
            _key: key(),
            _type: 'testimonial',
            quote: 'Add a photo to each testimonial to make it more credible.',
            name: 'Sam Sample',
            role: 'Founder, Startup',
          },
        ],
      },
      {
        _key: key(),
        _type: 'faq',
        title: 'Questions',
        items: [
          {
            _key: key(),
            _type: 'faqItem',
            question: 'How do I edit this page?',
            answer: [
              block(
                'Open /studio and choose Presentation. Click any text on the page to edit it, then press Publish.',
              ),
            ],
          },
          {
            _key: key(),
            _type: 'faqItem',
            question: 'Where do I change the menu and footer?',
            answer: [
              block(
                'In Studio, open Site settings at the top of the sidebar. The header, footer and default SEO all live there.',
              ),
            ],
          },
          {
            _key: key(),
            _type: 'faqItem',
            question: 'How do I add a new page?',
            answer: [
              block(
                'In Studio, open Pages and create a "Landing page" or "Content page" to start from a template. Add it to the header menu in Site settings.',
              ),
            ],
          },
        ],
      },
      {
        _key: key(),
        _type: 'ctaBanner',
        title: 'Ready to make it yours?',
        text: 'Replace this starter content and publish your first page.',
        tone: 'brand',
        ctas: [cta('About us', 'page-about')],
      },
    ],
  }

  const about = {
    _id: 'page-about',
    _type: 'page',
    title: 'About',
    slug: { _type: 'slug', current: 'about' },
    seo: { _type: 'seo', noIndex: false },
    pageBuilder: [
      {
        _key: key(),
        _type: 'hero',
        title: `About ${siteName}`,
        description: 'A content page: a hero followed by rich text.',
      },
      {
        _key: key(),
        _type: 'richText',
        body: [
          heading('Our story'),
          block(
            'Write a few paragraphs about who you are and what you do. Use headings to break up longer pages.',
          ),
          heading('What we offer', 'h3'),
          bullet('Use lists for scannable points'),
          bullet('Keep each one short'),
          bullet('Link to other pages where it helps'),
        ],
      },
      {
        _key: key(),
        _type: 'ctaBanner',
        title: 'Want to work with us?',
        text: 'Point this button at a contact page or an email address.',
        tone: 'dark',
        ctas: [cta('Back to home', 'page-home')],
      },
    ],
  }

  return [settings, home, about]
}
