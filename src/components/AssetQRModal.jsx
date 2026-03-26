import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { getAssetQRPayload } from '../lib/assetQRPayload'
import { IconX } from './Icons'

// Larger canvas + low ECC: fewer, bigger modules — easier for phone cameras (payload is tiny JSON).
const QR_SIZE = 360
const QR_OPTIONS = { width: QR_SIZE, margin: 3, errorCorrectionLevel: 'L' }

// Render QR + name + issued-to onto a canvas, return as data URL
async function buildLabeledQR(asset, qrDataUrl) {
  const name = asset.name || 'Unnamed Asset'
  const issuedTo = asset.issuedTo ? `Issued to: ${asset.issuedTo}` : null
  const propNum = asset.assetTag || asset.newPropertyNumber || ''

  const PADDING = 20
  const LABEL_GAP = 14
  const NAME_SIZE = 18
  const SUB_SIZE = 14
  const lineH = 22

  // Calculate canvas height
  let extraH = PADDING + NAME_SIZE + lineH // always: name
  if (propNum) extraH += lineH             // property number
  if (issuedTo) extraH += lineH            // issued-to
  extraH += PADDING

  const W = QR_SIZE + PADDING * 2
  const H = QR_SIZE + extraH

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // QR image
  const img = new Image()
  await new Promise((res) => { img.onload = res; img.src = qrDataUrl })
  ctx.drawImage(img, PADDING, 0, QR_SIZE, QR_SIZE)

  // Labels below QR
  let y = QR_SIZE + LABEL_GAP

  ctx.textAlign = 'center'
  ctx.fillStyle = '#111827'
  ctx.font = `700 ${NAME_SIZE}px system-ui, sans-serif`
  ctx.fillText(name, W / 2, y)
  y += lineH

  if (propNum) {
    ctx.font = `500 ${SUB_SIZE}px system-ui, sans-serif`
    ctx.fillStyle = '#4b5563'
    ctx.fillText(propNum, W / 2, y)
    y += lineH
  }

  if (issuedTo) {
    ctx.font = `500 ${SUB_SIZE}px system-ui, sans-serif`
    ctx.fillStyle = '#166534'
    ctx.fillText(issuedTo, W / 2, y)
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
    QRCode.toDataURL(payload, QR_OPTIONS)
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

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal asset-qr-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>QR Code — {displayLabel}</h3>
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

              <p className="asset-qr-hint">Scan in this app to load the latest asset record. The PNG adds name and issued-to below the code for humans only.</p>
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
