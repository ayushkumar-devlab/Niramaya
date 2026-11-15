/**
 * adherence.js — 7-Day Adherence Calculation & CareCircle Analytics Engine
 *
 * Core Adherence Formula:
 * Adherence % = (Doses recorded as taken / Eligible scheduled doses) * 100
 *
 * Important rules:
 * - Exclude future scheduled doses (never penalize for doses not yet due).
 * - Distinguish 'taken', 'missed' (>60 min past due), 'unrecorded' (past window without explicit record), and 'corrected'.
 * - Handle zero scheduled doses gracefully (returns 100% or 0% with clear metadata).
 * - Support global 7-day adherence and medication-specific adherence.
 */

import { getStore, KEYS } from './store.js'
import { getAllMedicationsWithDeleted, getTodayString } from './medications.js'

/**
 * Generates an array of past N dates ending at `endDate` (inclusive).
 * Format: ["YYYY-MM-DD", ...]
 *
 * @param {number} [days=7]
 * @param {Date} [referenceClock=new Date()]
 * @returns {string[]} Dates ascending (oldest to newest)
 */
export function getPastDateRange(days = 7, referenceClock = new Date()) {
  const dates = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(referenceClock)
    d.setDate(d.getDate() - i)
    dates.push(getTodayString(d))
  }
  return dates
}

/**
 * Checks if a specific dose slot is in the future relative to the reference clock.
 *
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {string} timeStr - "HH:MM"
 * @param {Date} referenceClock
 * @returns {boolean}
 */
export function isDoseInFuture(dateStr, timeStr, referenceClock = new Date()) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)
  const doseTime = new Date(year, month - 1, day, hours, minutes, 0, 0)
  return doseTime.getTime() > referenceClock.getTime()
}

/**
 * Computes 7-day adherence statistics across all medications or for a single medication.
 *
 * @param {object} [options]
 * @param {string|null} [options.medicationId=null]
 * @param {number} [options.days=7]
 * @param {Date} [options.clock=new Date()]
 * @returns {object} Comprehensive adherence summary
 */
