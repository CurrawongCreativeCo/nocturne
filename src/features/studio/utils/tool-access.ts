import type { Audience } from '../roles'

/** Studio tools clients never see. Vision runs raw queries; the others are for site setup. */
export const AGENCY_ONLY_TOOLS: ReadonlySet<string> = new Set([
  'vision',
  'ai-settings',
  'content-health',
])

/** Tool order for clients: Start here first, so the Studio opens on it, then Presentation (the live preview). */
const CLIENT_FIRST_TOOLS = ['start-here', 'presentation']

/** Agency staff keep every tool in its configured order. Clients lose the agency-only tools. */
export function filterTools<T extends { name: string }>(
  tools: readonly T[],
  audience: Audience,
): T[] {
  if (audience === 'agency') return [...tools]
  const allowed = tools.filter((tool) => !AGENCY_ONLY_TOOLS.has(tool.name))
  const rank = (tool: T) => {
    const index = CLIENT_FIRST_TOOLS.indexOf(tool.name)
    return index === -1 ? CLIENT_FIRST_TOOLS.length : index
  }
  // Array.prototype.sort is stable, so the other tools keep their order.
  return allowed.sort((a, b) => rank(a) - rank(b))
}
