// store.js — Typed LocalStorage wrapper with schema versioning

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
}

/**
 * Run any needed migrations when schema version changes.
 * @param {number} storedVersion
 */
function _migrate(storedVersion) {
  // Future migrations go here as new versions are added.
  // e.g. if (storedVersion < 2) { ... }
  console.info(`[store] Migrated from schema v${storedVersion} to v${SCHEMA_VERSION}`)
}

/**
 * Checks schema version, runs migration if needed,
 * initialises missing keys with defaults.
 */
export function initStore() {
  const storedVersion = getStore(KEYS.SCHEMA_VERSION)

  if (storedVersion === null) {
    // Fresh install — write version and all defaults
    setStore(KEYS.SCHEMA_VERSION, SCHEMA_VERSION)
  } else if (storedVersion < SCHEMA_VERSION) {
    _migrate(storedVersion)
    setStore(KEYS.SCHEMA_VERSION, SCHEMA_VERSION)
  }

  // Initialise any missing keys with their defaults
  for (const [key, defaultValue] of Object.entries(DEFAULTS)) {
    if (getStore(key) === null) {
      setStore(key, defaultValue)
    }
  }
}

/**
 * Parses JSON from localStorage. Returns null on error or missing key.
 * @param {string} key
 * @returns {any|null}
 */
export function getStore(key) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Serialises value to JSON and stores it. Returns true on success.
 * @param {string} key
 * @param {any} value
 * @returns {boolean}
 */
export function setStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
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
  } catch {
    return false
  }
}

/**
 * Clears all keys that start with 'nm_'.
 */
export function clearStore() {
  const toRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('nm_')) {
      toRemove.push(key)
    }
  }
  toRemove.forEach((key) => localStorage.removeItem(key))
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

    // Write all recognised keys; skip unknown / meta keys
    for (const key of Object.values(KEYS)) {
      if (key === KEYS.SCHEMA_VERSION) continue
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        setStore(key, data[key])
      }
    }

    // Bump schema version to current after import
    setStore(KEYS.SCHEMA_VERSION, SCHEMA_VERSION)

    return { success: true }
  } catch (err) {
    return { success: false, error: `Failed to parse backup: ${err.message}` }
  }
}
