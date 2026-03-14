import { useState } from 'react'
import { createSubscription, updateSubscription } from '../lib/subscriptionsApi'
import {
  CATEGORY_OPTIONS, CATEGORY_LABELS,
  BILLING_CYCLE_OPTIONS, BILLING_CYCLE_LABELS,
  SUB_STATUS_OPTIONS, EMPTY_SUB_FORM,
} from '../lib/subscriptionsApi'
import { IconX } from './Icons'

function FormSection({ title, children, columns = 2 }) {
  return (
    <div className="af-section">
      <p className="af-section-title">{title}</p>
      <div className="af-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {children}
      </div>
    </div>
  )
}

const STATUS_LABELS = { ACTIVE: 'Active', CANCELLED: 'Cancelled' }

export default function SubscriptionFormModal({ subscription, onClose, onSaved, toast }) {
  const isEdit = Boolean(subscription)

  const [form, setForm] = useState(
    subscription
      ? {
          name:          subscription.name,
          provider:      subscription.provider || '',
          category:      subscription.category,
          plan:          subscription.plan || '',
          status:        subscription.status,
          billingCycle:  subscription.billingCycle,
          cost:          subscription.cost != null ? String(subscription.cost) : '',
          seats:         subscription.seats != null ? String(subscription.seats) : '',
          startDate:     subscription.startDate || '',
          renewalDate:   subscription.renewalDate || '',
          accountEmail:  subscription.accountEmail || '',
          notes:         subscription.notes || '',
        }
      : { ...EMPTY_SUB_FORM },
  )
  const [saving, setSaving] = useState(false)

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name:         form.name.trim(),
      provider:     form.provider.trim() || null,
      category:     form.category,
      plan:         form.plan.trim() || null,
      status:       form.status,
      billingCycle: form.billingCycle,
      cost:         form.cost ? Number(form.cost) : null,
      seats:        form.seats ? Number(form.seats) : null,
      startDate:    form.startDate || null,
      renewalDate:  form.renewalDate || null,
      accountEmail: form.accountEmail.trim() || null,
      notes:        form.notes.trim() || null,
    }

    try {
      if (isEdit) {
        await updateSubscription(subscription.id, payload)
        toast(`"${payload.name}" updated`, 'success')
      } else {
        await createSubscription(payload)
        toast(`"${payload.name}" added`, 'success')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast(err.message || 'Could not save subscription.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal modal-wide" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{isEdit ? 'Edit Subscription' : 'New Subscription'}</h3>
          <button className="btn-icon" onClick={onClose} type="button"><IconX /></button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="modal-body">

            {/* ── Subscription Info ── */}
            <FormSection title="Subscription Info" columns={2}>
              <div className="form-group">
                <label htmlFor="sf-name">Name <span className="af-required">*</span></label>
                <input
                  id="sf-name" name="name"
                  placeholder="e.g. Microsoft 365"
                  value={form.name} onChange={onChange} required
                />
              </div>
              <div className="form-group">
                <label htmlFor="sf-provider">Provider <span className="af-optional">Optional</span></label>
                <input
                  id="sf-provider" name="provider"
                  placeholder="e.g. Microsoft"
                  value={form.provider} onChange={onChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="sf-category">Category</label>
                <select id="sf-category" name="category" value={form.category} onChange={onChange}>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="sf-plan">Plan / Tier <span className="af-optional">Optional</span></label>
                <input
                  id="sf-plan" name="plan"
                  placeholder="e.g. Business Standard"
                  value={form.plan} onChange={onChange}
                />
              </div>
            </FormSection>

            {/* ── Billing ── */}
            <FormSection title="Billing" columns={2}>
              <div className="form-group">
                <label htmlFor="sf-billingCycle">Billing Cycle</label>
                <select id="sf-billingCycle" name="billingCycle" value={form.billingCycle} onChange={onChange}>
                  {BILLING_CYCLE_OPTIONS.map((b) => (
                    <option key={b} value={b}>{BILLING_CYCLE_LABELS[b]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="sf-cost">Cost (PHP) <span className="af-optional">per cycle</span></label>
                <input
                  id="sf-cost" name="cost"
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.cost} onChange={onChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="sf-seats">Seats / Licenses <span className="af-optional">Optional</span></label>
                <input
                  id="sf-seats" name="seats"
                  type="number" min="1" placeholder="e.g. 10"
                  value={form.seats} onChange={onChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="sf-status">Status</label>
                <select id="sf-status" name="status" value={form.status} onChange={onChange}>
                  {SUB_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </FormSection>

            {/* ── Dates ── */}
            <FormSection title="Dates" columns={2}>
              <div className="form-group">
                <label htmlFor="sf-startDate">Start Date <span className="af-optional">Optional</span></label>
                <input
                  id="sf-startDate" name="startDate"
                  type="date" value={form.startDate} onChange={onChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="sf-renewalDate">Renewal / Expiry Date <span className="af-optional">Optional</span></label>
                <input
                  id="sf-renewalDate" name="renewalDate"
                  type="date" value={form.renewalDate} onChange={onChange}
                />
              </div>
            </FormSection>

            {/* ── Account ── */}
            <FormSection title="Account" columns={1}>
              <div className="form-group">
                <label htmlFor="sf-accountEmail">Account Email <span className="af-optional">Optional</span></label>
                <input
                  id="sf-accountEmail" name="accountEmail"
                  type="email" placeholder="e.g. admin@philfida.gov.ph"
                  value={form.accountEmail} onChange={onChange}
                />
              </div>
            </FormSection>

            {/* ── Notes ── */}
            <div className="af-section">
              <p className="af-section-title">Notes</p>
              <div className="form-group">
                <textarea
                  id="sf-notes" name="notes"
                  rows="2" placeholder="Optional notes or remarks..."
                  value={form.notes} onChange={onChange}
                />
              </div>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
