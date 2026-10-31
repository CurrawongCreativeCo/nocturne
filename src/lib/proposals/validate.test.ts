import { describe, expect, it, vi } from 'vitest'

import densityAiry from './fixtures/density-airy.proposal.json'
import documents from './fixtures/documents.json'
import glassImageLeft from './fixtures/glass-image-left.proposal.json'
import supportingVideo from './fixtures/supporting-video.proposal.json'
import type { ChangeProposal, RejectionCode } from './types'
import { validateProposal, type ValidateDeps } from './validate'
import manifest from '../../../design-manifest.generated.json'

const deps: ValidateDeps = {
  manifest,
  documents,
}

const HERO = 'pageBuilder[_key=="hero1"]'

function proposal(
  patches: ChangeProposal['changes'][number]['patches'],
  overrides: Partial<ChangeProposal['changes'][number]> = {},
): ChangeProposal {
  return {
    id: 'test',
    manifestVersion: '1.10.0',
    intent: 'test',
    scope: 'section',
    rationale: 'test',
    changes: [{ documentId: 'page-home', baseRev: 'rev-home-1', patches, ...overrides }],
  }
}

function codes(result: ReturnType<typeof validateProposal>): RejectionCode[] {
  return result.rejected.flatMap((patch) => patch.reasons.map((reason) => reason.code))
}

describe('the fixture proposals', () => {
  it('accepts making a section glass with the image on the left', () => {
    const result = validateProposal(glassImageLeft, deps)
    expect(result.rejected).toEqual([])
    expect(result.accepted).toHaveLength(2)
    // The panel is design; so is the image side, which is a layout choice.
    expect(result.design.applies).toBe(true)
    expect(result.content.accepted).toEqual([])
  })

  it('accepts setting density to airy', () => {
    const result = validateProposal(densityAiry, deps)
    expect(result.rejected).toEqual([])
    expect(result.design.accepted.map((patch) => patch.path)).toEqual([`${HERO}.style.spacing`])
  })

  it('accepts adding a supporting video, and sends it to the agency because clients cannot edit slots', () => {
    const result = validateProposal(supportingVideo, deps)
    expect(result.rejected).toEqual([])
    expect(result.content.applies).toBe(true)
    expect(result.needsAgencyReview).toBe(true)
  })
})

describe('the whole proposal', () => {
  it.each([
    ['not an object', 'text'],
    ['no changes', { ...densityAiry, changes: [] }],
    ['no id', { ...densityAiry, id: '' }],
    ['a bad scope', { ...densityAiry, scope: 'galaxy' }],
    ['a change with no patches', { ...densityAiry, changes: [{ documentId: 'a', baseRev: 'b' }] }],
  ])('rejects %s as invalid-proposal', (_name, input) => {
    const result = validateProposal(input, deps)
    expect(result.rejection?.[0]?.code).toBe('invalid-proposal')
    expect(result.applicable).toEqual([])
  })

  it('rejects a proposal made for another major version of the manifest', () => {
    const result = validateProposal({ ...densityAiry, manifestVersion: '2.0.0' }, deps)
    expect(result.rejection?.[0]?.code).toBe('manifest-mismatch')
    expect(result.applicable).toEqual([])
  })

  it('accepts a newer minor version of the same major', () => {
    expect(validateProposal({ ...densityAiry, manifestVersion: '1.99.0' }, deps).rejection).toBe(
      undefined,
    )
  })
})

