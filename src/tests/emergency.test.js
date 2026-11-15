import { describe, it, expect, beforeEach } from 'vitest'
import {
  getEmergencySnapshot,
  saveEmergencySnapshot,
  isValidPhoneNumber,
  validateEmergencyData,
  ALLERGY_STATUSES,
} from '../modules/emergency.js'
import {
  initStore,
  clearStore,
  getStore,
  KEYS,
} from '../modules/store.js'
import {
  addMedication,
} from '../modules/medications.js'

describe('Emergency Snapshot (Swasthya Card) Module (Milestone 5)', () => {
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

  describe('Phone Number Validation', () => {
    it('accepts valid phone numbers with standard country codes or separators', () => {
      expect(isValidPhoneNumber('+91 9876543210')).toBe(true)
      expect(isValidPhoneNumber('9876543210')).toBe(true)
      expect(isValidPhoneNumber('(080) 2345-6789')).toBe(true)
      expect(isValidPhoneNumber('+1-800-555-0199')).toBe(true)
    })

    it('rejects invalid or too short phone numbers', () => {
      expect(isValidPhoneNumber('')).toBe(false)
      expect(isValidPhoneNumber('123')).toBe(false) // too short
      expect(isValidPhoneNumber('phone-number')).toBe(false)
      expect(isValidPhoneNumber('12345678901234567890')).toBe(false) // too long
    })
  })

  describe('Allergy Status Differentiation', () => {
    it('never assumes a blank allergy field means no allergies', () => {
      const snap = getEmergencySnapshot()
      // Default initial status must be UNKNOWN, not NO_KNOWN
      expect(snap.allergyStatus).toBe(ALLERGY_STATUSES.UNKNOWN)
      expect(snap.allergiesList).toEqual([])
    })

    it('distinguishes between NO_KNOWN and HAS_ALLERGIES', () => {
      saveEmergencySnapshot({
        patientName: 'Devaki Amma',
        allergyStatus: ALLERGY_STATUSES.NO_KNOWN,
        allergiesList: [],
      })
      let updated = getEmergencySnapshot()
      expect(updated.allergyStatus).toBe(ALLERGY_STATUSES.NO_KNOWN)

      saveEmergencySnapshot({
        patientName: 'Devaki Amma',
        allergyStatus: ALLERGY_STATUSES.HAS_ALLERGIES,
        allergiesList: ['Penicillin', 'Sulfa'],
      })
      updated = getEmergencySnapshot()
      expect(updated.allergyStatus).toBe(ALLERGY_STATUSES.HAS_ALLERGIES)
      expect(updated.allergiesList).toEqual(['Penicillin', 'Sulfa'])
    })
  })

  describe('Medication Synchronization', () => {
    it('automatically retrieves and synchronizes current active medications without duplicating store', () => {
      addMedication({
        name: 'Metformin',
        dosage: '500mg',
        times: ['08:00', '20:00'],
      })
      addMedication({
        name: 'Amlodipine',
        dosage: '5mg',
        times: ['09:00'],
      })

      const snapshot = getEmergencySnapshot()
      expect(snapshot.currentMedications.length).toBe(2)
      expect(snapshot.currentMedications[0].name).toBe('Metformin')
      expect(snapshot.currentMedications[1].name).toBe('Amlodipine')

      // Verify raw LocalStorage does not duplicate the full med array in nm_emergency
      const rawStored = getStore(KEYS.EMERGENCY)
      expect(rawStored.currentMedications).toBeUndefined()
    })
  })

  describe('Emergency Contact & Doctor Persistence', () => {
    it('saves and updates emergency contact and primary doctor', () => {
      const res = saveEmergencySnapshot({
        patientName: 'Ramanathan',
        age: '78',
        bloodType: 'B+',
        emergencyContact: {
          name: 'Suresh (Son)',
          phone: '+91 98450 12345',
          relationship: 'Son',
        },
        primaryDoctor: {
          name: 'Dr. V. Prasad',
          phone: '+91 80 2345 6789',
        },
      })

      expect(res.success).toBe(true)
      const data = getEmergencySnapshot()
      expect(data.patientName).toBe('Ramanathan')
      expect(data.bloodType).toBe('B+')
      expect(data.emergencyContact.name).toBe('Suresh (Son)')
      expect(data.emergencyContact.phone).toBe('+91 98450 12345')
      expect(data.primaryDoctor.name).toBe('Dr. V. Prasad')
    })

    it('rejects save if patient name is missing or phone format is invalid', () => {
      const emptyName = saveEmergencySnapshot({
        patientName: '',
      })
      expect(emptyName.success).toBe(false)
      expect(emptyName.errors[0]).toMatch(/patient full name is required/i)

      const badPhone = saveEmergencySnapshot({
        patientName: 'Sita',
        emergencyContact: {
          name: 'Son',
          phone: '123', // invalid
        },
      })
      expect(badPhone.success).toBe(false)
      expect(badPhone.errors[0]).toMatch(/phone number format is invalid/i)
    })
  })
})
