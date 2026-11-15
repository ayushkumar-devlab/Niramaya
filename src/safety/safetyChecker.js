export const SAFETY_CATEGORIES = Object.freeze({
  DUPLICATE_ENTRY: 'duplicate_entry',
  DUPLICATE_INGREDIENT: 'duplicate_ingredient',
  MISSING_DOSAGE: 'missing_dosage',
  MISSING_INSTRUCTIONS: 'missing_instructions',
  CONFLICTING_SCHEDULE: 'conflicting_schedule',
  SAME_TIME_MEDICINES: 'same_time_medicines',
  INCOMPLETE_RECORD: 'incomplete_record',
})

export const SAFETY_SEVERITIES = Object.freeze({
  INFORMATIONAL: 'informational',
  REVIEW_RECOMMENDED: 'review_recommended',
  URGENT_PROFESSIONAL_REVIEW: 'urgent_professional_review',
})

export const SAFETY_CERTAINTIES = Object.freeze({
  CONFIRMED: 'confirmed',
  POSSIBLE: 'possible',
  NEEDS_VERIFICATION: 'needs_verification',
})

export const MIN_SAME_MEDICINE_GAP_MINUTES = 60

const FREQUENCY_COUNTS = Object.freeze({
  once_daily: 1,
  twice_daily: 2,
  three_times_daily: 3,
  daily: 1,
  twice: 2,
  thrice: 3,
  four: 4,
})

function normalized(value) {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, ' ') : ''
}

function dosageOf(medication) {
  return medication?.dosage ?? medication?.dose ?? ''
}

function medicineId(medication, index) {
  return medication?.id || `record-${index}`
}

function warning(category, severity, medicationIds, messageKey, params = {}, nextStepKey, certainty) {
  return {
    id: `${category}:${medicationIds.slice().sort().join(',')}:${messageKey}`,
    category,
    severity,
    medicationIds: medicationIds.slice().sort(),
    messageKey,
    params,
    nextStepKey,
    certainty,
  }
}

function minutes(time) {
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time.trim())) return null
  const [hours, mins] = time.trim().split(':').map(Number)
  return hours * 60 + mins
}

function duplicateTimes(times) {
  if (!Array.isArray(times)) return false
  const validTimes = times.filter((time) => minutes(time) !== null).map((time) => time.trim())
  return new Set(validTimes).size !== validTimes.length
}

function hasCloseTimes(times) {
  if (!Array.isArray(times)) return false
  const values = times.map(minutes).filter((value) => value !== null).sort((a, b) => a - b)
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] - values[index - 1] < MIN_SAME_MEDICINE_GAP_MINUTES) return true
  }
  return false
}

function missingFields(medication) {
  const missing = []
  if (!normalized(medication?.name)) missing.push('name')
  if (!normalized(dosageOf(medication))) missing.push('dosage')
  if (!normalized(medication?.frequency)) missing.push('frequency')
  if (!Array.isArray(medication?.times) || medication.times.length === 0) missing.push('times')
  return missing
}

