import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { fetchAssetById } from '../lib/api'
import { parseAssetQRPayload } from '../lib/assetQRPayload'
import {
  decodePhilFidaAssetFromImageData,
  decodePhilFidaAssetFromVideoFrame,
} from '../lib/qrDecode'
import { TYPE_LABELS, formatPHP, getAssetLifeInfo } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'

function checkSecureContext() {
  if (typeof window === 'undefined') return false
  if (window.isSecureContext) return true
  const host = window.location?.hostname || ''
  return host === 'localhost' || host === '127.0.0.1' || host === ''
}

const secureOk = checkSecureContext()

export default function ScanQR() {
  const { pathname } = useLocation()
  const isPublicScanner = pathname === '/qr'

  const [mode, setMode] = useState('idle')   // 'idle' | 'camera' | 'result'
  const [scanResult, setScanResult] = useState(null)
  /** Session-only list (this browser tab); cleared on refresh or Clear all. */
  const [scanHistory, setScanHistory] = useState([])
  const [cameraError, setCameraError] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  /** 'qr' = payload only, 'live' = merged from Firestore, 'qrStale' = live fetch failed or missing doc */
  const [resultSource, setResultSource] = useState(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const fileInputRef = useRef(null)
  const activeRef = useRef(false)  // prevents stale RAF callbacks after stop
  const frameCountRef = useRef(0)
  const lastBarcodeMsRef = useRef(0)
  const barcodeDetectorRef = useRef(null)

  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  // ── Stop camera completely ───────────────────────────────────────────
  const completeScan = useCallback(async (parsed) => {
    setScanResult(parsed)
    setResultSource('qr')
    setMode('result')

    let historySnapshot = parsed
    if (parsed?.id) {
      try {
        const live = await fetchAssetById(parsed.id)
        if (live) {
          setScanResult(live)
          setResultSource('live')
          historySnapshot = live
        } else {
          setResultSource('qrStale')
        }
      } catch {
        setResultSource('qrStale')
      }
    }

    setScanHistory((prev) => [
      {
        oldPropertyNumber: historySnapshot.assetTag ?? null,
        newPropertyNumber: historySnapshot.newPropertyNumber ?? null,
        time: new Date(),
      },
      ...prev,
    ])
  }, [])

  const stopCamera = useCallback(() => {
    activeRef.current = false
    setTorchOn(false)
    setTorchSupported(false)
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const getBarcodeDetector = useCallback(() => {
    const ref = barcodeDetectorRef
    if (ref.current === false) return null
    if (ref.current) return ref.current
    if (typeof BarcodeDetector === 'undefined') {
      ref.current = false
      return null
    }
    try {
      ref.current = new BarcodeDetector({ formats: ['qr_code'] })
    } catch {
      ref.current = false
      return null
    }
    return ref.current
  }, [])

  // ── RAF scan loop — center crop (viewfinder) + full frame; periodic grayscale; native QR API when available ──
  const scanLoop = useCallback(() => {
    if (!activeRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) {
      rafRef.current = requestAnimationFrame(scanLoop)
      return
    }

    if (video.readyState === 4 && video.videoWidth > 0) {
      frameCountRef.current += 1
      const tryGrayscale = frameCountRef.current % 4 === 0

      const detector = getBarcodeDetector()
      const now = performance.now()
      if (detector && now - lastBarcodeMsRef.current > 280) {
        lastBarcodeMsRef.current = now
        void detector.detect(video).then((codes) => {
          if (!activeRef.current) return
          for (const c of codes) {
            const raw = c.rawValue
            if (raw == null || raw === '') continue
            const asset = parseAssetQRPayload(typeof raw === 'string' ? raw : String(raw))
            if (asset) {
              activeRef.current = false
              stopCamera()
              void completeScan(asset)
              return
            }
          }
        }).catch(() => {})
      }

      const asset = decodePhilFidaAssetFromVideoFrame(
        video,
        canvas,
        parseAssetQRPayload,
        tryGrayscale,
      )
      if (asset) {
        activeRef.current = false
        stopCamera()
        void completeScan(asset)
        return
      }
    }
    rafRef.current = requestAnimationFrame(scanLoop)
  }, [stopCamera, completeScan, getBarcodeDetector])

  // ── Start the camera AFTER the video element is in the DOM ──────────
  // This useEffect runs whenever mode becomes 'camera', by which point
  // the <video> ref is already attached.
  useEffect(() => {
    if (mode !== 'camera') return
    let cancelled = false

    const init = async () => {
      try {
        let stream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          })
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
            })
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({ video: true })
          }
        }
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream

        const track = stream.getVideoTracks()[0]
        const caps = track?.getCapabilities?.()
        if (!cancelled && caps?.torch) setTorchSupported(true)

        const video = videoRef.current
        if (!video) { stream.getTracks().forEach((t) => t.stop()); return }
        video.srcObject = stream

        // Wait for video metadata so dimensions are known
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve
          video.onerror = reject
        })
        if (cancelled) return

        await video.play()
        if (cancelled) return

        frameCountRef.current = 0
        lastBarcodeMsRef.current = 0
        activeRef.current = true
        rafRef.current = requestAnimationFrame(scanLoop)
      } catch (err) {
        if (cancelled) return
        const msg = err?.message || ''
        setCameraError(
          msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')
            ? 'Camera permission denied. Allow camera access in your browser and try again.'
            : msg || 'Could not start camera. Allow camera access and try again.'
        )
        setMode('idle')
      }
    }

    init()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [mode, scanLoop, stopCamera])

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera])

  // ── File upload ─────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e?.target?.files?.[0]
    if (!file) return
    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploadError(null)
    setScanResult(null)
    setUploadLoading(true)
    try {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(bitmap, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const asset = decodePhilFidaAssetFromImageData(imageData, parseAssetQRPayload)
      if (!asset) {
        setUploadError(
          'No PhilFIDA asset QR found. Use a clear photo, avoid glare, and ensure the full code is visible. You can also try the live camera scanner.',
        )
        return
      }
      await completeScan(asset)
    } catch (err) {
      setUploadError(err?.message || 'Could not read the image. Try a clearer photo of the QR code.')
    } finally {
      setUploadLoading(false)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  const openCamera = () => {
    setCameraError(null)
    setUploadError(null)
    setScanResult(null)
    setResultSource(null)
    setMode('camera')   // renders <video>; useEffect above fires the stream
  }

  const reset = () => {
    stopCamera()
    setScanResult(null)
    setResultSource(null)
    setCameraError(null)
    setUploadError(null)
    setMode('idle')
  }

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks?.()?.[0]
    if (!track?.getCapabilities?.()?.torch) return
    try {
      const next = !torchOn
      await track.applyConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
    } catch {
      setTorchOn(false)
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Scan QR</h1>
          {isPublicScanner ? (
            <p>
              No sign-in required. Point your camera or upload a photo of a PhilFIDA asset QR (link or code).
              {' '}
              <Link to="/login">Staff sign in</Link>
              {' '}for the full dashboard and the in-app scanner under the sidebar menu.
            </p>
          ) : (
            <p>Point your camera at an asset QR code or upload an image to view asset details.</p>
          )}
        </div>
      </header>

      <section className="scan-qr-section">
        <div className="scan-qr-main">
        {/* ── Idle: choose camera or upload ── */}
        {mode === 'idle' && (
          <div className="scan-qr-start">
            {!secureOk && (
              <p className="scan-qr-insecure">
                ⚠ Camera requires <strong>https://</strong> or <strong>http://localhost</strong>.
              </p>
            )}
            <p className="scan-qr-start-heading">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h.01M14 17h3m3 0v3m-3-3v3m0-3h3"/>
              </svg>
              Choose scan method
            </p>
            <p>Select how you want to scan the asset QR code.</p>
            <div className="scan-qr-start-actions">
              {secureOk && (
                <button type="button" className="scan-qr-mode-btn" onClick={openCamera}>
                  <span className="scan-qr-mode-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                  </span>
                  <span className="scan-qr-mode-text">
                    <span className="scan-qr-mode-label">Use camera</span>
                    <span className="scan-qr-mode-sub">Live scan with device camera</span>
                  </span>
                  <span className="scan-qr-mode-arrow">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </span>
                </button>
              )}
              <label className="scan-qr-mode-btn scan-qr-mode-upload">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="scan-qr-file-input"
                  disabled={uploadLoading}
                />
                <span className="scan-qr-mode-icon">
                  {uploadLoading
                    ? <span className="auth-spinner auth-spinner-dark" />
                    : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    )}
                </span>
                <span className="scan-qr-mode-text">
                  <span className="scan-qr-mode-label">{uploadLoading ? 'Reading…' : 'Upload image'}</span>
                  <span className="scan-qr-mode-sub">Choose a QR code photo or screenshot</span>
                </span>
                <span className="scan-qr-mode-arrow">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </span>
              </label>
            </div>
            {cameraError && <p className="scan-qr-error-msg">{cameraError}</p>}
            {uploadError && <p className="scan-qr-error-msg">{uploadError}</p>}
          </div>
        )}

        {/* ── Camera live view — always in DOM when mode='camera' ── */}
        {mode === 'camera' && (
          <div className="scan-qr-camera-section">
            <div className="scan-qr-camera-wrap">
              <video
                ref={videoRef}
                className="scan-qr-video"
                playsInline
                muted
                autoPlay
              />
              <canvas ref={canvasRef} className="scan-qr-canvas-hidden" />
              <div className="scan-qr-viewfinder">
                <div className="scan-qr-viewfinder-box" />
              </div>
              <p className="scan-qr-camera-hint">
                Align the code in the square — we scan that region first, then the full picture. Hold steady and avoid glare.
              </p>
            </div>
            <div className="scan-qr-camera-actions">
              {torchSupported && (
                <button type="button" className="btn btn-primary scan-qr-torch-btn" onClick={() => void toggleTorch()}>
                  {torchOn ? 'Turn light off' : 'Low light: turn light on'}
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={reset}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Result ── */}
        {mode === 'result' && scanResult && (
          <div className="scan-qr-result">
            <div className="scan-qr-result-card">
              <div className="scan-qr-result-header">
                <span className="scan-qr-result-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <path d="m9 11 3 3L22 4" />
                  </svg>
                </span>
                <div>
                  <h2 className="scan-qr-result-title">Scanned successfully</h2>
                  <p className="scan-qr-result-subtitle">
                    {resultSource === 'live' && (
                      <>Showing the latest record from the registry — same data as on your other signed-in devices.</>
                    )}
                    {resultSource === 'qr' && (
                      <>Information from the QR code.</>
                    )}
                    {resultSource === 'qrStale' && (
                      <>Using the QR snapshot; live lookup failed or the asset is no longer in the registry. Check your connection or open the asset from the dashboard.</>
                    )}
                  </p>
                </div>
              </div>

              <div className="scan-qr-result-hero">
                <div className="scan-qr-result-name">{scanResult.name || 'Unnamed asset'}</div>
                <div className="scan-qr-result-ids">
                  {scanResult.assetTag && (
                    <span className="scan-qr-result-id"><strong>Old #</strong> {scanResult.assetTag}</span>
                  )}
                  {scanResult.newPropertyNumber && (
                    <span className="scan-qr-result-id"><strong>New #</strong> {scanResult.newPropertyNumber}</span>
                  )}
                </div>
              </div>

              <div className="scan-qr-result-sections">
                <section className="scan-qr-result-section">
                  <h3>Identification</h3>
                  <dl className="scan-qr-result-dl">
                    {scanResult.serialNumber && <div><dt>Serial number</dt><dd>{scanResult.serialNumber}</dd></div>}
                    <div><dt>Type</dt><dd>{TYPE_LABELS[scanResult.type] || scanResult.type || '—'}</dd></div>
                    {scanResult.subtype && <div><dt>Subtype</dt><dd>{scanResult.subtype}</dd></div>}
                    <div><dt>Status</dt><dd><StatusBadge status={scanResult.status} /></dd></div>
                  </dl>
                </section>

                <section className="scan-qr-result-section">
                  <h3>Assignment & location</h3>
                  <dl className="scan-qr-result-dl">
                    <div><dt>Issued to</dt><dd>{scanResult.issuedTo || '—'}</dd></div>
                    <div><dt>Location</dt><dd>{scanResult.location || '—'}</dd></div>
                    <div><dt>Region</dt><dd>{scanResult.region ? `Region ${scanResult.region}` : '—'}</dd></div>
                  </dl>
                </section>

                <section className="scan-qr-result-section">
                  <h3>Acquisition & value</h3>
                  <dl className="scan-qr-result-dl">
                    <div>
                      <dt>Year of acquisition</dt>
                      <dd>
                        {scanResult.yearOfAcquisition ? (
                          (() => {
                            const info = getAssetLifeInfo(scanResult.yearOfAcquisition)
                            if (!info) return scanResult.yearOfAcquisition
                            const { age, yearsLeft, forReplacement } = info
                            return (
                              <>
                                {scanResult.yearOfAcquisition}
                                <span className="scan-qr-life-hint">
                                  {' · '}{age} yr{age !== 1 ? 's' : ''} in service
{forReplacement
                                      ? <> · For Replacement</>
                                      : <> · {yearsLeft} yr{yearsLeft !== 1 ? 's' : ''} left before 5-yr life</>}
                                </span>
                              </>
                            )
                          })()
                        ) : '—'}
                      </dd>
                    </div>
                    <div><dt>Total value</dt><dd className="scan-qr-result-value">{formatPHP(scanResult.value)}</dd></div>
                    {scanResult.quantityPerPropertyCard != null && (
                      <div><dt>Qty (property card)</dt><dd>{scanResult.quantityPerPropertyCard}</dd></div>
                    )}
                    {scanResult.quantityPerPhysicalCount != null && (
                      <div><dt>Qty (physical count)</dt><dd>{scanResult.quantityPerPhysicalCount}</dd></div>
                    )}
                  </dl>
                </section>
              </div>

              {scanResult.notes && (
                <div className="scan-qr-result-notes">
                  <h3>Notes</h3>
                  <p>{scanResult.notes}</p>
                </div>
              )}

              <div className="scan-qr-result-actions">
                <button type="button" className="btn btn-primary" onClick={openCamera}>
                  Scan another with camera
                </button>
                <button type="button" className="btn btn-ghost" onClick={reset}>
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        </div>

        {/* ── History panel: finished scans (Old & New property numbers only) ── */}
        <aside className="scan-qr-history-panel">
          <div className="scan-qr-history-head">
            <div className="scan-qr-history-head-left">
              <span className="scan-qr-history-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
                </svg>
              </span>
              <h2 className="scan-qr-history-title">Scan history</h2>
              {scanHistory.length > 0 && (
                <span className="scan-qr-history-count">{scanHistory.length}</span>
              )}
            </div>
            {scanHistory.length > 0 && (
              <button type="button" className="scan-qr-history-clear" onClick={() => setScanHistory([])}>
                Clear all
              </button>
            )}
          </div>
          <div className="scan-qr-history-body">
            {scanHistory.length === 0 ? (
              <div className="scan-qr-history-empty">
                <span className="scan-qr-history-empty-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h.01M14 17h3m3 0v3m-3-3v3m0-3h3"/>
                  </svg>
                </span>
                <span>No scans yet.<br/>Scan a QR to see history.</span>
              </div>
            ) : (
              <ul className="scan-qr-history-list">
                {scanHistory.map((entry, i) => (
                  <li key={i} className="scan-qr-history-item">
                    <div className="scan-qr-history-item-top">
                      <span className="scan-qr-history-index">{scanHistory.length - i}</span>
                      <span className="scan-qr-history-ts">
                        {entry.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div className="scan-qr-history-fields">
                      <div className="scan-qr-history-field">
                        <span className="scan-qr-history-label">Old property no.</span>
                        <span className={`scan-qr-history-value${!entry.oldPropertyNumber ? ' is-empty' : ''}`}>
                          {entry.oldPropertyNumber || '—'}
                        </span>
                      </div>
                      <div className="scan-qr-history-field">
                        <span className="scan-qr-history-label">New property no.</span>
                        <span className={`scan-qr-history-value${!entry.newPropertyNumber ? ' is-empty' : ''}`}>
                          {entry.newPropertyNumber || '—'}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </section>
    </>
  )
}
