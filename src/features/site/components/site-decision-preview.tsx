import { Card, Stack, Text } from '@sanity/ui'

import { headingStyleOf } from '@/lib/design/heading-styles'
import { EDITORIAL_FONT_NOTE } from '@/lib/design/site-decision-options'
import tokens from '@/styles/tokens.json'

/**
 * A small mock-up of Density, Shape and Heading style: a section with a heading, body text, a button
 * and a card, drawn from the variables `resolveDesignTokens` returns and the one heading table the
 * site reads, so it cannot disagree with the site. Spacing is shown at a sixth of its size, and the
 * radii and heading sizes as they are. Standard, Soft and Standard are what an unset field draws.
 * Colours are the editor's, so they are inline on purpose (see DesignSettingsInput).
 */
export interface SiteDecisionPreviewProps {
  /** The `:root` variables from resolveDesignTokens. */
  vars: Readonly<Record<string, string>>
  /** The stored heading style, which picks the weight, tracking and size. */
  headingStyle?: string | null
  colours: {
    surface: string
    ink: string
    inkMuted: string
    line: string
    cta: string
    ctaInk: string
  }
}

const PREVIEW_HEADING_PX = 22
const SPACING_SHRINK = 6

export function SiteDecisionPreview({ vars, headingStyle, colours }: SiteDecisionPreviewProps) {
  const style = headingStyleOf(headingStyle)
  const section = vars['--spacing-section'] ?? tokens.space['section-y']
  const gutter = vars['--spacing-gutter'] ?? tokens.space.gutter
  const radiusCard = vars['--radius-card'] ?? tokens.radius.card
  const radiusControl = vars['--radius-control'] ?? tokens.radius.control
  const editorial = headingStyle === 'editorial'

  return (
    <Card padding={3} radius={2} border data-testid="site-decision-preview">
      <Stack gap={3}>
        <Text size={1} weight="semibold">
          Density, shape and headings
        </Text>
        <div
          role="img"
          aria-label="A mock-up of one section with a heading, body text, a button and a card, at the chosen density, shape and heading style"
          style={{
            background: colours.surface,
            color: colours.ink,
            border: `1px solid ${colours.line}`,
            borderRadius: 8,
            fontFamily: 'system-ui, sans-serif',
            paddingBlock: `calc(${section} / ${SPACING_SHRINK})`,
            paddingInline: `calc(${gutter} / ${SPACING_SHRINK} * 2)`,
          }}
        >
          <div
            data-part="heading"
            style={{
              fontSize: Math.round(PREVIEW_HEADING_PX * style.scale.h2 * 10) / 10,
              fontWeight: style.weight,
              letterSpacing: style.tracking,
              lineHeight: 1.15,
            }}
          >
            A heading
          </div>
          <div data-part="body" style={{ color: colours.inkMuted, fontSize: 14, marginTop: 6 }}>
            Body text under the heading, in the muted ink.
          </div>
          <div style={{ marginTop: 12 }}>
            <span
              data-part="button"
              style={{
                display: 'inline-block',
                background: colours.cta,
                color: colours.ctaInk,
                borderRadius: 999,
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Button
            </span>
          </div>
          <div
            data-part="card"
            style={{
              marginTop: 12,
              border: `1px solid ${colours.line}`,
              borderRadius: radiusCard,
              padding: 12,
              fontSize: 13,
            }}
          >
            <strong style={{ fontWeight: style.weight }}>A card</strong>
            <div style={{ color: colours.inkMuted }}>Its corners follow Shape.</div>
            <span
              data-part="control"
              style={{
                display: 'inline-block',
                marginTop: 8,
                border: `1px solid ${colours.line}`,
                borderRadius: radiusControl,
                padding: '2px 10px',
                fontSize: 12,
              }}
            >
              Field
            </span>
          </div>
        </div>
        {editorial && (
          <Text size={1} muted data-testid="editorial-note">
            {EDITORIAL_FONT_NOTE}
          </Text>
        )}
      </Stack>
    </Card>
  )
}
