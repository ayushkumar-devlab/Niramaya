// medications.js — Medication CRUD and schedule engine

import { KEYS, getStore, setStore, updateStore } from './store.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns today's date as a YYYY-MM-DD string in local time.
 * @returns {string}
 */
export function getTodayString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Generate a unique ID using crypto.randomUUID when available,
 * falling back to a Date.now + random suffix.
 * @returns {string}
 */
function _genId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ---------------------------------------------------------------------------
// Medication CRUD
// ---------------------------------------------------------------------------

/**
 * Returns all medications from the store.
 * @returns {Medication[]}
 */
export function getAllMedications() {
  return getStore(KEYS.MEDICATIONS) ?? []
}

/**
 * Returns a single medication by id, or null if not found.
 * @param {string} id
 * @returns {Medication|null}
 */
export function getMedication(id) {
  const meds = getAllMedications()
  return meds.find((m) => m.id === id) ?? null
}

/**
 * Adds a new medication. Generates id and timestamps.
 * @param {Partial<Medication>} data
 * @returns {Medication}
 */
export function addMedication(data) {
  const now = new Date().toISOString()
  const medication = {
    id: _genId(),
    name: '',
    activeIngredient: '',
    dose: '',
    unit: '',
    frequency: 'daily',
    times: [],
    instructions: '',
    clinicianInstructions: '',
    startDate: getTodayString(),
    endDate: null,
    color: '#0d9488',
    ...data,
    createdAt: now,
    updatedAt: now,
  }

  updateStore(KEYS.MEDICATIONS, (current) => {
    const list = Array.isArray(current) ? current : []
    return [...list, medication]
  })

  return medication
}

/**
 * Updates an existing medication by id.
 * @param {string} id
 * @param {Partial<Medication>} data
 * @returns {Medication|null} Updated medication, or null if not found.
 */
export function updateMedication(id, data) {
  let updated = null

  updateStore(KEYS.MEDICATIONS, (current) => {
    const list = Array.isArray(current) ? current : []
    return list.map((m) => {
      if (m.id !== id) return m
      updated = { ...m, ...data, id: m.id, updatedAt: new Date().toISOString() }
      return updated
    })
  })

  return updated
}

/**
 * Deletes a medication by id.
 * @param {string} id
 * @returns {boolean} True if removed, false if not found.
 */
export function deleteMedication(id) {
  let removed = false

  updateStore(KEYS.MEDICATIONS, (current) => {
    const list = Array.isArray(current) ? current : []
    const next = list.filter((m) => {
      if (m.id === id) { removed = true; return false }
      return true
    })
    return next
  })

  return removed
}

// ---------------------------------------------------------------------------
// Schedule engine
// ---------------------------------------------------------------------------

/**
 * Returns today's schedule as an array of { medication, scheduledTime, doseLog }
 * sorted by scheduledTime (HH:MM, ascending).
 *
 * Only includes medications whose date range covers today and that have
 * at least one time entry.
 *
 * @returns {{ medication: Medication, scheduledTime: string, doseLog: DoseLog|null }[]}
 */
export function getTodaysSchedule() {
  const today = getTodayString()
  const meds = getAllMedications()
  const logs = getDoseLogsForDate(today)

  const schedule = []

  for (const med of meds) {
    // Skip if outside date range
    if (med.startDate && med.startDate > today) continue
    if (med.endDate && med.endDate < today) continue
    // Skip if no times defined
    if (!Array.isArray(med.times) || med.times.length === 0) continue

    for (const scheduledTime of med.times) {
      const doseLog =
        logs.find(
          (l) =>
            l.medicationId === med.id &&
            l.scheduledTime === scheduledTime &&
            l.date === today
        ) ?? null

      schedule.push({ medication: med, scheduledTime, doseLog })
    }
  }

  // Sort by HH:MM ascending
  schedule.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))

  return schedule
}

/**
 * Logs or updates a dose entry.
 * Prevents duplicate: if a log exists for same med + time + date, it is updated.
 *
 * @param {string} medicationId
 * @param {string} scheduledTime - HH:MM
 * @param {'taken'|'missed'|'skipped'} [status='taken']
 * @returns {DoseLog}
 */
export function logDose(medicationId, scheduledTime, status = 'taken') {
  const today = getTodayString()
  let resultLog = null

  updateStore(KEYS.DOSE_LOGS, (current) => {
    const list = Array.isArray(current) ? current : []

    const existingIdx = list.findIndex(
      (l) =>
        l.medicationId === medicationId &&
        l.scheduledTime === scheduledTime &&
        l.date === today
    )

    if (existingIdx !== -1) {
      // Update existing entry
      const updated = {
        ...list[existingIdx],
        status,
        timestamp: new Date().toISOString(),
      }
      resultLog = updated
      const next = [...list]
      next[existingIdx] = updated
      return next
    }

    // Create new entry
    const newLog = {
      id: _genId(),
      medicationId,
      scheduledTime,
      date: today,
      status,
      timestamp: new Date().toISOString(),
    }
    resultLog = newLog
    return [...list, newLog]
  })

  return resultLog
}

/**
 * Returns all dose logs for a given date.
 * @param {string} date - YYYY-MM-DD
 * @returns {DoseLog[]}
 */
export function getDoseLogsForDate(date) {
  const logs = getStore(KEYS.DOSE_LOGS) ?? []
  return logs.filter((l) => l.date === date)
}

/**
 * Returns all dose logs between startDate and endDate (inclusive).
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {DoseLog[]}
 */
export function getDoseLogsForRange(startDate, endDate) {
  const logs = getStore(KEYS.DOSE_LOGS) ?? []
  return logs.filter((l) => l.date >= startDate && l.date <= endDate)
}

// ---------------------------------------------------------------------------
// JSDoc type definitions (not runtime)
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   activeIngredient: string,
 *   dose: string,
 *   unit: string,
 *   frequency: string,
 *   times: string[],
 *   instructions: string,
 *   clinicianInstructions: string,
 *   startDate: string,
 *   endDate: string|null,
 *   color: string,
 *   createdAt: string,
 *   updatedAt: string,
 * }} Medication
 */

/**
 * @typedef {{
 *   id: string,
 *   medicationId: string,
 *   scheduledTime: string,
 *   date: string,
 *   status: 'taken'|'missed'|'skipped',
 *   timestamp: string,
 * }} DoseLog
 */
