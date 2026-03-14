import { STATUS_LABELS } from '../lib/constants'

export default function StatusBadge({ status }) {
  const key = status.toLowerCase()
  return (
    <span className={`badge badge-${key}`}>
      <span className="badge-dot" />
      {STATUS_LABELS[status] || status}
    </span>
  )
}
