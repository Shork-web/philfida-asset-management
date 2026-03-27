import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchAssetById } from '../lib/api'
import { TYPE_LABELS, formatPHP, getAssetLifeInfo } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'

export default function PublicAssetView() {
  const { assetId: rawId } = useParams()
  const assetId = rawId ? decodeURIComponent(rawId).trim() : ''
  const missingId = !assetId

  const [asset, setAsset] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [printTimestamp, setPrintTimestamp] = useState(null)

  const handlePrintRecord = useCallback(() => {
    const ts = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    setPrintTimestamp(ts)
    window.setTimeout(() => {
      window.print()
    }, 150)
  }, [])

  useEffect(() => {
    if (missingId) return undefined
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setPrintTimestamp(null)
      setLoading(true)
      setError(null)
      setAsset(null)
      void fetchAssetById(assetId)
        .then((data) => {
          if (cancelled) return
          if (!data) {
            setError('notfound')
            setAsset(null)
          } else {
            setAsset(data)
          }
        })
        .catch((err) => {
          if (cancelled) return
          const code = err?.code
          if (code === 'permission-denied' || code === 'missing-or-insufficient-permissions') {
            setError('permission')
          } else {
            setError('failed')
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    })
    return () => { cancelled = true }
  }, [assetId, missingId])

  return (
    <div className="public-asset-page">
      <header className={`public-asset-header${asset ? ' scan-qr-no-print' : ''}`}>
        <div className="public-asset-brand">
          <span className="public-asset-brand-mark" aria-hidden />
          <div>
            <h1 className="public-asset-brand-title">PhilFIDA</h1>
            <p className="public-asset-brand-sub">Asset record (read-only)</p>
          </div>
        </div>
        <div className="public-asset-header-actions">
          <Link to="/qr" className="public-asset-header-secondary">
            Scan a QR
          </Link>
          <Link to="/login" className="public-asset-signin-link">
            Staff sign in
          </Link>
        </div>
      </header>

      <main className="public-asset-main">
        {missingId && (
          <div className="public-asset-state public-asset-state-error">
            <p>This link is missing a valid asset id.</p>
          </div>
        )}

        {!missingId && loading && (
          <div className="public-asset-state">
            <span className="auth-spinner auth-spinner-dark" aria-hidden />
            <p>Loading asset…</p>
          </div>
        )}

        {!missingId && !loading && error === 'notfound' && (
          <div className="public-asset-state public-asset-state-error">
            <p>No asset was found for this link. It may have been removed or the link may be incorrect.</p>
          </div>
        )}

        {!missingId && !loading && error === 'permission' && (
          <div className="public-asset-state public-asset-state-error">
            <p>
              This page could not read the asset while signed out. Your Firebase project must allow
              unauthenticated <strong>single-document</strong> reads on <code className="public-asset-code">assets</code>
              (rule: <code className="public-asset-code">allow get: if true</code> on <code className="public-asset-code">{'assets/{assetId}'}</code>),
              then run <code className="public-asset-code">firebase deploy --only firestore:rules</code>.
            </p>
            <p className="public-asset-retry-hint">
              If you are signed in elsewhere in this browser, try <Link to="/login">opening the full app</Link> — or use{' '}
              <Link to="/qr">Scan a QR</Link> without an account after rules are deployed.
            </p>
          </div>
        )}

        {!missingId && !loading && error === 'failed' && (
          <div className="public-asset-state public-asset-state-error">
            <p>Could not load this record. Check your connection and try again.</p>
          </div>
        )}

        {!missingId && !loading && asset && (
          <article className="public-asset-card scan-qr-print-area">
            <div className="scan-qr-print-only scan-qr-print-dochead">PhilFIDA — Public asset record</div>
            {printTimestamp && (
              <p className="scan-qr-print-only scan-qr-print-meta">Printed {printTimestamp}</p>
            )}
            <div className="public-asset-hero">
              <h2 className="public-asset-name">{asset.name || 'Unnamed asset'}</h2>
              <div className="public-asset-ids">
                {asset.assetTag && (
                  <span className="public-asset-id-pill"><strong>Old #</strong> {asset.assetTag}</span>
                )}
                {asset.newPropertyNumber && (
                  <span className="public-asset-id-pill"><strong>New #</strong> {asset.newPropertyNumber}</span>
                )}
              </div>
            </div>

            <div className="public-asset-sections">
              <section className="public-asset-section">
                <h3>Identification</h3>
                <dl className="public-asset-dl">
                  {asset.serialNumber && <div><dt>Serial number</dt><dd>{asset.serialNumber}</dd></div>}
                  {asset.description && <div><dt>Description</dt><dd>{asset.description}</dd></div>}
                  <div><dt>Type</dt><dd>{TYPE_LABELS[asset.type] || asset.type || '—'}</dd></div>
                  {asset.subtype && <div><dt>Subtype</dt><dd>{asset.subtype}</dd></div>}
                  <div><dt>Status</dt><dd><StatusBadge status={asset.status} /></dd></div>
                </dl>
              </section>

              <section className="public-asset-section">
                <h3>Assignment & location</h3>
                <dl className="public-asset-dl">
                  <div><dt>Issued to</dt><dd>{asset.issuedTo || '—'}</dd></div>
                  <div><dt>Location</dt><dd>{asset.location || '—'}</dd></div>
                  <div><dt>Region</dt><dd>{asset.region ? `Region ${asset.region}` : '—'}</dd></div>
                </dl>
              </section>

              <section className="public-asset-section">
                <h3>Acquisition & value</h3>
                <dl className="public-asset-dl">
                  <div>
                    <dt>Year of acquisition</dt>
                    <dd>
                      {asset.yearOfAcquisition ? (
                        (() => {
                          const info = getAssetLifeInfo(asset.yearOfAcquisition)
                          if (!info) return asset.yearOfAcquisition
                          const { age, yearsLeft, forReplacement } = info
                          return (
                            <>
                              {asset.yearOfAcquisition}
                              <span className="public-asset-life-hint">
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
                  <div><dt>Total value</dt><dd className="public-asset-value">{formatPHP(asset.value)}</dd></div>
                  {asset.quantityPerPropertyCard != null && (
                    <div><dt>Qty (property card)</dt><dd>{asset.quantityPerPropertyCard}</dd></div>
                  )}
                  {asset.quantityPerPhysicalCount != null && (
                    <div><dt>Qty (physical count)</dt><dd>{asset.quantityPerPhysicalCount}</dd></div>
                  )}
                </dl>
              </section>
            </div>

            {asset.notes && (
              <div className="public-asset-notes">
                <h3>Notes</h3>
                <p>{asset.notes}</p>
              </div>
            )}

            <div className="scan-qr-result-actions scan-qr-no-print">
              <button type="button" className="btn btn-ghost scan-qr-print-action" onClick={handlePrintRecord}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M6 9V2h12v7" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" rx="1" />
                </svg>
                Print
              </button>
            </div>

            <p className="public-asset-footnote">
              Information reflects the registry at load time. For corrections, contact your PhilFIDA administrator.
            </p>
          </article>
        )}
      </main>
    </div>
  )
}
