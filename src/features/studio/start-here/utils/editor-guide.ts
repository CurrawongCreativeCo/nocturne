import guideData from '../editor-guide.generated.json'

/** One task guide. Its markdown is written in docs/editor-guide/. */
export interface GuideEntry {
  id: string
  title: string
  summary: string
  body: string
}

export interface GuideField {
  name: string
  title: string
  kind: string
  required: boolean
  description?: string
  imageSize?: string
  length?: string
  choices?: string[]
  items?: GuideField[]
}

export interface GuideSection {
  name: string
  title: string
  description?: string
  fields: GuideField[]
}

/** The shape scripts/build-editor-guide.mjs writes. */
export interface EditorGuide {
  guides: GuideEntry[]
  sections: GuideSection[]
}

export const editorGuide: EditorGuide = guideData

/** The training video for a guide: `help.videos` in site.profile.ts, keyed by the guide's id. */
export function videoFor(
  guideId: string,
  videos: Readonly<Record<string, string>> | undefined,
): string | undefined {
  return videos?.[guideId]
}
