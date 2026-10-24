import type { ToolMenuProps } from 'sanity'

/**
 * SPIKE (task 174): the tools move to the shell rail, so the top bar lists none. The narrow-screen
 * drawer (context "sidebar") keeps Sanity's own menu, since the rail is hidden there.
 */
export function ShellToolMenu(props: ToolMenuProps) {
  return props.context === 'topbar' ? null : props.renderDefault(props)
}
