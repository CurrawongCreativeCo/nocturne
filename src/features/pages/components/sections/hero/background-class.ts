/**
 * Classes for a hero's background <img>: behind the text (`-z-10`) unless it floats, plus the
 * caller's own. Joined with a space on purpose: written as `${cond ? '' : '-z-10'}${className}` the
 * two ran together as `-z-10object-cover`, which matches nothing, so the picture sat over the
 * hero's buttons and took their clicks.
 */
export function backgroundImageClass(floats: boolean, className: string): string {
  return [floats ? '' : '-z-10', className].filter(Boolean).join(' ')
}
