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
const IMAGE_ASSET_ID = 'image-0123456789abcdef0123456789abcdef01234567-1200x630-png'
const image = (alt) => ({ _type: 'image', alt, asset: ref(IMAGE_ASSET_ID) })

// The blog: 14 posts, so the index paginates (12 + 2). The first four have categories, set up so
// "Welcome to the blog" has three related posts whose score order differs from their date order:
// the roundup shares two categories but is oldest of the three.
const blogPost = (
  id,
  title,
  publishedAt,
  { categories = [], author = 'author-ann', seo } = {},
) => ({
  _id: `post-${id}`,
  _type: 'post',
  title,
  slug: { _type: 'slug', current: id },
  excerpt: `Summary of ${title}.`,
  mainImage: image(`Picture for ${title}`),
  publishedAt,
  author: ref(author),
  categories: categories.map((category) => ({ _key: key(), ...ref(category) })),
  body: [block([`Body of ${title}.`])],
  ...(seo && { seo: { _type: 'seo', ...seo } }),
})

const blogPosts = [
  {
    ...blogPost('welcome-to-the-blog', 'Welcome to the blog', '2026-10-10T09:00:00Z', {
      categories: ['category-news', 'category-guides'],
    }),
    body: [
      block(['A first heading'], { style: 'h2' }),
      {
        ...block([
          { _key: 'span-a', _type: 'span', text: 'Read ', marks: [] },
          { _key: 'span-b', _type: 'span', text: 'about us', marks: ['link-about'] },
          { _key: 'span-c', _type: 'span', text: ' first.', marks: [] },
        ]),
        markDefs: [{ _key: 'link-about', ...internal('page-about') }],
      },
    ],
  },
  blogPost('news-update', 'News update', '2026-10-09T09:00:00Z', { categories: ['category-news'] }),
  blogPost('how-to-guide', 'How-to guide', '2026-10-08T09:00:00Z', {
    categories: ['category-guides'],
  }),
  blogPost('news-and-guides-roundup', 'News and guides roundup', '2026-10-07T09:00:00Z', {
    categories: ['category-news', 'category-guides'],
  }),
  ...Array.from({ length: 9 }, (_, i) =>
    blogPost(
      `archive-post-${i + 1}`,
      `Archive post ${i + 1}`,
      `2026-10-0${6 - Math.min(i, 5)}T${String(12 - i).padStart(2, '0')}:00:00Z`,
      // The last one points at an author that no longer exists: it must render without a byline.
      i === 8 ? { author: 'author-deleted' } : {},
    ),
  ),
  blogPost('hidden-post', 'Hidden post', '2026-09-01T09:00:00Z', { seo: { noIndex: true } }),
]

export const documents = [
  {
    _id: 'settings',
    _type: 'settings',
    title: 'Test Co',
    description: 'Default description for Test Co.',
    // Tests move the browser clock around this window (tests/e2e/announcement.spec.ts).
    announcement: {
      _type: 'announcement',
      message: 'Summer sale: 20% off all services',
      link: internal('page-about'),
      startsAt: '2026-01-01T00:00:00Z',
      endsAt: '2100-01-01T00:00:00Z',
      dismissible: true,
    },
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
        showGreeting: true,
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
    _id: IMAGE_ASSET_ID,
    _type: 'sanity.imageAsset',
    url: 'https://cdn.sanity.io/images/test/test/0123456789abcdef0123456789abcdef01234567-1200x630.png',
    metadata: { dimensions: { width: 1200, height: 630 } },
  },
  {
    // Has its own share image: no generated one may be added next to it.
    _id: 'page-own-image',
    _type: 'page',
    title: 'Own image',
    slug: { _type: 'slug', current: 'own-image' },
    seo: {
      _type: 'seo',
      ogImage: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: IMAGE_ASSET_ID,
        },
      },
    },
    pageBuilder: [{ _key: key(), _type: 'richText', body: [block(['Page with a share image.'])] }],
  },
  {
    // Too long for the generated share image's three lines.
    _id: 'page-long-title',
    _type: 'page',
    title:
      'A very long page title that keeps going well past what three lines of a share image can hold, '
        .repeat(3)
        .trim(),
    slug: { _type: 'slug', current: 'long-title' },
    pageBuilder: [{ _key: key(), _type: 'richText', body: [block(['Page with a long title.'])] }],
  },
  {
    _id: 'page-services',
    _type: 'page',
    title: 'Services',
    slug: { _type: 'slug', current: 'services' },
    pageBuilder: [{ _key: key(), _type: 'richText', body: [block(['Our services.'])] }],
  },
  {
    // Nested under "services"; "services/web" has no page, so the trail skips that segment.
    _id: 'page-web-design',
    _type: 'page',
    title: 'Web design',
    slug: { _type: 'slug', current: 'services/web/design' },
    pageBuilder: [{ _key: key(), _type: 'richText', body: [block(['Web design services.'])] }],
  },
  {
    _id: 'author-ann',
    _type: 'author',
    name: 'Ann Author',
    image: image(''),
    bio: 'Ann writes about testing.',
  },
  {
    _id: 'category-news',
    _type: 'category',
    title: 'News',
    slug: { _type: 'slug', current: 'news' },
  },
  {
    _id: 'category-guides',
    _type: 'category',
    title: 'Guides',
    slug: { _type: 'slug', current: 'guides' },
  },
  {
    // No posts: it must not appear in the category filter.
    _id: 'category-empty',
    _type: 'category',
    title: 'Empty',
    slug: { _type: 'slug', current: 'empty' },
  },
  ...blogPosts,
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

/**
 * A "release" version of the About page, as the Content Lake stores it: a document with
 * `_id: versions.<release>.<id>`. Only served when the request's perspective names the release.
 */
// Keep in sync with RELEASE_ID in tests/e2e/constants.ts (this file is plain .mjs, run by Node).
const RELEASE_ID = 'rSummer'

export const releaseVersions = [
  {
    _id: `versions.${RELEASE_ID}.page-about`,
    _type: 'page',
    title: 'About (Summer release)',
    slug: { _type: 'slug', current: 'about' },
    pageBuilder: [
      {
        _key: key(),
        _type: 'richText',
        body: [block(['Only in the Summer release.'], { style: 'h2' })],
      },
    ],
    _updatedAt: UPDATED,
  },
]
