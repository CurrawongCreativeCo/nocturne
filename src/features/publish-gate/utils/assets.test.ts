import { describe, expect, it } from 'vitest'

import { assetRefs, assetVerified, newAssetRefs, unverifiedAssets } from './assets'

const where = { projectId: 'proj', dataset: 'production' }
const hash = 'a'.repeat(40)
const imageId = `image-${hash}-800x600-jpg`
const fileId = `file-${hash}-pdf`
const imageDoc = {
  _id: imageId,
  _type: 'sanity.imageAsset',
  sha1hash: hash,
  extension: 'jpg',
  metadata: { dimensions: { width: 800, height: 600 } },
  url: `https://cdn.sanity.io/images/proj/production/${hash}-800x600.jpg`,
}
const fileDoc = {
  _id: fileId,
  _type: 'sanity.fileAsset',
  sha1hash: hash,
  extension: 'pdf',
  url: `https://cdn.sanity.io/files/proj/production/${hash}.pdf`,
}

describe('assetRefs', () => {
  it('finds image and file references at any depth and ignores other references', () => {
    const doc = {
      a: { asset: { _ref: imageId } },
      list: [{ file: { asset: { _ref: fileId } } }],
      author: { _ref: 'jo' },
    }
    expect([...assetRefs(doc)].sort()).toEqual([fileId, imageId].sort())
  })
  it('lists only references the published version lacked', () => {
    const draft = { a: { asset: { _ref: imageId } }, b: { asset: { _ref: fileId } } }
    expect(newAssetRefs({ a: { asset: { _ref: imageId } } }, draft)).toEqual([fileId])
  })
})

describe('assetVerified', () => {
  it('accepts genuine image and file assets', () => {
    expect(assetVerified(imageId, imageDoc, where)).toBe(true)
    expect(assetVerified(fileId, fileDoc, where)).toBe(true)
  })
  it('refuses a missing document, a different type and a mismatched id', () => {
    expect(assetVerified(imageId, undefined, where)).toBe(false)
    expect(assetVerified(imageId, { ...imageDoc, _type: 'page' }, where)).toBe(false)
    expect(assetVerified(imageId, { ...imageDoc, _id: 'other' }, where)).toBe(false)
  })
  it('refuses a forged document whose fields disagree with its id', () => {
    expect(assetVerified(imageId, { ...imageDoc, sha1hash: 'b'.repeat(40) }, where)).toBe(false)
    expect(
      assetVerified(
        imageId,
        { ...imageDoc, metadata: { dimensions: { width: 1, height: 600 } } },
        where,
      ),
    ).toBe(false)
    expect(assetVerified(fileId, { ...fileDoc, extension: 'exe' }, where)).toBe(false)
  })
  it('refuses a url on another host, project or dataset', () => {
    expect(assetVerified(imageId, { ...imageDoc, url: 'https://evil.example/x.jpg' }, where)).toBe(
      false,
    )
    expect(assetVerified(imageId, imageDoc, { ...where, dataset: 'staging' })).toBe(false)
    expect(
      assetVerified(
        fileId,
        { ...fileDoc, url: `https://cdn.sanity.io/files/other/production/${hash}.pdf` },
        where,
      ),
    ).toBe(false)
  })
  it('lists the ones that fail', () => {
    expect(unverifiedAssets([imageId, fileId], [imageDoc], where)).toEqual([fileId])
  })
})
