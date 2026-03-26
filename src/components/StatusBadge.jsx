import { STATUS_LABELS } from '../lib/constants'

export default function StatusBadge({ status }) {
  if (status == null || String(status).trim() === '') {
    return <span>—</span>
  }
  const key = status.toLowerCase()
  return (
    <span className={`badge badge-${key}`}>
      <span className="badge-dot" />
      {STATUS_LABELS[status] || status}
    </span>
  )
}
