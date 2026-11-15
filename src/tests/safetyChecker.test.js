import { describe, expect, it } from 'vitest'
import {
  checkMedications,
  MIN_SAME_MEDICINE_GAP_MINUTES,
  SAFETY_CATEGORIES,
  SAFETY_CERTAINTIES,
  SAFETY_SEVERITIES,
} from '../safety/safetyChecker.js'

const medication = (overrides = {}) => ({
  id: 'med-1',
  name: 'Metformin',
  dosage: '500mg',
  unit: 'tablet',
  activeIngredient: 'Metformin hydrochloride',
  frequency: 'once_daily',
  times: ['08:00'],
  clinicianInstructions: 'Use the saved prescription instructions.',
  ...overrides,
})

describe('Medication Safety Checker', () => {
  it('flags confirmed duplicates and same-name dosage differences as possible', () => {
    const warnings = checkMedications([
      medication(),
      medication({ id: 'med-2' }),
      medication({ id: 'med-3', dosage: '1000mg' }),
    ])
    expect(warnings.some((item) => item.category === SAFETY_CATEGORIES.DUPLICATE_ENTRY && item.certainty === SAFETY_CERTAINTIES.CONFIRMED)).toBe(true)
    expect(warnings.some((item) => item.category === SAFETY_CATEGORIES.DUPLICATE_ENTRY && item.certainty === SAFETY_CERTAINTIES.POSSIBLE)).toBe(true)
  })

  it('only compares explicitly provided duplicate ingredients', () => {
    const warnings = checkMedications([
      medication({ activeIngredient: 'Metformin hydrochloride' }),
      medication({ id: 'med-2', activeIngredient: 'Metformin hydrochloride' }),
      medication({ id: 'med-3', name: 'Metformine', activeIngredient: 'Different ingredient' }),
      medication({ id: 'med-4', activeIngredient: '' }),
    ])
    const ingredientWarnings = warnings.filter((item) => item.category === SAFETY_CATEGORIES.DUPLICATE_INGREDIENT)
    expect(ingredientWarnings).toHaveLength(1)
    expect(ingredientWarnings.every((item) => item.certainty === SAFETY_CERTAINTIES.POSSIBLE)).toBe(true)
  })

  it('flags missing dosage and clinician instructions', () => {
    const warnings = checkMedications([medication({ dosage: '', clinicianInstructions: '' })])
    expect(warnings.map((item) => item.category)).toEqual(expect.arrayContaining([
      SAFETY_CATEGORIES.MISSING_DOSAGE,
      SAFETY_CATEGORIES.MISSING_INSTRUCTIONS,
    ]))
  })

  it('flags duplicate times, frequency mismatch, and close doses', () => {
    const warnings = checkMedications([
      medication({ frequency: 'twice_daily', times: ['08:00', '08:00', '08:30'] }),
    ])
    const schedule = warnings.find((item) => item.category === SAFETY_CATEGORIES.CONFLICTING_SCHEDULE)
    expect(schedule).toBeDefined()
    expect(schedule.severity).toBe(SAFETY_SEVERITIES.REVIEW_RECOMMENDED)
    expect(MIN_SAME_MEDICINE_GAP_MINUTES).toBe(60)
  })

  it('flags medicines at the same time as informational only', () => {
    const warnings = checkMedications([
      medication(),
      medication({ id: 'med-2', name: 'Amlodipine', activeIngredient: 'Amlodipine' }),
    ])
    const sameTime = warnings.find((item) => item.category === SAFETY_CATEGORIES.SAME_TIME_MEDICINES)
    expect(sameTime.severity).toBe(SAFETY_SEVERITIES.INFORMATIONAL)
    expect(sameTime.messageKey).toBe('safety.message.sameTimeMedicines')
  })

  it('reports incomplete fields, but not for a complete consistent record', () => {
    const incomplete = checkMedications([{ id: 'med-1', name: '', dosage: '', frequency: '', times: [] }])
    const record = incomplete.find((item) => item.category === SAFETY_CATEGORIES.INCOMPLETE_RECORD)
    expect(record.params.fields).toBe('name, dosage, frequency, times')
    expect(checkMedications([medication()])).toEqual([])
    expect(checkMedications([])).toEqual([])
  })

  it('does not mutate records or write to storage', () => {
    const records = [medication()]
    const before = JSON.stringify(records)
    checkMedications(records)
    expect(JSON.stringify(records)).toBe(before)
  })

  it('does not make interaction or dose-change claims', () => {
    const output = JSON.stringify(checkMedications([medication(), medication({ id: 'med-2', name: 'Amlodipine' })])).toLowerCase()
    expect(output).not.toContain('interaction')
    expect(output).not.toContain('stop')
    expect(output).not.toContain('skip')
    expect(output).not.toContain('double')
  })
})
