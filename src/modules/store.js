// store.js — Typed LocalStorage wrapper with schema versioning & quota/corruption resilience

const SCHEMA_VERSION = 1

export const KEYS = {
  SCHEMA_VERSION: 'nm_schema_version',
  MEDICATIONS: 'nm_medications',
  DOSE_LOGS: 'nm_dose_logs',
  PROFILE: 'nm_profile',
  EMERGENCY: 'nm_emergency',
  CAREGIVER: 'nm_caregiver',
  SETTINGS: 'nm_settings',
  CAREGIVER_NOTES: 'nm_caregiver_notes',
  DOSE_AUDIT_LOGS: 'nm_dose_audit_logs',
}

const DEFAULTS = {
  [KEYS.MEDICATIONS]: [],
  [KEYS.DOSE_LOGS]: [],
  [KEYS.PROFILE]: {
    name: '',
    seniorMode: false,
    language: 'en',
    pin: null,
  },
  [KEYS.EMERGENCY]: {
    allergies: [],
    conditions: [],
    emergencyContact: { name: '', phone: '', relationship: '' },
    bloodType: '',
    gpName: '',
    gpPhone: '',
  },
  [KEYS.CAREGIVER]: {
    enabled: false,
    pin: null,
  },
  [KEYS.SETTINGS]: {
    language: 'en',
    seniorMode: false,
    fontSize: 'normal',
  },
  [KEYS.CAREGIVER_NOTES]: [],
  [KEYS.DOSE_AUDIT_LOGS]: [],
}

/**
 * Migration hook when schema changes.
 * @param {number} storedVersion
 */
function _migrate(storedVersion) {
  try {
    if (storedVersion < 1) {
      // initial baseline
    }
  } catch (err) {
    console.warn('[store] Migration warning:', err)
  }
}

/**
 * Checks schema version, runs migration if needed,
 * initialises missing keys with defaults safely.
 */
export function initStore() {
  try {
    const storedVersion = getStore(KEYS.SCHEMA_VERSION)

    if (storedVersion === null) {
      setStore(KEYS.SCHEMA_VERSION, SCHEMA_VERSION)
    } else if (storedVersion < SCHEMA_VERSION) {
      _migrate(storedVersion)
      setStore(KEYS.SCHEMA_VERSION, SCHEMA_VERSION)
    }

    for (const [key, defaultValue] of Object.entries(DEFAULTS)) {
      if (getStore(key) === null) {
        setStore(key, defaultValue)
      }
    }
  } catch (err) {
    console.error('[store] initStore error:', err)
  }
}

/**
 * Parses JSON from localStorage. Handles missing keys or corrupted JSON gracefully.
 * @param {string} key
 * @returns {any|null}
 */
export function getStore(key) {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(key)
    if (raw === null || raw === undefined) return null
    return JSON.parse(raw)
  } catch (err) {
    console.warn(`[store] Corrupted or unreadable JSON for key "${key}". Resetting to default.`, err)
    const fallback = DEFAULTS[key] ?? null
    if (fallback !== null) {
      setStore(key, fallback)
    }
    return fallback
  }
}

/**
 * Serialises value to JSON and stores it. Handles storage quota errors.
 * @param {string} key
 * @param {any} value
 * @returns {boolean}
 */
export function setStore(key, value) {
  try {
    if (typeof localStorage === 'undefined') return false
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    console.error(`[store] Failed to write key "${key}":`, err)
    return false
  }
}

/**
 * Atomically updates a stored value using an updater function.
 * @param {string} key
 * @param {(current: any) => any} updater
 * @returns {boolean}
 */
export function updateStore(key, updater) {
  try {
    const current = getStore(key)
    const next = updater(current)
    return setStore(key, next)
  } catch (err) {
    console.error(`[store] updateStore error for key "${key}":`, err)
    return false
  }
}

/**
 * Clears all keys that start with 'nm_'.
 */
export function clearStore() {
  try {
    if (typeof localStorage === 'undefined') return
    const toRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('nm_')) {
        toRemove.push(key)
      }
    }
    toRemove.forEach((key) => localStorage.removeItem(key))
  } catch (err) {
    console.error('[store] clearStore error:', err)
  }
}

/**
 * Exports all nm_ store data as a JSON string (for backup / download).
 * @returns {string}
 */
export function exportData() {
  const data = {
    _exportedAt: new Date().toISOString(),
    _schemaVersion: SCHEMA_VERSION,
  }
  for (const key of Object.values(KEYS)) {
    data[key] = getStore(key)
  }
  return JSON.stringify(data, null, 2)
}

/**
 * Validates and imports a backup JSON string.
 * @param {string} jsonString
 * @returns {{ success: boolean, error?: string }}
 */
export function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString)

    if (typeof data !== 'object' || data === null) {
      return { success: false, error: 'Invalid backup format: expected an object.' }
    }

    for (const key of Object.values(KEYS)) {
      if (key === KEYS.SCHEMA_VERSION) continue
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        setStore(key, data[key])
      }
    }

    setStore(KEYS.SCHEMA_VERSION, SCHEMA_VERSION)
    return { success: true }
  } catch (err) {
    return { success: false, error: `Failed to parse backup: ${err.message}` }
  }
}
