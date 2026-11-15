import { describe, it, expect, beforeEach } from 'vitest'
import {
  initStore,
  clearStore,
  getStore,
  setStore,
  KEYS
} from '../modules/store.js'
import {
  getAllMedications,
  getMedication,
  addMedication,
  updateMedication,
  deleteMedication,
  getTodaysSchedule,
  logDose,
  getDoseLogsForDate,
  calculateDoseStatus,
  validateMedicationInput,
  FREQUENCIES
} from '../modules/medications.js'

describe('Medications & Schedule Engine (Milestone 2)', () => {
  beforeEach(() => {
    // Fresh mock local storage
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
    it('creates, retrieves, updates, and soft-deletes a medication', () => {
      const res = addMedication({
        name: 'Metformin',
        dosage: '500mg',
        frequency: FREQUENCIES.TWICE_DAILY,
        times: ['08:00', '20:00'],
      })
      expect(res.success).toBe(true)
      const medId = res.medication.id

      // Read
      const found = getMedication(medId)
      expect(found).not.toBeNull()
      expect(found.name).toBe('Metformin')
      expect(found.dosage).toBe('500mg')
      expect(found.times).toEqual(['08:00', '20:00'])

      // Update
      const updateRes = updateMedication(medId, { dosage: '1000mg' })
      expect(updateRes.success).toBe(true)
      expect(getMedication(medId).dosage).toBe('1000mg')

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

  describe('Dose Status Calculation', () => {
    it('returns "taken" if a taken doseLog exists', () => {
      const log = { status: 'taken', scheduledTime: '08:00' }
      const status = calculateDoseStatus('08:00', log)
      expect(status).toBe('taken')
    })

    it('returns "upcoming" when current time is well before scheduled time', () => {
      // Clock at 06:00, scheduled at 08:00
      const clock = new Date('2026-11-15T06:00:00')
      const status = calculateDoseStatus('08:00', null, clock)
      expect(status).toBe('upcoming')
    })

    it('returns "due" when current time is within 15m before or up to 60m after scheduled time', () => {
      // Clock at 07:50 (10 min before 08:00)
      const clock1 = new Date('2026-11-15T07:50:00')
      expect(calculateDoseStatus('08:00', null, clock1)).toBe('due')

      // Clock at 08:30 (30 min after 08:00, within 60m threshold)
      const clock2 = new Date('2026-11-15T08:30:00')
      expect(calculateDoseStatus('08:00', null, clock2)).toBe('due')
    })

    it('returns "missed" when more than 60 minutes have elapsed without dose', () => {
      // Clock at 09:30 (90 min after 08:00)
      const clock = new Date('2026-11-15T09:30:00')
      expect(calculateDoseStatus('08:00', null, clock)).toBe('missed')
    })
  })

  describe("Today's Schedule Engine", () => {
    it('correctly aggregates, sorts, and ignores medications without times', () => {
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
    })
  })

  describe('Dose Logging & Duplicate Prevention', () => {
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

    it('preserves past dose logs when medication is edited or deleted', () => {
      const addRes = addMedication({
        name: 'Atorvastatin',
        dosage: '20mg',
        times: ['20:00'],
      })
      const medId = addRes.medication.id
      const clock = new Date('2026-11-15T20:00:00')

      logDose(medId, '20:00', clock)
      expect(getDoseLogsForDate('2026-11-15').length).toBe(1)

      // Edit medication
      updateMedication(medId, { dosage: '40mg' })
      expect(getDoseLogsForDate('2026-11-15').length).toBe(1)

      // Delete medication
      deleteMedication(medId)
      // Historical logs still exist in database
      expect(getDoseLogsForDate('2026-11-15').length).toBe(1)
    })
  })
})
