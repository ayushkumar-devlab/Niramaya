// medications.js — Medication CRUD, schedule engine, and dose logging

import { KEYS, getStore, updateStore } from './store.js'

export const MISSED_THRESHOLD_MINUTES = 60

/** Standard frequency options */
export const FREQUENCIES = {
  ONCE_DAILY: 'once_daily',
  TWICE_DAILY: 'twice_daily',
  THREE_TIMES_DAILY: 'three_times_daily',
  CUSTOM: 'custom',
}

/** Default times suggestion per frequency */
export const DEFAULT_FREQUENCY_TIMES = {
  [FREQUENCIES.ONCE_DAILY]: ['08:00'],
  [FREQUENCIES.TWICE_DAILY]: ['08:00', '20:00'],
  [FREQUENCIES.THREE_TIMES_DAILY]: ['08:00', '14:00', '20:00'],
  [FREQUENCIES.CUSTOM]: ['08:00'],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a date formatted as YYYY-MM-DD.
 * @param {Date} [d=new Date()]
 * @returns {string}
 */
export function getTodayString(d = new Date()) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Generate a unique ID using crypto.randomUUID when available.
 * @returns {string}
 */
function _genId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Validates 'HH:MM' 24-hour format string.
 * @param {string} timeStr
 * @returns {boolean}
 */
export function isValidTimeFormat(timeStr) {
  if (typeof timeStr !== 'string') return false
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr.trim())
}

/**
 * Validates medication payload.
 * Returns { valid: boolean, errors: string[] }
 * @param {object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateMedicationInput(data) {
  const errors = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid medication data'] }
  }

  const name = typeof data.name === 'string' ? data.name.trim() : ''
  if (!name) {
    errors.push('Medication name is required')
  } else if (name.length > 100) {
    errors.push('Medication name must be 100 characters or fewer')
  }

  const dosage = typeof (data.dosage || data.dose) === 'string' ? (data.dosage || data.dose).trim() : ''
  if (!dosage) {
    errors.push('Dosage is required (e.g. 500mg, 1 tablet)')
  } else if (dosage.length > 50) {
    errors.push('Dosage must be 50 characters or fewer')
  }

  if (!Array.isArray(data.times) || data.times.length === 0) {
    errors.push('At least one scheduled time is required')
  } else {
    const uniqueTimes = new Set()
    for (const t of data.times) {
      if (!isValidTimeFormat(t)) {
        errors.push(`Invalid time format "${t}" (must be HH:MM in 24-hour format)`)
      } else {
        const norm = t.trim()
        if (uniqueTimes.has(norm)) {
          errors.push(`Duplicate time entry "${norm}"`)
        }
        uniqueTimes.add(norm)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ---------------------------------------------------------------------------
// Medication CRUD
// ---------------------------------------------------------------------------

/**
 * Returns all active medications from the store.
 * @returns {Array<object>}
 */
export function getAllMedications() {
  const list = getStore(KEYS.MEDICATIONS) ?? []
  return Array.isArray(list) ? list.filter((m) => !m.deleted) : []
}

/**
 * Returns all medications including deleted ones (useful for audit/history).
 * @returns {Array<object>}
 */
export function getAllMedicationsWithDeleted() {
  const list = getStore(KEYS.MEDICATIONS) ?? []
  return Array.isArray(list) ? list : []
}

/**
 * Returns a single active medication by id.
 * @param {string} id
 * @returns {object|null}
 */
export function getMedication(id) {
  const meds = getAllMedications()
  return meds.find((m) => m.id === id) ?? null
}

/**
 * Adds a new medication after validation.
 * @param {object} data
 * @returns {{ success: boolean, medication?: object, errors?: string[] }}
 */
