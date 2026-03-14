import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { getDb } from './firebase'

export const SUBSCRIPTIONS_COLLECTION = 'subscriptions'

export const CATEGORY_OPTIONS = [
  'SOFTWARE',
  'INTERNET',
  'CLOUD',
  'COMMUNICATION',
  'SECURITY',
  'OTHER',
]

export const CATEGORY_LABELS = {
  SOFTWARE:      'Software',
  INTERNET:      'Internet / Connectivity',
  CLOUD:         'Cloud Storage / Services',
  COMMUNICATION: 'Communication & Collaboration',
  SECURITY:      'Security & Antivirus',
  OTHER:         'Other',
}

export const BILLING_CYCLE_OPTIONS = ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL']

export const BILLING_CYCLE_LABELS = {
  MONTHLY:     'Monthly',
  QUARTERLY:   'Quarterly',
  SEMI_ANNUAL: 'Semi-Annual',
  ANNUAL:      'Annual',
}

export const BILLING_CYCLE_MONTHS = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMI_ANNUAL: 6,
  ANNUAL: 12,
}

export const SUB_STATUS_OPTIONS = ['ACTIVE', 'CANCELLED']

export const EMPTY_SUB_FORM = {
  name: '',
  provider: '',
  category: 'SOFTWARE',
  plan: '',
  status: 'ACTIVE',
  billingCycle: 'ANNUAL',
  cost: '',
  seats: '',
  startDate: '',
  renewalDate: '',
  accountEmail: '',
  notes: '',
}

/**
 * Computes the display status of a subscription based on its stored status
 * and renewal date. Returns one of: ACTIVE | EXPIRING_SOON | EXPIRED | CANCELLED
 */
export function getComputedStatus(sub) {
  if (sub.status === 'CANCELLED') return 'CANCELLED'
  if (!sub.renewalDate) return 'ACTIVE'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const renewal = new Date(sub.renewalDate)
  renewal.setHours(0, 0, 0, 0)

  if (renewal < today) return 'EXPIRED'

  const soon = new Date(today)
  soon.setDate(today.getDate() + 30)
  if (renewal <= soon) return 'EXPIRING_SOON'

  return 'ACTIVE'
}

/** Normalises a subscription cost to a monthly equivalent */
export function toMonthlyRate(cost, billingCycle) {
  if (!cost) return 0
  return cost / (BILLING_CYCLE_MONTHS[billingCycle] ?? 1)
}

function fromTimestamp(ts) {
  if (ts instanceof Timestamp) return ts.toDate().toISOString()
  if (ts?.toDate) return ts.toDate().toISOString()
  return ts ?? null
}

function toSubData(docSnap) {
  if (!docSnap.exists()) return null
  const d = docSnap.data()
  return {
    id: docSnap.id,
    name: d.name ?? '',
    provider: d.provider ?? null,
    category: d.category ?? 'OTHER',
    plan: d.plan ?? null,
    status: d.status ?? 'ACTIVE',
    billingCycle: d.billingCycle ?? 'ANNUAL',
    cost: d.cost ?? null,
    seats: d.seats ?? null,
    startDate: d.startDate ?? null,
    renewalDate: d.renewalDate ?? null,
    accountEmail: d.accountEmail ?? null,
    notes: d.notes ?? null,
    createdAt: fromTimestamp(d.createdAt),
    updatedAt: fromTimestamp(d.updatedAt),
  }
}

export async function fetchSubscriptions() {
  const db = getDb()
  const col = collection(db, SUBSCRIPTIONS_COLLECTION)
  const q = query(col, orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      cost: data.cost ?? null,
      seats: data.seats ?? null,
      startDate: data.startDate ?? null,
      renewalDate: data.renewalDate ?? null,
      accountEmail: data.accountEmail ?? null,
      notes: data.notes ?? null,
      createdAt: fromTimestamp(data.createdAt),
      updatedAt: fromTimestamp(data.updatedAt),
    }
  })
}

export async function createSubscription(payload) {
  const db = getDb()
  const col = collection(db, SUBSCRIPTIONS_COLLECTION)
  const docRef = await addDoc(col, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  const snap = await getDoc(docRef)
  return toSubData(snap)
}

export async function updateSubscription(id, payload) {
  const db = getDb()
  const ref = doc(db, SUBSCRIPTIONS_COLLECTION, id)
  await updateDoc(ref, { ...payload, updatedAt: serverTimestamp() })
  const snap = await getDoc(ref)
  return toSubData(snap)
}

export async function deleteSubscription(id) {
  const db = getDb()
  await deleteDoc(doc(db, SUBSCRIPTIONS_COLLECTION, id))
}
