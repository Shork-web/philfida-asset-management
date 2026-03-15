/**
 * Region-based master keys for sign-up.
 * Use VITE_MASTER_KEYS as JSON: {"7":"PhilFIDA7","8":"Region8Key"}
 * Use VITE_VIEWER_KEYS as JSON: {"7":"ViewFIDA7","8":"ViewFIDA8"}
 * Or keep VITE_SIGNUP_MASTER_KEY for a single legacy key.
 */

const RAW = (import.meta.env.VITE_MASTER_KEYS || '').trim()
const LEGACY_KEY = (import.meta.env.VITE_SIGNUP_MASTER_KEY || '').trim()
const SUPER_ADMIN_KEY = (import.meta.env.VITE_SUPER_ADMIN_MASTER_KEY || '').trim()
const VIEWER_RAW = (import.meta.env.VITE_VIEWER_KEYS || '').trim()

/** @type {Record<string, string>} region id -> key */
let _parsed = null
let _viewerParsed = null

function parseJson(str) {
  if (!str) return null
  try {
    const obj = JSON.parse(str)
    return typeof obj === 'object' && obj !== null ? obj : null
  } catch {
    return null
  }
}

function parse() {
  if (_parsed !== null) return _parsed
  let obj = parseJson(RAW)
  if (!obj && RAW) {
    const stripped = RAW.replace(/^["']|["']$/g, '').trim()
    obj = parseJson(stripped)
  }
  if (obj && Object.keys(obj).length > 0) {
    _parsed = obj
  } else {
    _parsed = LEGACY_KEY ? { all: LEGACY_KEY } : {}
  }
  return _parsed
}

function parseViewer() {
  if (_viewerParsed !== null) return _viewerParsed
  let obj = parseJson(VIEWER_RAW)
  if (!obj && VIEWER_RAW) {
    const stripped = VIEWER_RAW.replace(/^["']|["']$/g, '').trim()
    obj = parseJson(stripped)
  }
  _viewerParsed = (obj && Object.keys(obj).length > 0) ? obj : {}
  return _viewerParsed
}

/** Returns true if at least one admin master key is configured. */
export function isSignUpEnabled() {
  const keys = parse()
  return Object.keys(keys).length > 0 || !!SUPER_ADMIN_KEY
}

/** Returns true if at least one viewer key is configured. */
export function isViewerSignupEnabled() {
  return Object.keys(parseViewer()).length > 0
}

/** Returns true if the given key is the one-time Super Admin key. */
export function isSuperAdminKey(key) {
  const trimmed = (key || '').trim()
  return !!SUPER_ADMIN_KEY && SUPER_ADMIN_KEY === trimmed
}

/**
 * If the given key matches a region's admin master key, returns that region id.
 * Super Admin key returns "all". Otherwise returns null.
 */
export function resolveRegionFromKey(key) {
  const trimmed = (key || '').trim()
  if (!trimmed) return null
  if (SUPER_ADMIN_KEY && SUPER_ADMIN_KEY === trimmed) return 'all'
  const keys = parse()
  for (const [region, masterKey] of Object.entries(keys)) {
    if (masterKey.trim() === trimmed) return region
  }
  return null
}

/**
 * If the given key matches a region's viewer key, returns that region id (e.g. "7").
 * Returns null if not found.
 */
export function resolveRegionFromViewerKey(key) {
  const trimmed = (key || '').trim()
  if (!trimmed) return null
  const keys = parseViewer()
  for (const [region, viewerKey] of Object.entries(keys)) {
    if (viewerKey.trim() === trimmed) return region
  }
  return null
}

/** Returns a list of region ids that have an admin key configured. */
export function getConfiguredRegions() {
  return Object.keys(parse())
}
