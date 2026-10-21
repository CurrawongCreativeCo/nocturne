const block = (text: string) => ({
  _key: 'block',
  _type: 'block',
  style: 'normal',
  markDefs: [],
  children: [{ _key: 'span', _type: 'span', text, marks: [] }],
})
const ref = (id: string) => ({ _type: 'reference', _ref: id })
const heading = (text: string) => [block(text)]

export function seedDocuments(imageId: string) {
  const image = { _type: 'image', asset: ref(imageId) }
  const hero = (index: number) => ({
    _key: `section-${index}`,
    _type: 'hero',
    heading: heading(`Performance heading ${index}`),
    variant: 'overlay',
    description: 'A repeatable Studio performance fixture.',
    backgroundImage: image,
    ctas: [
      {
        _key: 'next',
        _type: 'cta',
        label: 'Next performance page',
        variant: 'primary',
        link: {
          _type: 'link',
          linkType: 'internal',
          internal: ref(`studio-perf-small-${(index + 1) % 5}`),
        },
      },
    ],
    supporting: [
      {
        _key: 'stats',
        _type: 'stats',
        items: [{ _key: 'stat', _type: 'statItem', value: 40, label: 'Sections' }],
      },
    ],
    partMotion: { enabled: true, headingPreset: 'rise', imagePreset: 'scale' },
  })
  const richText = (index: number) => ({
    _key: `section-${index}`,
    _type: 'richText',
    body: [block(`Performance section ${index}`)],
  })
  const section = (index: number) => {
    switch (index % 4) {
      case 0:
        return hero(index)
      case 1:
        return richText(index)
      case 2:
        return {
          _key: `section-${index}`,
          _type: 'ctaBanner',
          heading: heading(`Call to action ${index}`),
          text: 'Repeatable content.',
        }
      default:
        return {
          _key: `section-${index}`,
          _type: 'mediaText',
          heading: heading(`Image and text ${index}`),
          body: [block('Content beside an image.')],
          image,
        }
    }
  }
  const page = (id: string, title: string, pageBuilder: object[]) => ({
    _id: `studio-perf-${id}`,
    _type: 'page',
    title,
    slug: {
      _type: 'slug',
      current: id.startsWith('shared-') ? `studio-perf-shared/${id}` : `studio-perf-${id}`,
    },
    pageBuilder,
  })
  return [
    {
      _id: 'siteIdentity',
      _type: 'siteIdentity',
      title: 'Studio performance',
    },
    {
      _id: 'studio-perf-shared',
      _type: 'sharedSection',
      title: 'Performance shared section',
      section: [richText(0)],
    },
    ...Array.from({ length: 10 }, (_, i) =>
      page(`small-${i}`, `Performance small ${i}`, [{ ...hero(i), _key: 'hero' }, richText(1)]),
    ),
    ...Array.from({ length: 40 }, (_, i) =>
      page(`shared-${i}`, `Performance shared ${i}`, [
        hero(0),
        { _key: 'shared', ...ref('studio-perf-shared') },
      ]),
    ),
    page(
      'large',
      'Performance 40 sections',
      Array.from({ length: 40 }, (_, i) => section(i)),
    ),
    {
      _id: 'studio-perf-author',
      _type: 'author',
      name: 'Performance author',
      slug: { _type: 'slug', current: 'studio-perf-author' },
    },
    ...Array.from({ length: 20 }, (_, i) => ({
      _id: `studio-perf-post-${i}`,
      _type: 'post',
      title: `Performance post ${i}`,
      slug: { _type: 'slug', current: `studio-perf-post-${i}` },
      excerpt: 'A repeatable blog post.',
      mainImage: image,
      author: ref('studio-perf-author'),
      publishedAt: '2026-10-01T00:00:00Z',
      body: [block('Performance article content.')],
    })),
  ]
}
