import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { useAssetsSubscription } from '../lib/useAssetsSubscription'
import { IconAlertTriangle } from './Icons'

function countMissingNewPropertyNumber(assets) {
  return assets.filter((a) => !String(a.newPropertyNumber ?? '').trim()).length
}

/**
 * Floating reminder of assets without a New Property Number (same rule as import validation).
 * Uses a dedicated subscription so the count stays current without wiring every page through context.
 */
export default function MissingNewPropertyNumberFab() {
  const { userRegion } = useAuth() || {}
  const { assets, loading } = useAssetsSubscription(userRegion, undefined)

  const missingCount = useMemo(() => countMissingNewPropertyNumber(assets), [assets])

  if (loading || missingCount === 0) return null

  return (
    <Link
      to="/"
      className="missing-npn-fab"
      title="Open Dashboard to review and edit assets"
      aria-label={`${missingCount} assets are missing a New Property Number. Go to Dashboard.`}
    >
      <span className="missing-npn-fab-icon" aria-hidden>
        <IconAlertTriangle />
      </span>
      <span className="missing-npn-fab-text">
        <strong className="missing-npn-fab-count">{missingCount}</strong>
        <span className="missing-npn-fab-label">
          {missingCount === 1 ? 'asset is' : 'assets are'} missing <span className="missing-npn-fab-npn">New Property No.</span>
        </span>
      </span>
    </Link>
  )
}
