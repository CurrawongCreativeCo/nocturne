import { set, type FormPatch } from 'sanity'

import { showsFrame } from '@/lib/sanity/image-design-options'

/** Hidden references must stay weak: Sanity otherwise strengthens inline-created drafts on publish. */
export function hiddenFrameReferencePatches(value: Record<string, unknown>, profile: boolean) {
  const name = profile ? 'frame' : 'customFrame'
  const reference = value[name] as
    | { _ref?: string; _weak?: boolean; _strengthenOnPublish?: { weak?: boolean; type?: string } }
    | undefined
  if (!reference?._ref) return []
  const active = profile
    ? value.border === 'frame'
    : showsFrame(value.appearance as string | undefined) && value.frame === 'custom'
  const patches: FormPatch[] = []
  if (!active && !reference._weak) patches.push(set(true, [name, '_weak']))
  if ((!active || reference._weak) && reference._strengthenOnPublish?.weak !== !active) {
    patches.push(
      set({ ...reference._strengthenOnPublish, type: 'frame', weak: !active }, [
        name,
        '_strengthenOnPublish',
      ]),
    )
  }
  return patches
}
