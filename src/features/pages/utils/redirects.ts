/** Lowercase, no trailing slash: "/About-Us/" and "/about-us" are the same redirect source. */
export function normalizePath(path: string): string {
  return path.toLowerCase().replace(/(.)\/+$/, '$1')
}

/** The redirect whose source matches `path`, ignoring case and trailing slashes. */
export function findRedirect<T extends { source: string }>(redirects: T[], path: string): T | null {
  const target = normalizePath(path)
  return redirects.find(({ source }) => normalizePath(source) === target) ?? null
}