export function addMedication(data) {
  const validation = validateMedicationInput(data)
  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }

  const now = new Date().toISOString()
  const cleanedTimes = [...new Set(data.times.map((t) => t.trim()))].sort()

  const medication = {
    id: _genId(),
    name: data.name.trim(),
    dosage: (data.dosage || data.dose || '').trim(),
    dose: (data.dosage || data.dose || '').trim(), // backward-compatible
    unit: (data.unit || '').trim(),
    activeIngredient: (data.activeIngredient || '').trim(),
    frequency: data.frequency || FREQUENCIES.ONCE_DAILY,
    times: cleanedTimes,
    instructions: (data.instructions || '').trim(),
    clinicianInstructions: (data.clinicianInstructions || '').trim(),
    startDate: data.startDate || getTodayString(),
    endDate: data.endDate || null,
    color: data.color || '#0d9488',
    deleted: false,
    createdAt: now,
    updatedAt: now,
  }

  updateStore(KEYS.MEDICATIONS, (current) => {
    const list = Array.isArray(current) ? current : []
    return [...list, medication]
  })

  return { success: true, medication }
}

/**
 * Updates an existing medication by id. Preserves existing history and logs.
 * @param {string} id
 * @param {object} data
 * @returns {{ success: boolean, medication?: object, errors?: string[] }}
 */
export function updateMedication(id, data) {
  const existing = getMedication(id)
  if (!existing) {
    return { success: false, errors: ['Medication not found'] }
  }

  const merged = { ...existing, ...data }
  const validation = validateMedicationInput(merged)
  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }

  const cleanedTimes = [...new Set(merged.times.map((t) => t.trim()))].sort()
  let updated = null

  updateStore(KEYS.MEDICATIONS, (current) => {
    const list = Array.isArray(current) ? current : []
    return list.map((m) => {
      if (m.id !== id) return m
      updated = {
        ...m,
        ...data,
        name: merged.name.trim(),
        dosage: (merged.dosage || merged.dose || '').trim(),
        dose: (merged.dosage || merged.dose || '').trim(),
        times: cleanedTimes,
        id: m.id,
        createdAt: m.createdAt,
        updatedAt: new Date().toISOString(),
      }
      return updated
    })
  })

  return { success: true, medication: updated }
}

/**
 * Deletes a medication.
 * Soft-deletes so future schedules stop appearing, but past dose logs remain intact.
 * @param {string} id
 * @returns {boolean} True if removed/soft-deleted.
 */
export function deleteMedication(id) {
  let found = false

  updateStore(KEYS.MEDICATIONS, (current) => {
    const list = Array.isArray(current) ? current : []
    return list.map((m) => {
      if (m.id === id) {
        found = true
        return { ...m, deleted: true, updatedAt: new Date().toISOString() }
      }
      return m
    })
  })

  return found
}

// ---------------------------------------------------------------------------
// Schedule Engine
// ---------------------------------------------------------------------------

/**
 * Determines dose status: 'taken' | 'due' | 'upcoming' | 'missed'
 *
 * Status definition:
 * - 'taken': dose has a valid DoseLog record for today.
 * - 'due': now is between (scheduled - 15m) and (scheduled + MISSED_THRESHOLD_MINUTES).
 * - 'upcoming': now is before (scheduled - 15m).
 * - 'missed': now is more than MISSED_THRESHOLD_MINUTES past scheduled time and not taken.
 *
 * @param {string} scheduledTime - "HH:MM"
 * @param {object|null} doseLog
 * @param {Date} [currentTime=new Date()]
 * @param {number} [thresholdMinutes=MISSED_THRESHOLD_MINUTES]
 * @returns {'taken'|'due'|'upcoming'|'missed'}
 */
export function calculateDoseStatus(
  scheduledTime,
  doseLog,
  currentTime = new Date(),
  thresholdMinutes = MISSED_THRESHOLD_MINUTES
) {
  if (doseLog && doseLog.status === 'taken') {
    return 'taken'
  }

  const [sHours, sMinutes] = scheduledTime.split(':').map(Number)
  const scheduledDate = new Date(currentTime)
  scheduledDate.setHours(sHours, sMinutes, 0, 0)

  const diffMs = currentTime.getTime() - scheduledDate.getTime()
  const diffMinutes = diffMs / (1000 * 60)

  // If more than thresholdMinutes (60 min) have passed without taking it -> missed
  if (diffMinutes > thresholdMinutes) {
    return 'missed'
  }

  // If currently within 15 minutes before scheduled time or up to 60 minutes after -> due
  if (diffMinutes >= -15 && diffMinutes <= thresholdMinutes) {
    return 'due'
  }

  // If prior to 15 minutes before scheduled time -> upcoming
  return 'upcoming'
}

