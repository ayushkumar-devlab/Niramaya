/**
 * emergency.js — Emergency Snapshot (Swasthya Card) Data & Validation Module
 *
 * All data is kept strictly inside browser LocalStorage.
 * No external API dependencies or health data transmission.
 */

import { getStore, updateStore, KEYS } from './store.js'
import { getAllMedications } from './medications.js'

export const ALLERGY_STATUSES = {
  UNKNOWN: 'unknown',           // Never assume blank means no allergies!
  NO_KNOWN: 'no_known',         // Explicitly verified "No known allergies"
  HAS_ALLERGIES: 'has_allergies', // List of specific allergies
}

export const DEFAULT_EMERGENCY_DATA = {
  patientName: '',
  age: '',
  dateOfBirth: '',
  bloodType: '', // e.g. A+, B+, O+, AB-, or Unknown
  allergyStatus: ALLERGY_STATUSES.UNKNOWN,
  allergiesList: [], // specific allergy tags/names
  conditions: [],    // e.g. ["Type 2 Diabetes", "Hypertension"]
  emergencyContact: {
    name: '',
    phone: '',
    relationship: '',
  },
  primaryDoctor: {
    name: '',
    phone: '',
    clinic: '',
  },
  notes: '',
  updatedAt: null,
}

/**
 * Validates telephone numbers (Indian standard 10 digits or international formats).
 * Allows numbers, spaces, dashes, parentheses and leading '+'.
 * Minimum 7 digits, maximum 15 digits.
 *
 * @param {string} phoneStr
 * @returns {boolean}
 */
export function isValidPhoneNumber(phoneStr) {
  if (typeof phoneStr !== 'string') return false
  const trimmed = phoneStr.trim()
  if (!trimmed) return false

  // Basic regex check allowing international prefixes and standard separators
  const validPattern = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,14}$/
  if (!validPattern.test(trimmed)) return false

  // Count raw digits
  const digitCount = (trimmed.match(/\d/g) || []).length
  return digitCount >= 7 && digitCount <= 15
}

/**
 * Validates emergency data input before persistence.
 * @param {object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateEmergencyData(data) {
  const errors = []
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid emergency data payload'] }
  }

  // Patient Name
  if (!data.patientName || !data.patientName.trim()) {
    errors.push('Patient full name is required')
  }

  // Emergency contact validation
  if (data.emergencyContact) {
    if (data.emergencyContact.phone && !isValidPhoneNumber(data.emergencyContact.phone)) {
      errors.push('Emergency contact phone number format is invalid')
    }
  }

  // Primary doctor phone validation
  if (data.primaryDoctor && data.primaryDoctor.phone) {
    if (!isValidPhoneNumber(data.primaryDoctor.phone)) {
      errors.push("Primary doctor's phone number format is invalid")
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Retrieves the Emergency Snapshot data from LocalStorage.
 * Synchronizes current medications automatically from the medications store.
 *
 * @returns {object} Full emergency profile
 */
export function getEmergencySnapshot() {
  const stored = getStore(KEYS.EMERGENCY) || {}
  const profile = getStore(KEYS.PROFILE) || {}

  // Auto-retrieve active current medications
  const currentMedications = getAllMedications().map((m) => ({
    id: m.id,
    name: m.name,
    dosage: m.dosage || m.dose || '',
    activeIngredient: m.activeIngredient || '',
    instructions: m.instructions || '',
    times: m.times || [],
  }))

  return {
    ...DEFAULT_EMERGENCY_DATA,
    ...stored,
    // Prefer patientName from emergency data, falling back to profile.name
    patientName: stored.patientName || profile.name || '',
    currentMedications,
  }
}

/**
 * Saves updated Emergency Snapshot data to LocalStorage.
 *
 * @param {object} updates
 * @returns {{ success: boolean, data?: object, errors?: string[] }}
 */
export function saveEmergencySnapshot(updates) {
  const current = getEmergencySnapshot()
  const merged = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  const validation = validateEmergencyData(merged)
  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }

  // Strip dynamic medications before writing to avoid duplicate data storage
  const { currentMedications, ...toSave } = merged
  updateStore(KEYS.EMERGENCY, () => toSave)

  // Also sync patient name to PROFILE if provided
  if (toSave.patientName) {
    updateStore(KEYS.PROFILE, (p) => ({
      ...(p || {}),
      name: toSave.patientName.trim(),
    }))
  }

  return { success: true, data: merged }
}
