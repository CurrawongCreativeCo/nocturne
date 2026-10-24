/**
 * Whether `link` needs a name from the icon inside it: it has no label of its own and no text
 * outside the icon (a workspace menu row has its title there, the navbar home link has nothing).
 */
export function iconLinkLabel(link: Element, icon: Element | null): boolean {
  if (link.hasAttribute('aria-label') || link.hasAttribute('aria-labelledby')) return false
  const outside = link.textContent.replace(icon?.textContent ?? '', '')
  return outside.trim() === ''
}
