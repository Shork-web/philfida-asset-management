/**
 * Region-based master keys for sign-up.
 * Use VITE_MASTER_KEYS as JSON: {"7":"PhilFIDA7","8":"Region8Key"}
 * Or keep VITE_SIGNUP_MASTER_KEY for a single key (treated as region "all" = see all data).
 */

const RAW = (import.meta.env.VITE_MASTER_KEYS || '').trim()
const LEGACY_KEY = (import.meta.env.VITE_SIGNUP_MASTER_KEY || '').trim()
const SUPER_ADMIN_KEY = (import.meta.env.VITE_SUPER_ADMIN_MASTER_KEY || '').trim()

/** @type {Record<string, string>} region id -> key */
let _parsed = null

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

/** Returns true if at least one master key is configured (sign-up allowed). */
export function isSignUpEnabled() {
  const keys = parse()
  return Object.keys(keys).length > 0 || !!SUPER_ADMIN_KEY
}

/** Returns true if the given key is the one-time Super Admin key. */
export function isSuperAdminKey(key) {
  const trimmed = (key || '').trim()
  return !!SUPER_ADMIN_KEY && SUPER_ADMIN_KEY === trimmed
}

/**
 * If the given key matches a region's key, returns that region id (e.g. "7", "8", "all").
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

/** Returns a list of region ids that have a key configured (e.g. ["7", "8"] or ["all"]). */
export function getConfiguredRegions() {
  return Object.keys(parse())
}
