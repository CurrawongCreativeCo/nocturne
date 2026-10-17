interface SlugSource {
  id: string
  /** The editor's own link name, if they set one (Advanced). */
  slug?: string | null
  title?: string | null
}

const slugify = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * The deep-link name of each panel on a page: the editor's link name, else the title as a slug,
 * else "panel". Two panels that would share a name get "-2", "-3" in page order, so every
 * `#panel-<name>` opens exactly one. Returns slug by panel id.
 */
export function assignPanelSlugs(panels: readonly SlugSource[]): Map<string, string> {
  const taken = new Set<string>()
  const slugs = new Map<string, string>()
  for (const panel of panels) {
    const base = slugify(panel.slug ?? '') || slugify(panel.title ?? '') || 'panel'
    let slug = base
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
    taken.add(slug)
    slugs.set(panel.id, slug)
  }
  return slugs
}