describe('rejection reasons', () => {
  const reasonFor = (patches: ChangeProposal['changes'][number]['patches']) =>
    codes(validateProposal(proposal(patches), deps))

  it('stale-revision: the document has moved on since the proposal was made', () => {
    const result = validateProposal(
      proposal([{ set: { [`${HERO}.style.spacing`]: 'spacious' } }], { baseRev: 'rev-home-0' }),
      deps,
    )
    expect(codes(result)).toEqual(['stale-revision'])
    expect(result.rejected[0]?.reasons[0]?.message).toContain('rev-home-1')
    expect(result.applicable).toEqual([])
  })

  it('unknown-document: the document was not provided', () => {
    const result = validateProposal(
      proposal([{ set: { title: 'x' } }], { documentId: 'page-missing' }),
      deps,
    )
    expect(codes(result)).toEqual(['unknown-document'])
  })

  it('unknown-document: the manifest does not describe that type of document', () => {
    const other = {
      ...deps,
      documents: { post: { _id: 'post', _type: 'post', _rev: 'r' } },
    }
    const result = validateProposal(
      proposal([{ set: { title: 'x' } }], { documentId: 'post', baseRev: 'r' }),
      other,
    )
    expect(codes(result)).toEqual(['unknown-document'])
  })

  it('invalid-path: syntax the proposals do not support', () => {
    expect(reasonFor([{ set: { 'pageBuilder[0:2].title': 'x' } }])).toEqual(['invalid-path'])
    expect(reasonFor([{ set: { 'pageBuilder[title=="x"].title': 'x' } }])).toEqual(['invalid-path'])
    expect(reasonFor([{ insert: { after: `${HERO}.supporting`, items: [] } }])).toEqual([
      'invalid-path',
    ])
  })

  it('unsupported-operation: only set, unset and insert are allowed', () => {
    expect(
      reasonFor([{ inc: { count: 1 } } as unknown as ChangeProposal['changes'][0]['patches'][0]]),
    ).toEqual(['unsupported-operation'])
  })

  it('unknown-path: a field the section does not have', () => {
    expect(reasonFor([{ set: { [`${HERO}.style.glitter`]: 'lots' } }])).toEqual(['unknown-path'])
    expect(reasonFor([{ set: { [`${HERO}.nonsense`]: 'x' } }])).toEqual(['unknown-path'])
  })

  it('unknown-path: a section that is not in the document, or outside the page builder', () => {
    expect(reasonFor([{ set: { 'pageBuilder[_key=="nope"].title': 'x' } }])).toEqual([
      'unknown-path',
    ])
    expect(reasonFor([{ set: { title: 'x' } }])).toEqual(['unknown-path'])
  })

  it('unknown-path: a section type the manifest does not describe', () => {
    expect(
      reasonFor([{ insert: { after: 'pageBuilder[-1]', items: [{ _type: 'cartoon' }] } }]),
    ).toEqual(['unknown-path'])
  })

  it('value-not-allowed: a value outside the field’s list', () => {
    expect(reasonFor([{ set: { [`${HERO}.style.panel`]: 'frosted-neon' } }])).toEqual([
      'value-not-allowed',
    ])
    expect(reasonFor([{ set: { [`${HERO}.imagePosition`]: 'middle' } }])).toEqual([
      'value-not-allowed',
    ])
  })

  it('value-not-allowed: the wrong kind of value, null, or unsetting a required field', () => {
    expect(reasonFor([{ set: { [`${HERO}.title`]: 12 } }])).toEqual(['value-not-allowed'])
    expect(reasonFor([{ set: { [`${HERO}.style.panel`]: null } }])).toEqual(['value-not-allowed'])
    expect(reasonFor([{ set: { [`${HERO}.showGreeting`]: 'yes' } }])).toEqual(['value-not-allowed'])
  })

  it('limit-exceeded: text longer than the field allows', () => {
    expect(reasonFor([{ set: { [`${HERO}.title`]: 'x'.repeat(81) } }])).toEqual(['limit-exceeded'])
  })

  it('limit-exceeded: more items than a slot holds', () => {
    const video = (key: string) => ({
      _key: key,
      _type: 'slotVideo',
      source: 'youtube',
      url: 'https://www.youtube.com/watch?v=abc',
    })
    expect(reasonFor([{ set: { [`${HERO}.supporting`]: [video('a'), video('b')] } }])).toEqual([
      'limit-exceeded',
    ])

    // One already there: an insert would make two.
    const full = {
      ...deps,
      documents: {
        ...deps.documents,
        'page-home': {
          _id: 'page-home',
          _type: 'page',
          _rev: 'rev-home-1',
          pageBuilder: [
            { _key: 'hero1', _type: 'hero', variant: 'split', supporting: [video('v1')] },
          ],
        },
      },
    }
    const result = validateProposal(
      proposal([{ insert: { after: `${HERO}.supporting[-1]`, items: [video('v2')] } }]),
      full,
    )
    expect(codes(result)).toEqual(['limit-exceeded'])
  })

  it('slot-block-not-allowed: a block the slot does not accept', () => {
    expect(
      reasonFor([
        { set: { [`${HERO}.supporting`]: [{ _key: 'x', _type: 'featuresGrid', heading: 'x' }] } },
      ]),
    ).toEqual(['slot-block-not-allowed'])
  })

  it('slot-block-not-allowed: an item with no type', () => {
    expect(reasonFor([{ set: { [`${HERO}.supporting`]: [{ _key: 'x' }] } }])).toEqual([
      'slot-block-not-allowed',
    ])
  })

  it('contrast-fails: a Brand colours change that makes text unreadable', () => {
    const result = validateProposal(
      proposal([{ set: { ink: '#dddddd' } }], {
        documentId: 'designSettings',
        baseRev: 'rev-design-1',
      }),
      deps,
    )
    expect(codes(result)).toContain('contrast-fails')
    expect(result.design.applies).toBe(false)
  })

  it('accepts a Brand colours change that keeps text readable', () => {
    const result = validateProposal(
      proposal([{ set: { primary: '#1d4ed8' } }], {
        documentId: 'designSettings',
        baseRev: 'rev-design-1',
      }),
      deps,
    )
    expect(result.rejected).toEqual([])
    expect(result.needsAgencyReview).toBe(true)
  })
})

