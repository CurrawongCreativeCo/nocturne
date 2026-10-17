/**
 * Link-in-bio helpers on pages: "Copy link" puts the page's public address on the clipboard, and
 * "Download QR code" opens a dialog with a code for it, as SVG (for print) or PNG (for screens).
 * Both use the published address, since a draft has no public page to link to. The QR library is
 * imported through `qr-code/qr-code.ts`, which only Studio uses, so the public site never ships it.
 */
import { CopyIcon } from '@sanity/icons/Copy'
import { DownloadIcon } from '@sanity/icons/Download'
import { Box, Button, Card, Checkbox, Flex, Stack, Text } from '@sanity/ui'
import { useToast } from '@sanity/ui/toast'
import { useMemo, useState } from 'react'
import {
  type DocumentActionComponent,
  type DocumentActionDescription,
  type DocumentActionProps,
  type DocumentActionsResolver,
} from 'sanity'

import { colorHex } from '@/config/tokens.generated'

import {
  qrColours,
  qrFileName,
  qrMatrix,
  qrPayload,
  qrSvg,
  type QrColours,
} from '../qr-code/qr-code'
import { documentPath, joinUrl, readSlug } from '../utils/publish-redirect'
import { siteOrigin } from '../utils/site-origin'

const PAGE_LINK_TYPES = new Set(['page'])

/** The longest side, in pixels, of the PNG; the module size is rounded down to a whole pixel. */
const PNG_TARGET_SIZE = 1024

const SITE_COLOURS = qrColours(colorHex.ink, colorHex.surface)

/** The published page's slug and address, or why there is none yet. */
function usePublishedAddress({ type, published }: DocumentActionProps) {
  const slug = readSlug(published)
  const path = documentPath(type, slug)
  return slug && path ? { slug, path, url: joinUrl(siteOrigin(), path) } : null
}

const UNPUBLISHED_HINT = 'Publish the page first: a draft has no public address.'

export const CopyPageLink: DocumentActionComponent = (props: DocumentActionProps) => {
  const address = usePublishedAddress(props)
  const toast = useToast()

  const description: DocumentActionDescription = {
    label: 'Copy link',
    icon: CopyIcon,
    disabled: !address,
    title: address ? `Copy ${address.url}` : UNPUBLISHED_HINT,
    onHandle: () => {
      if (!address) return
      navigator.clipboard.writeText(address.url).then(
        () => {
          toast.push({ status: 'success', title: 'Link copied', description: address.url })
        },
        () => {
          // Blocked clipboard (an insecure origin, or a denied permission): show it to copy by hand.
          toast.push({
            status: 'warning',
            title: 'Could not copy the link',
            description: address.url,
          })
        },
      )
    },
  }
  return description
}
CopyPageLink.action = 'copyPageLink' as DocumentActionComponent['action']
CopyPageLink.displayName = 'CopyPageLinkAction'

export const DownloadQrCode: DocumentActionComponent = (props: DocumentActionProps) => {
  const address = usePublishedAddress(props)
  const [open, setOpen] = useState(false)
  const [trackScans, setTrackScans] = useState(true)

  const description: DocumentActionDescription = {
    label: 'Download QR code',
    icon: DownloadIcon,
    disabled: !address,
    title: address ? 'Download a QR code for this page' : UNPUBLISHED_HINT,
    onHandle: () => {
      setOpen(true)
    },
    dialog: open &&
      address && {
        type: 'dialog',
        header: 'QR code',
        width: 'small',
        onClose: () => {
          setOpen(false)
        },
        content: (
          <QrDialogContent
            url={address.url}
            slug={address.slug}
            trackScans={trackScans}
            onTrackScansChange={setTrackScans}
          />
        ),
      },
  }
  return description
}
DownloadQrCode.action = 'downloadQrCode' as DocumentActionComponent['action']
DownloadQrCode.displayName = 'DownloadQrCodeAction'

function QrDialogContent({
  url,
  slug,
  trackScans,
  onTrackScansChange,
}: {
  url: string
  slug: string
  trackScans: boolean
  onTrackScansChange: (value: boolean) => void
}) {
  const toast = useToast()
  const payload = qrPayload(url, { trackScans })
  const matrix = useMemo(() => qrMatrix(payload), [payload])
  const svg = useMemo(() => qrSvg(matrix, SITE_COLOURS, `QR code for ${url}`), [matrix, url])

  const downloadSvg = () => {
    download(new Blob([svg], { type: 'image/svg+xml' }), qrFileName(slug, 'svg'))
  }
  const downloadPng = () => {
    drawPng(matrix, SITE_COLOURS).then(
      (blob) => {
        download(blob, qrFileName(slug, 'png'))
      },
      () => {
        toast.push({
          status: 'warning',
          title: 'Could not make the PNG',
          description: 'Try the SVG.',
        })
      },
    )
  }

  return (
    <Stack gap={4}>
      <Flex justify="center">
        <Card border radius={2} padding={0} style={{ width: 240, lineHeight: 0 }}>
          {/* A data URL, not inline markup: the code is a picture, not content. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- Studio, and an SVG data URL */}
          <img
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
            alt={`QR code for ${url}`}
            width={240}
            height={240}
            style={{ display: 'block', width: '100%', height: 'auto' }}
          />
        </Card>
      </Flex>
      <Flex align="center" gap={2} as="label">
        <Checkbox
          checked={trackScans}
          onChange={(event) => {
            onTrackScansChange(event.currentTarget.checked)
          }}
        />
        <Box>
          <Text size={1}>Count scans in analytics (adds utm_source=qr)</Text>
        </Box>
      </Flex>
      <Text size={1} muted style={{ overflowWrap: 'anywhere' }}>
        Opens {payload}
      </Text>
      <Flex gap={2} justify="flex-end">
        <Button text="Download SVG" mode="ghost" icon={DownloadIcon} onClick={downloadSvg} />
        <Button text="Download PNG" tone="primary" icon={DownloadIcon} onClick={downloadPng} />
      </Flex>
      <Text size={1} muted>
        Use the SVG for print: it stays sharp at any size. Print it at least 2 cm wide and test it
        with a phone before it goes to press. If you change the page&apos;s address, download a new
        code.
      </Text>
    </Stack>
  )
}

/** A PNG of the code, drawn module by module at a whole number of pixels per module so edges stay sharp. */
function drawPng(matrix: boolean[][], colours: QrColours): Promise<Blob> {
  const quietZone = 4
  const total = matrix.length + quietZone * 2
  const scale = Math.max(1, Math.floor(PNG_TARGET_SIZE / total))
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = total * scale
  const context = canvas.getContext('2d')
  if (!context) return Promise.reject(new Error('No canvas'))
  context.fillStyle = colours.background
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = colours.foreground
  matrix.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) context.fillRect((x + quietZone) * scale, (y + quietZone) * scale, scale, scale)
    })
  })
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('No image'))
    }, 'image/png')
  })
}

function download(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => {
    URL.revokeObjectURL(href)
  }, 1000)
}

/** Adds the two actions to pages; other types are left as they were. */
export const pageLinkActions: DocumentActionsResolver = (prev, { schemaType }) =>
  PAGE_LINK_TYPES.has(schemaType) ? [...prev, CopyPageLink, DownloadQrCode] : prev
