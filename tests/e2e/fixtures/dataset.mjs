/**
 * Content served by the fake Content Lake in end-to-end tests. Each document exercises
 * specific behavior; keep the tests in tests/e2e in sync when changing it.
 */
let n = 0
const key = () => `k${++n}`

const ref = (id) => ({ _type: 'reference', _ref: id })
const internal = (id, openInNewTab = false) => ({
  _type: 'link',
  linkType: 'internal',
  internal: ref(id),
  openInNewTab,
})
const external = (url, openInNewTab = false) => ({
  _type: 'link',
  linkType: 'external',
  url,
  openInNewTab,
})
const cta = (label, link, variant = 'primary') => ({
  _key: key(),
  _type: 'cta',
  label,
  variant,
  link,
})
const navItem = (label, id) => ({ _key: key(), _type: 'navItem', label, link: internal(id) })
const block = (children, extra = {}) => ({
  _key: key(),
  _type: 'block',
  style: 'normal',
  markDefs: [],
  children: children.map((c) =>
    typeof c === 'string' ? { _key: key(), _type: 'span', text: c, marks: [] } : c,
  ),
  ...extra,
})

const UPDATED = '2026-10-12T00:00:00Z'

export const documents = [
  {
    _id: 'settings',
    _type: 'settings',
    title: 'Test Co',
    description: 'Default description for Test Co.',
    headerNav: [navItem('Home', 'page-home'), navItem('About', 'page-about')],
    headerCta: { _type: 'cta', label: 'Contact', variant: 'primary', link: internal('page-about') },
    footerNav: [navItem('About', 'page-about')],
    footerText: 'Test Co. All rights reserved.',
  },
  {
    // Starts with a hero: the hero provides the page's <h1>.
    _id: 'page-home',
    _type: 'page',
    title: 'Home',
    slug: { _type: 'slug', current: 'home' },
    seo: { _type: 'seo', metaDescription: 'Home page description.' },
    pageBuilder: [
      {
        _key: key(),
        _type: 'hero',
        title: 'Welcome to Test Co',
        description: 'Hero description.',
        ctas: [
          cta('About us', internal('page-about')),
          cta('Learn more', internal('page-about'), 'secondary'),
        ],
      },
      {
        _key: key(),
        _type: 'featuresGrid',
        title: 'Features',
        columns: 3,
        items: [1, 2, 3].map((i) => ({
          _key: key(),
          _type: 'featureItem',
          title: `Feature ${i}`,
          text: 'Text.',
        })),
      },
      {
        // No image: should render as a single column.
        _key: key(),
        _type: 'mediaText',
        eyebrow: 'Eyebrow',
        title: 'Media without an image',
        body: [block(['Body text.'])],
        imagePosition: 'right',
        ctas: [cta('Read more', internal('page-about'))],
      },
      {
        _key: key(),
        _type: 'testimonials',
        title: 'Testimonials',
        items: [{ _key: key(), _type: 'testimonial', quote: 'Great.', name: 'Alex', role: 'CEO' }],
      },
      {
        _key: key(),
        _type: 'faq',
        title: 'FAQ',
        items: [
          {
            _key: key(),
            _type: 'faqItem',
            question: 'A question?',
            answer: [block(['An answer.'])],
          },
        ],
      },
      {
        _key: key(),
        _type: 'ctaBanner',
        title: 'Brand banner',
        text: 'Banner text.',
        tone: 'brand',
        ctas: [cta('Get started', internal('page-about'))],
      },
    ],
  },
  {
    // Starts with rich text: the page title becomes a visually hidden <h1>.
    _id: 'page-about',
    _type: 'page',
    title: 'About',
    slug: { _type: 'slug', current: 'about' },
    pageBuilder: [
      {
        _key: key(),
        _type: 'richText',
        body: [
          block(['About Test Co.'], { style: 'h2' }),
          {
            ...block([
              { _key: 'span-link', _type: 'span', text: 'External site', marks: ['link-1'] },
            ]),
            markDefs: [{ _key: 'link-1', ...external('https://example.org', true) }],
          },
        ],
      },
      {
        _key: key(),
        _type: 'ctaBanner',
        title: 'Dark banner',
        tone: 'dark',
        ctas: [
          cta('Home', internal('page-home')),
          cta('Secondary', internal('page-home'), 'secondary'),
        ],
      },
    ],
  },
  {
    _id: 'shared-promo',
    _type: 'sharedSection',
    title: 'Promo banner',
    section: [
      {
        _key: key(),
        _type: 'ctaBanner',
        title: 'Shared promo banner',
        text: 'Edited once, shown on every page that uses it.',
        tone: 'dark',
        ctas: [cta('See the promo', internal('page-about'))],
      },
    ],
  },
  {
    // Reaches a section through a reference; it has no hero, so the title is the hidden <h1>.
    _id: 'page-shared',
    _type: 'page',
    title: 'Shared',
    slug: { _type: 'slug', current: 'shared' },
    pageBuilder: [
      {
        _key: key(),
        _type: 'richText',
        body: [block(['Content before the shared section.'])],
      },
      { _key: 'shared-ref', ...ref('shared-promo') },
      // Points at a missing document: skipped, not an error.
      { _key: key(), ...ref('does-not-exist') },
    ],
  },
  {
    _id: 'r1',
    _type: 'redirect',
    source: '/About-Us.html',
    destination: '/about',
    permanent: true,
  },
  {
    _id: 'r2',
    _type: 'redirect',
    source: '/promo/',
    destination: 'https://example.com/sale',
    permanent: false,
  },
].map((doc) => ({ ...doc, _updatedAt: UPDATED }))