export function calculateSevenDayAdherence(options = {}) {
  const { medicationId = null, days = 7, clock = new Date() } = options
  const dateRange = getPastDateRange(days, clock)
  const allMeds = getAllMedicationsWithDeleted()
  const filteredMeds = medicationId
    ? allMeds.filter((m) => m.id === medicationId)
    : allMeds.filter((m) => !m.deleted)

  const doseLogs = getStore(KEYS.DOSE_LOGS) ?? []
  const auditLogs = getStore(KEYS.DOSE_AUDIT_LOGS) ?? []

  let eligibleScheduledDoses = 0
  let dosesTaken = 0
  let dosesMissed = 0
  let dosesUnrecorded = 0
  let dosesCorrected = 0

  const calendarGrid = [] // Array of { date, slots: [] }
  const medStatsMap = {}

  // Initialize per-med statistics
  filteredMeds.forEach((med) => {
    medStatsMap[med.id] = {
      id: med.id,
      name: med.name,
      dosage: med.dosage || med.dose || '',
      eligible: 0,
      taken: 0,
      missed: 0,
      unrecorded: 0,
      corrected: 0,
      adherenceRate: 100,
    }
  })

  // Scan every date in the 7-day window
  for (const dateStr of dateRange) {
    const daySlots = []

    for (const med of filteredMeds) {
      // Check medication active range
      if (med.startDate && med.startDate > dateStr) continue
      if (med.endDate && med.endDate < dateStr) continue
      if (!Array.isArray(med.times) || med.times.length === 0) continue

      for (const timeStr of med.times) {
        // 1. Is this slot in the future?
        const isFuture = isDoseInFuture(dateStr, timeStr, clock)
        if (isFuture) {
          daySlots.push({
            date: dateStr,
            time: timeStr,
            medicationId: med.id,
            medicationName: med.name,
            status: 'future',
            isFuture: true,
          })
          continue
        }

        // Slot is eligible (past or due)
        eligibleScheduledDoses++
        if (medStatsMap[med.id]) medStatsMap[med.id].eligible++

        // 2. Check if dose was taken
        const log = doseLogs.find(
          (l) =>
            l.medicationId === med.id &&
            l.scheduledTime === timeStr &&
            l.date === dateStr &&
            l.status === 'taken'
        )

        // 3. Check if corrected
        const wasCorrected = auditLogs.some(
          (a) =>
            a.medicationId === med.id &&
            a.scheduledTime === timeStr &&
            a.date === dateStr &&
            a.action === 'corrected_accidental_entry'
        )

        let status = 'unrecorded'
        if (log) {
          status = 'taken'
          dosesTaken++
          if (medStatsMap[med.id]) medStatsMap[med.id].taken++
        } else if (wasCorrected) {
          status = 'corrected'
          dosesCorrected++
          dosesUnrecorded++
          if (medStatsMap[med.id]) {
            medStatsMap[med.id].corrected++
            medStatsMap[med.id].unrecorded++
          }
        } else {
          // Check if missed (>60m past scheduled time)
          const [h, m] = timeStr.split(':').map(Number)
          const [year, month, day] = dateStr.split('-').map(Number)
          const scheduledDate = new Date(year, month - 1, day, h, m, 0, 0)
          const diffMinutes = (clock.getTime() - scheduledDate.getTime()) / (1000 * 60)

          if (diffMinutes > 60) {
            status = 'unrecorded' // Clearly marked as unrecorded/missed
            dosesUnrecorded++
            if (medStatsMap[med.id]) medStatsMap[med.id].unrecorded++
          } else {
            status = 'due'
          }
        }

        daySlots.push({
          date: dateStr,
          time: timeStr,
          medicationId: med.id,
          medicationName: med.name,
          dosage: med.dosage || med.dose || '',
          status,
          isFuture: false,
          takenAt: log ? log.takenAt || log.timestamp : null,
          wasCorrected,
        })
      }
    }

    calendarGrid.push({
      date: dateStr,
      slots: daySlots,
    })
  }

  // Calculate adherence percentages
  const adherenceRate =
    eligibleScheduledDoses > 0
      ? Math.round((dosesTaken / eligibleScheduledDoses) * 100)
      : 100

  Object.values(medStatsMap).forEach((stat) => {
    stat.adherenceRate =
      stat.eligible > 0 ? Math.round((stat.taken / stat.eligible) * 100) : 100
  })

  return {
    periodDays: days,
    startDate: dateRange[0],
    endDate: dateRange[dateRange.length - 1],
    totalEligibleDoses: eligibleScheduledDoses,
    dosesTaken,
    dosesMissed,
    dosesUnrecorded,
    dosesCorrected,
    adherenceRate,
    medicationStats: Object.values(medStatsMap),
    calendarGrid,
  }
}

/**
 * Returns missed or unconfirmed dose history across a date range.
 *
 * @param {object} [filters]
 * @param {string|null} [filters.medicationId=null]
 * @param {string|null} [filters.startDate=null]
 * @param {string|null} [filters.endDate=null]
 * @param {Date} [filters.clock=new Date()]
 * @returns {Array<object>} Missed/unconfirmed dose records
 */
export function getMissedDoseHistory(filters = {}) {
  const { medicationId = null, startDate = null, endDate = null, clock = new Date() } = filters
  const adherence = calculateSevenDayAdherence({ medicationId, days: 14, clock })
  const result = []

  for (const day of adherence.calendarGrid) {
    if (startDate && day.date < startDate) continue
    if (endDate && day.date > endDate) continue

    for (const slot of day.slots) {
      if (slot.isFuture || slot.status === 'taken') continue
      if (medicationId && slot.medicationId !== medicationId) continue

      result.push({
        id: `${slot.medicationId}-${slot.date}-${slot.time}`,
        medicationId: slot.medicationId,
        medicationName: slot.medicationName,
        dosage: slot.dosage,
        date: slot.date,
        time: slot.time,
        status: slot.status, // 'unrecorded' | 'corrected' | 'due'
        wasCorrected: slot.wasCorrected || false,
      })
    }
  }

  // Sort descending by date and time (most recent first)
  result.sort((a, b) => {
    const dCmp = b.date.localeCompare(a.date)
    if (dCmp !== 0) return dCmp
    return b.time.localeCompare(a.time)
  })

  return result
}
