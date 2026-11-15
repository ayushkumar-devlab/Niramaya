import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateSevenDayAdherence,
  getMissedDoseHistory,
  isDoseInFuture,
  getPastDateRange,
} from '../modules/adherence.js'
import {
  initStore,
  clearStore,
  getStore,
  setStore,
  KEYS,
} from '../modules/store.js'
import {
  addMedication,
  logDose,
  correctAccidentalDose,
} from '../modules/medications.js'
import {
  getAllNotes,
  addNote,
  updateNote,
  deleteNote,
} from '../modules/caregiverNotes.js'
import {
  isPinProtected,
  verifyPin,
  setCaregiverPin,
  disablePinProtection,
  hashPin,
} from '../modules/caregiverAuth.js'

describe('Caregiver Mode (CareCircle) Analytics & Features (Milestone 4)', () => {
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

  describe('Adherence Calculation Engine', () => {
    it('returns 100% adherence when all eligible scheduled doses are taken', () => {
      // 1 med, 1 daily dose
      const clock = new Date('2026-11-15T12:00:00')
      const medRes = addMedication({
        name: 'Metformin',
        dosage: '500mg',
        times: ['08:00'],
        startDate: '2026-11-09',
      })
      const medId = medRes.medication.id

      // Log dose for each of past 7 days
      const pastDates = getPastDateRange(7, clock)
      pastDates.forEach((date) => {
        const dClock = new Date(`${date}T08:30:00`)
        logDose(medId, '08:00', dClock)
      })

      const summary = calculateSevenDayAdherence({ clock, days: 7 })
      expect(summary.totalEligibleDoses).toBe(7)
      expect(summary.dosesTaken).toBe(7)
      expect(summary.dosesUnrecorded).toBe(0)
      expect(summary.adherenceRate).toBe(100)
    })

    it('correctly calculates partial adherence and identifies unrecorded doses', () => {
      const clock = new Date('2026-11-15T12:00:00')
      const medRes = addMedication({
        name: 'Amlodipine',
        dosage: '5mg',
        times: ['08:00'],
        startDate: '2026-11-09',
      })
      const medId = medRes.medication.id

      // Only take 5 out of 7 days
      const pastDates = getPastDateRange(7, clock)
      for (let i = 0; i < 5; i++) {
        const dClock = new Date(`${pastDates[i]}T08:30:00`)
        logDose(medId, '08:00', dClock)
      }

      const summary = calculateSevenDayAdherence({ clock, days: 7 })
      expect(summary.totalEligibleDoses).toBe(7)
      expect(summary.dosesTaken).toBe(5)
      expect(summary.dosesUnrecorded).toBe(2)
      // 5 / 7 = 71.4% -> 71%
      expect(summary.adherenceRate).toBe(71)
    })

    it('handles zero scheduled doses gracefully without division by zero', () => {
      const clock = new Date('2026-11-15T12:00:00')
      const summary = calculateSevenDayAdherence({ clock, days: 7 })
      expect(summary.totalEligibleDoses).toBe(0)
      expect(summary.adherenceRate).toBe(100)
    })

    it('strictly excludes future doses from adherence calculation', () => {
      // Clock at 07:00 AM on 2026-11-15
      const clock = new Date('2026-11-15T07:00:00')
      const medRes = addMedication({
        name: 'Thyroxine',
        dosage: '50mcg',
        times: ['08:00', '20:00'],
        startDate: '2026-11-15',
      })
      const medId = medRes.medication.id

      // Both doses (08:00 and 20:00) on 2026-11-15 are in the future
      const summary = calculateSevenDayAdherence({ clock, days: 7 })
      expect(summary.totalEligibleDoses).toBe(0)
    })

    it('calculates medication-specific adherence independently across multiple drugs', () => {
      const clock = new Date('2026-11-15T12:00:00')
      const med1 = addMedication({
        name: 'Med 1',
        dosage: '10mg',
        times: ['08:00'],
        startDate: '2026-11-09',
      }).medication

      const med2 = addMedication({
        name: 'Med 2',
        dosage: '20mg',
        times: ['08:00'],
        startDate: '2026-11-09',
      }).medication

      // Med 1 taken 7/7, Med 2 taken 0/7
      const pastDates = getPastDateRange(7, clock)
      pastDates.forEach((date) => {
        logDose(med1.id, '08:00', new Date(`${date}T08:30:00`))
      })

      const summary = calculateSevenDayAdherence({ clock, days: 7 })
      expect(summary.totalEligibleDoses).toBe(14)
      expect(summary.dosesTaken).toBe(7)
      expect(summary.adherenceRate).toBe(50)

      const stat1 = summary.medicationStats.find((s) => s.id === med1.id)
      const stat2 = summary.medicationStats.find((s) => s.id === med2.id)

      expect(stat1.adherenceRate).toBe(100)
      expect(stat2.adherenceRate).toBe(0)
    })

    it('handles corrected/undone records appropriately', () => {
      const clock = new Date('2026-11-15T12:00:00')
      const med = addMedication({
        name: 'Aspirin',
        dosage: '75mg',
        times: ['08:00'],
        startDate: '2026-11-15',
      }).medication

      const logRes = logDose(med.id, '08:00', clock)
      // Correct accidental dose
      correctAccidentalDose(logRes.doseLog.id, 'accidental entry', clock)

      const summary = calculateSevenDayAdherence({ clock, days: 7 })
      expect(summary.dosesCorrected).toBe(1)
      expect(summary.dosesTaken).toBe(0)
      expect(summary.dosesUnrecorded).toBe(1)
    })
  })

  describe('Missed Dose History Query', () => {
    it('returns unrecorded past doses filtered by medication', () => {
      const clock = new Date('2026-11-15T14:00:00')
      const med1 = addMedication({
        name: 'Morning Med',
        dosage: '10mg',
        times: ['08:00'],
        startDate: '2026-11-15',
      }).medication

      const med2 = addMedication({
        name: 'Another Med',
        dosage: '5mg',
        times: ['08:00'],
        startDate: '2026-11-15',
      }).medication

      const historyAll = getMissedDoseHistory({ clock })
      expect(historyAll.length).toBe(2)

      const historyFiltered = getMissedDoseHistory({ medicationId: med1.id, clock })
      expect(historyFiltered.length).toBe(1)
      expect(historyFiltered[0].medicationName).toBe('Morning Med')
    })
  })

  describe('Caregiver Notes Persistence', () => {
    it('creates, edits, lists, and deletes caregiver notes', () => {
      const res = addNote({
        content: 'Patient complained of knee pain.',
        author: 'Nurse Anitha',
      })
      expect(res.success).toBe(true)
      const noteId = res.note.id

      const notes = getAllNotes()
      expect(notes.length).toBe(1)
      expect(notes[0].content).toBe('Patient complained of knee pain.')

      // Edit
      const editRes = updateNote(noteId, 'Patient knee pain improved after rest.')
      expect(editRes.success).toBe(true)
      expect(getAllNotes()[0].content).toBe('Patient knee pain improved after rest.')

      // Delete
      const delSuccess = deleteNote(noteId)
      expect(delSuccess).toBe(true)
      expect(getAllNotes().length).toBe(0)
    })

    it('rejects empty note contents', () => {
      const emptyRes = addNote({ content: '   ' })
      expect(emptyRes.success).toBe(false)
      expect(emptyRes.error).toMatch(/cannot be empty/i)
    })
  })

  describe('Caregiver PIN Privacy Gate', () => {
    it('handles PIN setup, verification, salted hashing, and disabling', () => {
      expect(isPinProtected()).toBe(false)

      const setRes = setCaregiverPin('1234')
      expect(setRes.success).toBe(true)
      expect(isPinProtected()).toBe(true)

      // Verification
      expect(verifyPin('1234')).toBe(true)
      expect(verifyPin('9999')).toBe(false)

      // Plaintext PIN is not stored directly in store
      const config = getStore(KEYS.CAREGIVER)
      expect(config.hashedPin).not.toBe('1234')
      expect(config.hashedPin).toBe(hashPin('1234'))

      // Disable
      disablePinProtection()
      expect(isPinProtected()).toBe(false)
    })
  })
})
