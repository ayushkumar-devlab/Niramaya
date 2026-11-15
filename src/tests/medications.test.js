import { describe, it, expect, beforeEach } from 'vitest'
import {
  initStore,
  clearStore,
  getStore,
  KEYS
} from '../modules/store.js'
import {
  getAllMedications,
  getMedication,
  addMedication,
  updateMedication,
  deleteMedication,
  getTodaysSchedule,
  getNextScheduledDose,
  logDose,
  correctAccidentalDose,
  getDoseAuditLogs,
  getDoseLogsForDate,
  calculateDoseStatus,
  validateMedicationInput,
  FREQUENCIES
} from '../modules/medications.js'

describe('Medications & Schedule Engine (Milestone 2)', () => {
  beforeEach(() => {
    let storage = {}
    globalThis.localStorage = {
      getItem: (key) => (key in storage ? storage[key] : null),
      setItem: (key, value) => { storage[key] = String(value) },
      removeItem: (key) => { delete storage[key] },
      clear: () => { storage = {} },
      key: (i) => Object.keys(storage)[i] || null,
      get length() { return Object.keys(storage).length },
    }
    initStore()
  })

  describe('Validation & Sanitization', () => {
    it('rejects empty medication name or missing dosage', () => {
      const emptyName = validateMedicationInput({ name: '', dosage: '500mg', times: ['08:00'] })
      expect(emptyName.valid).toBe(false)
      expect(emptyName.errors[0]).toMatch(/name is required/i)

      const emptyDose = validateMedicationInput({ name: 'Aspirin', dosage: '', times: ['08:00'] })
      expect(emptyDose.valid).toBe(false)
      expect(emptyDose.errors[0]).toMatch(/dosage is required/i)
    })

    it('rejects medication with no times or invalid time formats', () => {
      const noTimes = validateMedicationInput({ name: 'Aspirin', dosage: '100mg', times: [] })
      expect(noTimes.valid).toBe(false)
      expect(noTimes.errors[0]).toMatch(/at least one scheduled time/i)

      const invalidTime = validateMedicationInput({ name: 'Aspirin', dosage: '100mg', times: ['25:00'] })
      expect(invalidTime.valid).toBe(false)
      expect(invalidTime.errors[0]).toMatch(/invalid time format/i)
    })

    it('rejects duplicate times in the same medication payload', () => {
      const dupTimes = validateMedicationInput({
        name: 'Aspirin',
        dosage: '100mg',
        times: ['08:00', '08:00'],
      })
      expect(dupTimes.valid).toBe(false)
      expect(dupTimes.errors[0]).toMatch(/duplicate time entry/i)
    })
  })

  describe('Medication CRUD & Storage Resilience', () => {
    it('creates, retrieves, updates, and soft-deletes a medication with all fields', () => {
      const res = addMedication({
        name: 'Metformin',
        dosage: '500mg',
        activeIngredient: 'Metformin Hydrochloride',
        frequency: FREQUENCIES.TWICE_DAILY,
        times: ['08:00', '20:00'],
        instructions: 'Take after meal',
        clinicianInstructions: 'Do not skip breakfast',
      })
      expect(res.success).toBe(true)
      const medId = res.medication.id

      // Read
      const found = getMedication(medId)
      expect(found).not.toBeNull()
      expect(found.name).toBe('Metformin')
      expect(found.dosage).toBe('500mg')
      expect(found.activeIngredient).toBe('Metformin Hydrochloride')
      expect(found.instructions).toBe('Take after meal')
      expect(found.clinicianInstructions).toBe('Do not skip breakfast')
      expect(found.times).toEqual(['08:00', '20:00'])

      // Update
      const updateRes = updateMedication(medId, {
        dosage: '1000mg',
        instructions: 'Take with full glass of water',
      })
      expect(updateRes.success).toBe(true)
      const updated = getMedication(medId)
      expect(updated.dosage).toBe('1000mg')
      expect(updated.instructions).toBe('Take with full glass of water')

      // Delete (soft-delete preserves audit/history)
      const delSuccess = deleteMedication(medId)
      expect(delSuccess).toBe(true)
      expect(getMedication(medId)).toBeNull()
      expect(getAllMedications().length).toBe(0)
    })

    it('recovers gracefully when storage JSON is corrupted', () => {
      globalThis.localStorage.setItem(KEYS.MEDICATIONS, 'invalid{{{json')
      const meds = getAllMedications()
      expect(meds).toEqual([])
    })
  })

  describe('Dose Status Calculation & Midnight Boundary', () => {
    it('returns "taken" if a taken doseLog exists', () => {
      const log = { status: 'taken', scheduledTime: '08:00' }
      const status = calculateDoseStatus('08:00', log)
      expect(status).toBe('taken')
    })

    it('returns "upcoming" when current time is well before scheduled time', () => {
      const clock = new Date('2026-11-15T06:00:00')
      const status = calculateDoseStatus('08:00', null, clock)
      expect(status).toBe('upcoming')
    })

    it('returns "due" when current time is within 15m before or up to 60m after scheduled time', () => {
      const clock1 = new Date('2026-11-15T07:50:00')
      expect(calculateDoseStatus('08:00', null, clock1)).toBe('due')

      const clock2 = new Date('2026-11-15T08:30:00')
      expect(calculateDoseStatus('08:00', null, clock2)).toBe('due')
    })

    it('returns "missed" when more than 60 minutes have elapsed without dose', () => {
      const clock = new Date('2026-11-15T09:30:00')
      expect(calculateDoseStatus('08:00', null, clock)).toBe('missed')
    })

    it('correctly handles schedule crossing midnight', () => {
      // Midnight dose: scheduled at 23:45 and 00:30
      addMedication({
        name: 'Night Medicine',
        dosage: '10mg',
        times: ['23:45'],
      })
      addMedication({
        name: 'Late Night Drops',
        dosage: '2 drops',
        times: ['00:15'],
      })

      // Clock at 23:55 (5 minutes to midnight)
      const clockBeforeMidnight = new Date('2026-11-15T23:55:00')
      const sched1 = getTodaysSchedule(clockBeforeMidnight)
      expect(sched1.length).toBe(2)
      // 00:15 is sorted first in 24h day representation, followed by 23:45
      expect(sched1[0].scheduledTime).toBe('00:15')
      expect(sched1[1].scheduledTime).toBe('23:45')
      // At 23:55, 23:45 dose is 'due' (10 minutes after scheduled)
      expect(sched1[1].status).toBe('due')

      // Clock after midnight at 00:10 on 2026-11-16
      const clockAfterMidnight = new Date('2026-11-16T00:10:00')
      const sched2 = getTodaysSchedule(clockAfterMidnight)
      // On new date, 00:15 is due (5 minutes before)
      const doseAfterMidnight = sched2.find((d) => d.scheduledTime === '00:15')
      expect(doseAfterMidnight.status).toBe('due')
    })
  })

  describe("Today's Schedule Engine & Next Dose Spotlight", () => {
    it('correctly aggregates, sorts, and finds the next scheduled dose', () => {
      addMedication({
        name: 'Bedtime Med',
        dosage: '10mg',
        times: ['21:00'],
      })
      addMedication({
        name: 'Morning Med',
        dosage: '25mg',
        times: ['07:30', '19:00'],
      })

      const clock = new Date('2026-11-15T07:00:00')
      const schedule = getTodaysSchedule(clock)

      expect(schedule.length).toBe(3)
      expect(schedule[0].scheduledTime).toBe('07:30')
      expect(schedule[0].medication.name).toBe('Morning Med')
      expect(schedule[1].scheduledTime).toBe('19:00')
      expect(schedule[2].scheduledTime).toBe('21:00')
      expect(schedule[2].medication.name).toBe('Bedtime Med')

      // Next scheduled dose should be the 07:30 one
      const next = getNextScheduledDose(clock)
      expect(next).not.toBeNull()
      expect(next.scheduledTime).toBe('07:30')
      expect(next.medication.name).toBe('Morning Med')
    })
  })

  describe('Dose Logging, Duplicate Prevention & Accidental Entry Correction', () => {
    it('creates dose log and rejects duplicate for the same slot', () => {
      const addRes = addMedication({
        name: 'Amlodipine',
        dosage: '5mg',
        times: ['09:00', '21:00'],
      })
      const medId = addRes.medication.id
      const clock = new Date('2026-11-15T09:05:00')

      // First log succeeds
      const log1 = logDose(medId, '09:00', clock)
      expect(log1.success).toBe(true)
      expect(log1.doseLog.status).toBe('taken')

      // Duplicate log for same slot rejected
      const log2 = logDose(medId, '09:00', clock)
      expect(log2.success).toBe(false)
      expect(log2.error).toMatch(/already been recorded/i)

      // Different time slot for same medication succeeds
      const log3 = logDose(medId, '21:00', clock)
      expect(log3.success).toBe(true)

      // Verify stored logs
      const logsToday = getDoseLogsForDate('2026-11-15')
      expect(logsToday.length).toBe(2)
    })

    it('allows correction of accidental entries with audit log trail', () => {
      const addRes = addMedication({
        name: 'Lisinopril',
        dosage: '10mg',
        times: ['08:00'],
      })
      const medId = addRes.medication.id
      const clock = new Date('2026-11-15T08:00:00')

      const logRes = logDose(medId, '08:00', clock)
      expect(logRes.success).toBe(true)
      const doseLogId = logRes.doseLog.id

      // Dose is taken
      expect(getDoseLogsForDate('2026-11-15').length).toBe(1)

      // Correct accidental dose
      const correctRes = correctAccidentalDose(doseLogId, 'User clicked by mistake', clock)
      expect(correctRes.success).toBe(true)
      expect(correctRes.auditEntry.action).toBe('corrected_accidental_entry')

      // Dose is no longer in active taken logs
      expect(getDoseLogsForDate('2026-11-15').length).toBe(0)

      // Audit trail records the correction
      const audits = getDoseAuditLogs()
      expect(audits.length).toBe(1)
      expect(audits[0].originalDoseLogId).toBe(doseLogId)
      expect(audits[0].medicationId).toBe(medId)
    })
  })
})
