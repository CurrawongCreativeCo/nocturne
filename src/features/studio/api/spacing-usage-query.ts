import { defineQuery } from 'next-sanity'

/**
 * What the "sections with their own spacing" note under Brand colours needs, and nothing else (task
 * 216): each page's and shared section's id and title, and only the sections that chose Compact or
 * Spacious, with their key (for the link), kind, title and that one value. Run in Studio only, with the
 * `raw` perspective so drafts come back beside published documents; every document is returned, even
 * with no such section, because a draft that went back to Default has to hide its published version's
 * override (`resolveVersions` prefers the draft). The public site never runs it.
 */
export const SPACING_USAGE_QUERY = defineQuery(/* groq */ `{
  "pages": *[_type == "page"] {
    _id,
    title,
    "pageBuilder": pageBuilder[style.spacing in ["compact", "spacious"]] {
      _key,
      _type,
      title,
      "style": { "spacing": style.spacing }
    }
  },
  "sharedSections": *[_type == "sharedSection"] {
    _id,
    title,
    "section": select(
      section.style.spacing in ["compact", "spacious"] => section {
        _key,
        _type,
        title,
        "style": { "spacing": style.spacing }
      }
    )
  }
}`)