describe('splitting content from design', () => {
  it('a rejected design part does not block the content part', () => {
    const result = validateProposal(
      proposal([
        {
          set: {
            [`${HERO}.title`]: 'A better heading',
            [`${HERO}.style.panel`]: 'frosted-neon',
          },
        },
      ]),
      deps,
    )
    expect(result.content.applies).toBe(true)
    expect(result.design.applies).toBe(false)
    expect(result.applicable.map((patch) => patch.path)).toEqual([`${HERO}.title`])
    expect(result.rejected.map((patch) => patch.part)).toEqual(['design'])
  })

  it('one rejection holds back the whole of its own part', () => {
    const result = validateProposal(
      proposal([
        {
          set: {
            [`${HERO}.style.spacing`]: 'spacious',
            [`${HERO}.style.panel`]: 'frosted-neon',
          },
        },
      ]),
      deps,
    )
    expect(result.design.accepted).toHaveLength(1)
    expect(result.design.applies).toBe(false)
    expect(result.applicable).toEqual([])
  })
})

describe('permissions', () => {
  it('does not ask for review when clients can edit the field', () => {
    const result = validateProposal(proposal([{ set: { [`${HERO}.title`]: 'New heading' } }]), deps)
    expect(result.accepted[0]?.needsAgencyReview).toBe(false)
    expect(result.needsAgencyReview).toBe(false)
  })

  it('asks for review when a design field is agency only', () => {
    const result = validateProposal(
      proposal([{ set: { [`${HERO}.style.spacing`]: 'spacious' } }]),
      deps,
    )
    expect(result.accepted[0]?.needsAgencyReview).toBe(true)
  })

  it('uses the registry it is given', () => {
    const result = validateProposal(proposal([{ set: { [`${HERO}.title`]: 'New heading' } }]), {
      ...deps,
      isClientEditable: () => false,
    })
    expect(result.accepted[0]?.needsAgencyReview).toBe(true)
  })
})

describe('panel problems', () => {
  it('are warnings on an accepted patch, never rejections', async () => {
    vi.resetModules()
    vi.doMock('@/lib/sanity/section-panel', () => ({ panelProblem: () => 'Too pale to read.' }))
    const { validateProposal: validateWithPanel } = await import('./validate')
    const result = validateWithPanel(glassImageLeft, deps)
    expect(result.rejected).toEqual([])
    expect(result.accepted.flatMap((patch) => patch.warnings)).toEqual(['Too pale to read.'])
    vi.doUnmock('@/lib/sanity/section-panel')
  })
})