export function checkMedications(medications = [], options = {}) {
  const records = Array.isArray(medications) ? medications : []
  const warnings = []
  const ids = records.map(medicineId)
  const add = (...args) => warnings.push(warning(...args))

  records.forEach((medication, index) => {
    const id = ids[index]
    const missing = missingFields(medication)
    if (missing.length > 0) {
      add(
        SAFETY_CATEGORIES.INCOMPLETE_RECORD,
        missing.length >= 3 ? SAFETY_SEVERITIES.URGENT_PROFESSIONAL_REVIEW : SAFETY_SEVERITIES.REVIEW_RECOMMENDED,
        [id],
        'safety.message.incompleteRecord',
        { fields: missing.join(', ') },
        'safety.nextStep.reviewRecord',
        SAFETY_CERTAINTIES.NEEDS_VERIFICATION
      )
    }

    if (!normalized(dosageOf(medication)) || (typeof dosageOf(medication) !== 'string' && dosageOf(medication) !== undefined)) {
      add(
        SAFETY_CATEGORIES.MISSING_DOSAGE,
        SAFETY_SEVERITIES.REVIEW_RECOMMENDED,
        [id],
        'safety.message.missingDosage',
        {},
        'safety.nextStep.checkLabel',
        SAFETY_CERTAINTIES.NEEDS_VERIFICATION
      )
    }

    if (!normalized(medication?.clinicianInstructions)) {
      add(
        SAFETY_CATEGORIES.MISSING_INSTRUCTIONS,
        SAFETY_SEVERITIES.INFORMATIONAL,
        [id],
        'safety.message.missingInstructions',
        {},
        'safety.nextStep.askProfessional',
        SAFETY_CERTAINTIES.NEEDS_VERIFICATION
      )
    }

    if (duplicateTimes(medication?.times) || (FREQUENCY_COUNTS[medication?.frequency] && medication.times?.length !== FREQUENCY_COUNTS[medication.frequency]) || hasCloseTimes(medication?.times)) {
      add(
        SAFETY_CATEGORIES.CONFLICTING_SCHEDULE,
        SAFETY_SEVERITIES.REVIEW_RECOMMENDED,
        [id],
        'safety.message.conflictingSchedule',
        {},
        'safety.nextStep.reviewSchedule',
        SAFETY_CERTAINTIES.NEEDS_VERIFICATION
      )
    }
  })

  for (let first = 0; first < records.length; first += 1) {
    for (let second = first + 1; second < records.length; second += 1) {
      const left = records[first]
      const right = records[second]
      const leftName = normalized(left?.name)
      const rightName = normalized(right?.name)
      if (leftName && leftName === rightName) {
        const sameDose = normalized(dosageOf(left)) === normalized(dosageOf(right))
        const sameUnit = normalized(left?.unit) === normalized(right?.unit)
        add(
          SAFETY_CATEGORIES.DUPLICATE_ENTRY,
          sameDose && sameUnit ? SAFETY_SEVERITIES.REVIEW_RECOMMENDED : SAFETY_SEVERITIES.INFORMATIONAL,
          [ids[first], ids[second]],
          sameDose && sameUnit ? 'safety.message.duplicateEntry' : 'safety.message.sameNameDifferentDosage',
          {},
          'safety.nextStep.reviewRecord',
          sameDose && sameUnit ? SAFETY_CERTAINTIES.CONFIRMED : SAFETY_CERTAINTIES.POSSIBLE
        )
      }

      const leftIngredient = normalized(left?.activeIngredient)
      const rightIngredient = normalized(right?.activeIngredient)
      if (leftIngredient && rightIngredient && leftIngredient === rightIngredient) {
        add(
          SAFETY_CATEGORIES.DUPLICATE_INGREDIENT,
          SAFETY_SEVERITIES.REVIEW_RECOMMENDED,
          [ids[first], ids[second]],
          'safety.message.duplicateIngredient',
          {},
          'safety.nextStep.askProfessional',
          SAFETY_CERTAINTIES.POSSIBLE
        )
      }
    }
  }

  const times = new Map()
  records.forEach((medication, index) => {
    if (!Array.isArray(medication?.times)) return
    medication.times.forEach((time) => {
      const key = String(time).trim()
      if (!times.has(key)) times.set(key, [])
      times.get(key).push(ids[index])
    })
  })
  for (const [time, medicationIds] of times) {
    if (medicationIds.length > 1) {
      add(
        SAFETY_CATEGORIES.SAME_TIME_MEDICINES,
        SAFETY_SEVERITIES.INFORMATIONAL,
        medicationIds,
        'safety.message.sameTimeMedicines',
        { time },
        'safety.nextStep.reviewRecords',
        SAFETY_CERTAINTIES.NEEDS_VERIFICATION
      )
    }
  }

  const severityOrder = {
    [SAFETY_SEVERITIES.URGENT_PROFESSIONAL_REVIEW]: 0,
    [SAFETY_SEVERITIES.REVIEW_RECOMMENDED]: 1,
    [SAFETY_SEVERITIES.INFORMATIONAL]: 2,
  }
  const categoryOrder = Object.values(SAFETY_CATEGORIES)
  const unique = new Map()
  warnings.forEach((item) => unique.set(item.id, item))
  return [...unique.values()].sort((left, right) => (
    severityOrder[left.severity] - severityOrder[right.severity]
    || categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category)
    || left.id.localeCompare(right.id)
  ))
}