/**
 * Computes today's schedule for all active medications.
 * Sorted chronologically by scheduledTime (HH:MM).
 *
 * @param {Date} [clock=new Date()] Optional injected clock for deterministic testing.
 * @returns {Array<{ medication: object, scheduledTime: string, doseLog: object|null, status: string }>}
 */
export function getTodaysSchedule(clock = new Date()) {
  const today = getTodayString(clock)
  const meds = getAllMedications()
  const logs = getDoseLogsForDate(today)

  const schedule = []

  for (const med of meds) {
    if (med.startDate && med.startDate > today) continue
    if (med.endDate && med.endDate < today) continue
    if (!Array.isArray(med.times) || med.times.length === 0) continue

    for (const scheduledTime of med.times) {
      const doseLog = logs.find(
        (l) =>
          l.medicationId === med.id &&
          l.scheduledTime === scheduledTime &&
          l.date === today &&
          l.status === 'taken'
      ) ?? null

      const status = calculateDoseStatus(scheduledTime, doseLog, clock)

      schedule.push({
        medication: med,
        scheduledTime,
        doseLog,
        status,
      })
    }
  }

  // Sort by time ascending, then medication name
  schedule.sort((a, b) => {
    const timeCmp = a.scheduledTime.localeCompare(b.scheduledTime)
    if (timeCmp !== 0) return timeCmp
    return a.medication.name.localeCompare(b.medication.name)
  })

  return schedule
}

// ---------------------------------------------------------------------------
// Dose Logging & Duplicate Prevention
// ---------------------------------------------------------------------------

/**
 * Logs a dose as taken.
 * Duplicate prevention: uniqueness enforced on (medicationId + date + scheduledTime).
 *
 * @param {string} medicationId
 * @param {string} scheduledTime - "HH:MM"
 * @param {Date} [clock=new Date()]
 * @returns {{ success: boolean, doseLog?: object, error?: string }}
 */
export function logDose(medicationId, scheduledTime, clock = new Date()) {
  const today = getTodayString(clock)
  const nowIso = clock.toISOString()

  let duplicateFound = false
  let newLog = null

  updateStore(KEYS.DOSE_LOGS, (current) => {
    const list = Array.isArray(current) ? current : []

    const existing = list.find(
      (l) =>
        l.medicationId === medicationId &&
        l.scheduledTime === scheduledTime &&
        l.date === today &&
        l.status === 'taken'
    )

    if (existing) {
      duplicateFound = true
      return list
    }

    newLog = {
      id: _genId(),
      medicationId,
      scheduledTime,
      date: today,
      status: 'taken',
      takenAt: nowIso,
      timestamp: nowIso,
    }

    return [...list, newLog]
  })

  if (duplicateFound) {
    return {
      success: false,
      error: 'This dose has already been recorded as taken today.',
    }
  }

  return { success: true, doseLog: newLog }
}

/**
 * Returns all dose logs for a given date.
 * @param {string} date - "YYYY-MM-DD"
 * @returns {Array<object>}
 */
export function getDoseLogsForDate(date) {
  const logs = getStore(KEYS.DOSE_LOGS) ?? []
  return Array.isArray(logs) ? logs.filter((l) => l.date === date) : []
}

/**
 * Returns all dose logs between startDate and endDate (inclusive).
 * @param {string} startDate - "YYYY-MM-DD"
 * @param {string} endDate - "YYYY-MM-DD"
 * @returns {Array<object>}
 */
export function getDoseLogsForRange(startDate, endDate) {
  const logs = getStore(KEYS.DOSE_LOGS) ?? []
  return Array.isArray(logs) ? logs.filter((l) => l.date >= startDate && l.date <= endDate) : []
}
