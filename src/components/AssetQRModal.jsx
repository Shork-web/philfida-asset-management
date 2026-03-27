import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { getAssetPublicPageUrl, getAssetQRPayload } from '../lib/assetQRPayload'
import { IconX } from './Icons'

const QR_SIZE = 360
const QR_BASE_OPTIONS = { width: QR_SIZE, margin: 3, errorCorrectionLevel: 'L' }

/**
 * Word-wrap for canvas: returns lines that fit within maxWidth (px).
 * Long unbroken tokens are split character-by-character.
 */
function wrapCanvasText(ctx, text, maxWidth) {
  const t = String(text || '').trim() || '—'
  const words = t.split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''

  const pushLongToken = (token) => {
    let chunk = ''
    for (const ch of token) {
      const next = chunk + ch
      if (ctx.measureText(next).width <= maxWidth) chunk = next
      else {
        if (chunk) lines.push(chunk)
        chunk = ch
      }
    }
    return chunk
  }

  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word
    if (ctx.measureText(attempt).width <= maxWidth) {
      line = attempt
    } else {
      if (line) lines.push(line)
      if (ctx.measureText(word).width <= maxWidth) {
        line = word
      } else {
        line = pushLongToken(word)
      }
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['—']
}

// Render QR + name + issued-to onto a canvas, return as data URL
async function buildLabeledQR(asset, qrDataUrl) {
  const name = asset.name || 'Unnamed Asset'
  const issuedTo = asset.issuedTo ? `Issued to: ${asset.issuedTo}` : null
  const propNum = asset.assetTag || asset.newPropertyNumber || ''

  const PADDING = 20
  const LABEL_GAP = 14
  const NAME_SIZE = 18
  const SUB_SIZE = 14
  const NAME_LINE_H = 24
  const SUB_LINE_H = 20

  const W = QR_SIZE + PADDING * 2
  const textMaxW = Math.max(120, W - PADDING * 2)

  const canvas = document.createElement('canvas')
  canvas.width = W
  // Temporary height; resized after measuring wrapped lines
  canvas.height = 800
  const ctx = canvas.getContext('2d')
  if (!ctx) return qrDataUrl

  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  ctx.font = `700 ${NAME_SIZE}px system-ui, sans-serif`
  const nameLines = wrapCanvasText(ctx, name, textMaxW)

  let propLines = []
  if (propNum) {
    ctx.font = `500 ${SUB_SIZE}px system-ui, sans-serif`
    propLines = wrapCanvasText(ctx, propNum, textMaxW)
  }

  let issuedLines = []
  if (issuedTo) {
    ctx.font = `500 ${SUB_SIZE}px system-ui, sans-serif`
    issuedLines = wrapCanvasText(ctx, issuedTo, textMaxW)
  }

  const labelBlockH =
    nameLines.length * NAME_LINE_H
    + (propLines.length ? LABEL_GAP / 2 + propLines.length * SUB_LINE_H : 0)
    + (issuedLines.length ? LABEL_GAP / 2 + issuedLines.length * SUB_LINE_H : 0)

  const extraH = PADDING + labelBlockH + PADDING
  const H = QR_SIZE + LABEL_GAP + extraH

  canvas.height = H
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  const img = new Image()
  await new Promise((res) => { img.onload = res; img.src = qrDataUrl })
  ctx.drawImage(img, PADDING, 0, QR_SIZE, QR_SIZE)

  let y = QR_SIZE + LABEL_GAP + PADDING / 2
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  ctx.font = `700 ${NAME_SIZE}px system-ui, sans-serif`
  ctx.fillStyle = '#111827'
  for (const row of nameLines) {
    ctx.fillText(row, W / 2, y)
    y += NAME_LINE_H
  }

  if (propLines.length) {
    y += 4
    ctx.font = `500 ${SUB_SIZE}px system-ui, sans-serif`
    ctx.fillStyle = '#4b5563'
    for (const row of propLines) {
      ctx.fillText(row, W / 2, y)
      y += SUB_LINE_H
    }
  }

  if (issuedLines.length) {
    y += 4
    ctx.font = `500 ${SUB_SIZE}px system-ui, sans-serif`
    ctx.fillStyle = '#166534'
    for (const row of issuedLines) {
      ctx.fillText(row, W / 2, y)
      y += SUB_LINE_H
    }
  }

  return canvas.toDataURL('image/png')
}

export default function AssetQRModal({ asset, onClose }) {
  const [qrUrl, setQrUrl] = useState(null)
  const [labeledUrl, setLabeledUrl] = useState(null)
  const [error, setError] = useState(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!asset) return
    const payload = getAssetQRPayload(asset)
    if (!payload) { setError('Asset has no ID'); return }
    const qrOptions = {
      ...QR_BASE_OPTIONS,
      // URLs are longer than JSON; slightly higher ECC helps damaged prints.
      errorCorrectionLevel: payload.length > 72 ? 'M' : 'L',
    }
    QRCode.toDataURL(payload, qrOptions)
      .then(async (url) => {
        setQrUrl(url)
        try {
          const labeled = await buildLabeledQR(asset, url)
          setLabeledUrl(labeled)
        } catch {
          setLabeledUrl(url) // fallback: just the QR
        }
      })
      .catch((err) => setError(err?.message || 'Failed to generate QR code'))
  }, [asset])

  const handleDownload = async () => {
    if (!asset) return
    setDownloading(true)
    try {
      const url = labeledUrl || qrUrl
      const tag = (asset.assetTag || asset.id || 'asset').replace(/[^a-zA-Z0-9-_]/g, '_')
      const a = document.createElement('a')
      a.href = url
      a.download = `PhilFIDA_Asset_${tag}.png`
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  const displayLabel = asset?.assetTag || asset?.name || 'Asset'
  const publicUrl = asset ? getAssetPublicPageUrl(asset) : ''

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal asset-qr-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 title={asset?.name || asset?.assetTag || displayLabel}>QR Code — {displayLabel}</h3>
          <button className="btn-icon" onClick={onClose} type="button" aria-label="Close">
            <IconX />
          </button>
        </div>

        <div className="modal-body asset-qr-body">
          {error && <p className="asset-qr-error">{error}</p>}

          {qrUrl && !error && (
            <div className="asset-qr-card">
              <div className="asset-qr-wrap">
                <img
                  src={qrUrl}
                  alt={`QR code for ${displayLabel}`}
                  width={QR_SIZE}
                  height={QR_SIZE}
                  style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                />
              </div>

              <div className="asset-qr-label">
                <p className="asset-qr-name">{asset.name || 'Unnamed Asset'}</p>
                {(asset.assetTag || asset.newPropertyNumber) && (
                  <p className="asset-qr-propnum">{asset.assetTag || asset.newPropertyNumber}</p>
                )}
                {asset.issuedTo && (
                  <p className="asset-qr-issued">Issued to: <strong>{asset.issuedTo}</strong></p>
                )}
              </div>

              <p className="asset-qr-hint">
                {publicUrl
                  ? <>Opens a read-only asset page in the browser. In-app scan still works. Set <code className="asset-qr-code-inline">VITE_PUBLIC_APP_URL</code> for production so links match your live site.</>
                  : <>No public base URL — QR encodes JSON for in-app scanning only. Set <code className="asset-qr-code-inline">VITE_PUBLIC_APP_URL</code> to use shareable links.</>}
                {' '}The PNG adds name and issued-to under the code for humans only.
              </p>
              {publicUrl && (
                <p className="asset-qr-url-line" title={publicUrl}>
                  <span className="asset-qr-url-label">Link</span>
                  <span className="asset-qr-url-text">{publicUrl}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
          {qrUrl && (
            <button type="button" className="btn btn-primary" onClick={handleDownload} disabled={downloading}>
              {downloading ? 'Preparing…' : 'Download PNG'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
