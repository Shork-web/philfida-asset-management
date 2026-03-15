/**
 * Region-based master keys for sign-up.
 * Use VITE_MASTER_KEYS as JSON: {"7":"PhilFIDA7","8":"Region8Key"}
 * Or keep VITE_SIGNUP_MASTER_KEY for a single key (treated as region "all" = see all data).
 */

const RAW = import.meta.env.VITE_MASTER_KEYS || ''
const LEGACY_KEY = (import.meta.env.VITE_SIGNUP_MASTER_KEY || '').trim()

/** @type {Record<string, string>} region id -> key */
let _parsed = null

function parse() {
  if (_parsed !== null) return _parsed
  if (RAW.trim()) {
    try {
      const obj = JSON.parse(RAW)
      _parsed = typeof obj === 'object' && obj !== null ? obj : {}
    } catch {
      _parsed = {}
    }
  } else {
    _parsed = LEGACY_KEY ? { all: LEGACY_KEY } : {}
  }
  return _parsed
}

/** Returns true if at least one master key is configured (sign-up allowed). */
export function isSignUpEnabled() {
  const keys = parse()
  return Object.keys(keys).length > 0
}

/**
 * If the given key matches a region's key, returns that region id (e.g. "7", "8", "all").
 * Otherwise returns null.
 */
export function resolveRegionFromKey(key) {
  const trimmed = (key || '').trim()
  if (!trimmed) return null
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
