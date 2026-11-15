import { describe, it, expect } from 'vitest'
import {
  evaluateMissedDose,
  detectInstructionConflict,
  isInstructionIncomplete,
  DECISION_STATES,
  VISUAL_STYLES
} from '../modules/doseDecision.js'

describe('DoseDecision Assistant Engine (Milestone 3)', () => {
  const verifiedMed = {
    id: 'med-1',
    name: 'Metformin',
    dosage: '500mg',
    clinicianInstructions: 'If missed by under 4 hours, take with food. Otherwise skip and resume next scheduled dose.',
    instructionSource: 'Dr. Ramesh (Endocrinologist)',
    verificationDate: '2026-10-15',
    times: ['08:00', '20:00'],
  }

  describe('Core States & Verified Instructions', () => {
    it('returns VERIFIED_INSTRUCTIONS when notes, source, and date are present', () => {
      const res = evaluateMissedDose({
        medication: verifiedMed,
        scheduledTime: '08:00',
        rememberedTime: '09:30',
        hasRecordedCurrentDose: false,
        hasRecordedNextDose: false,
      })

      expect(res.status).toBe(DECISION_STATES.VERIFIED_INSTRUCTIONS)
      expect(res.visualStyle).toBe(VISUAL_STYLES.VERIFIED)
      expect(res.instructionSource).toBe('Dr. Ramesh (Endocrinologist)')
      expect(res.verificationDate).toBe('2026-10-15')
      expect(res.availableInfo.exactInstructions).toBe(verifiedMed.clinicianInstructions)
      expect(res.missingInfo.length).toBe(0)
      expect(res.neverDoubledoseWarning).toBe(true)
    })

    it('returns NO_ADVICE when medication has no clinician instructions', () => {
      const medNoNotes = {
        id: 'med-2',
        name: 'Amlodipine',
        dosage: '5mg',
        clinicianInstructions: '',
        times: ['09:00'],
      }

      const res = evaluateMissedDose({
        medication: medNoNotes,
        scheduledTime: '09:00',
        rememberedTime: '11:00',
      })

      expect(res.status).toBe(DECISION_STATES.NO_ADVICE)
      expect(res.visualStyle).toBe(VISUAL_STYLES.PROFESSIONAL)
      expect(res.explanation).toMatch(/no verified clinician-provided missed-dose instructions/i)
      expect(res.recommendedNextStep).toMatch(/call your pharmacist or doctor/i)
      expect(res.neverDoubledoseWarning).toBe(true)
    })

    it('returns PARTIAL_INSTRUCTIONS when source or verification date is missing', () => {
      const medMissingSource = {
        id: 'med-3',
        name: 'Atorvastatin',
        dosage: '20mg',
        clinicianInstructions: 'Take as soon as remembered if before evening.',
        instructionSource: '', // Missing source
        verificationDate: '',  // Missing date
        times: ['21:00'],
      }

      const res = evaluateMissedDose({
        medication: medMissingSource,
        scheduledTime: '21:00',
        rememberedTime: '23:00',
      })

      expect(res.status).toBe(DECISION_STATES.PARTIAL_INSTRUCTIONS)
      expect(res.visualStyle).toBe(VISUAL_STYLES.MORE_INFO)
      expect(res.missingInfo).toContain('Clinician source attribution')
      expect(res.missingInfo).toContain('Verification date')
      expect(res.neverDoubledoseWarning).toBe(true)
    })

    it('returns UNKNOWN_MEDICATION if medication object is null or missing', () => {
      const res = evaluateMissedDose({
        medication: null,
        scheduledTime: '08:00',
      })

      expect(res.status).toBe(DECISION_STATES.UNKNOWN_MEDICATION)
      expect(res.visualStyle).toBe(VISUAL_STYLES.PROFESSIONAL)
      expect(res.recommendedNextStep).toMatch(/contact your prescribing physician or pharmacist/i)
    })

    it('returns ALREADY_RECORDED when the dose was already taken today', () => {
      const res = evaluateMissedDose({
        medication: verifiedMed,
        scheduledTime: '08:00',
        hasRecordedCurrentDose: true,
      })

      expect(res.status).toBe(DECISION_STATES.ALREADY_RECORDED)
      expect(res.visualStyle).toBe(VISUAL_STYLES.MORE_INFO)
      expect(res.explanation).toMatch(/already been marked as taken today/i)
      expect(res.recommendedNextStep).toMatch(/do not double/i)
    })

    it('returns CONFLICTING_INSTRUCTIONS when next dose is already taken', () => {
      const res = evaluateMissedDose({
        medication: verifiedMed,
        scheduledTime: '08:00',
        hasRecordedNextDose: true,
      })

      expect(res.status).toBe(DECISION_STATES.CONFLICTING_INSTRUCTIONS)
      expect(res.visualStyle).toBe(VISUAL_STYLES.PROFESSIONAL)
      expect(res.explanation).toMatch(/later dose.*has already been logged/i)
      expect(res.recommendedNextStep).toMatch(/skip the missed dose/i)
    })

    it('detects conflicting recorded instructions between clinician notes and general directions', () => {
      const conflictingMed = {
        id: 'med-4',
        name: 'Thyroxine',
        dosage: '50mcg',
        clinicianInstructions: 'Skip dose if remembered after noon.',
        instructions: 'Take immediately with water.',
        instructionSource: 'Dr. Sharma',
        verificationDate: '2026-09-01',
      }

      const res = evaluateMissedDose({
        medication: conflictingMed,
        scheduledTime: '07:00',
      })

      expect(res.status).toBe(DECISION_STATES.CONFLICTING_INSTRUCTIONS)
      expect(res.visualStyle).toBe(VISUAL_STYLES.PROFESSIONAL)
      expect(res.explanation).toMatch(/contain conflicting guidance/i)
      expect(res.recommendedNextStep).toMatch(/contact your prescribing physician or pharmacist/i)
    })
  })

  describe('Medical Safety Invariants', () => {
    it('NEVER recommends taking a double dose in any returned state', () => {
      const testCases = [
        { medication: verifiedMed, scheduledTime: '08:00' },
        { medication: { ...verifiedMed, clinicianInstructions: '' }, scheduledTime: '08:00' },
        { medication: null, scheduledTime: '08:00' },
        { medication: verifiedMed, scheduledTime: '08:00', hasRecordedCurrentDose: true },
        { medication: verifiedMed, scheduledTime: '08:00', hasRecordedNextDose: true },
      ]

      for (const tc of testCases) {
        const res = evaluateMissedDose(tc)
        const combinedText = JSON.stringify(res).toLowerCase()
        expect(combinedText).not.toContain('take a double dose')
        expect(combinedText).not.toContain('take two doses')
        expect(combinedText).not.toContain('double the next dose')
        expect(res.neverDoubledoseWarning).toBe(true)
      }
    })

    it('does not assume two different medications share instructions', () => {
      const medA = {
        name: 'Medication A',
        clinicianInstructions: 'Take if within 2 hours',
        instructionSource: 'Clinic',
        verificationDate: '2026-01-01',
      }
      const medB = {
        name: 'Medication B',
        clinicianInstructions: '', // No instructions
      }

      const resA = evaluateMissedDose({ medication: medA, scheduledTime: '08:00' })
      const resB = evaluateMissedDose({ medication: medB, scheduledTime: '08:00' })

      expect(resA.status).toBe(DECISION_STATES.VERIFIED_INSTRUCTIONS)
      expect(resB.status).toBe(DECISION_STATES.NO_ADVICE)
    })
  })

  describe('Helper logic', () => {
    it('detectInstructionConflict accurately flags contradictions', () => {
      expect(detectInstructionConflict('Skip missed dose', 'Take immediately')).toBe(true)
      expect(detectInstructionConflict('Take with food', 'Take after breakfast')).toBe(false)
    })

    it('isInstructionIncomplete flags vague strings', () => {
      expect(isInstructionIncomplete('ask doctor')).toBe(true)
      expect(isInstructionIncomplete('too short')).toBe(true)
      expect(isInstructionIncomplete('If missed by under 4 hours, take with breakfast; otherwise skip.')).toBe(false)
    })
  })
})
