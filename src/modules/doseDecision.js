/**
 * doseDecision.js — Explainable Missed-Dose Assistance Engine
 *
 * MEDICAL SAFETY MANDATE:
 * This engine NEVER independently prescribes, generates, or infers missed-dose advice.
 * It strictly processes verified clinician instructions stored in the user's local record,
 * detects missing or conflicting data, flags already-recorded doses, prevents double-dosing,
 * and refers to a healthcare professional whenever verified information is absent or ambiguous.
 */

export const DECISION_STATES = {
  VERIFIED_INSTRUCTIONS: 'VERIFIED_INSTRUCTIONS',
  NO_ADVICE: 'NO_ADVICE',
  PARTIAL_INSTRUCTIONS: 'PARTIAL_INSTRUCTIONS',
  CONFLICTING_INSTRUCTIONS: 'CONFLICTING_INSTRUCTIONS',
  ALREADY_RECORDED: 'ALREADY_RECORDED',
  UNKNOWN_MEDICATION: 'UNKNOWN_MEDICATION',
}

export const VISUAL_STYLES = {
  VERIFIED: 'verified',     // Green - Verified saved instructions
  MORE_INFO: 'more_info',   // Amber - More information required / partial
  PROFESSIONAL: 'professional', // Blue/Navy - Professional assistance required
}

/**
 * Evaluates missed-dose context and returns an explainable structured decision.
 *
 * @param {object} context
 * @param {object|null} context.medication — Medication record from store
 * @param {string} context.scheduledTime — "HH:MM" missed dose scheduled time
 * @param {string} [context.rememberedTime] — "HH:MM" when remembered
 * @param {boolean} [context.hasRecordedCurrentDose=false] — If dose is already recorded
 * @param {boolean} [context.hasRecordedNextDose=false] — If subsequent dose is already taken
 * @param {string|null} [context.nextScheduledTime=null] — Time of the next dose
 * @param {Date} [context.clock=new Date()] — Clock for deterministic evaluation
 * @returns {object} Structured decision result
 */
export function evaluateMissedDose(context = {}) {
  const {
    medication,
    scheduledTime,
    rememberedTime = null,
    hasRecordedCurrentDose = false,
    hasRecordedNextDose = false,
    nextScheduledTime = null,
  } = context

  // 1. Unknown / Missing Medication
  if (!medication || typeof medication !== 'object' || !medication.name) {
    return {
      status: DECISION_STATES.UNKNOWN_MEDICATION,
      visualStyle: VISUAL_STYLES.PROFESSIONAL,
      canTake: false,
      title: 'Medication Not Found',
      explanation: 'This medication record could not be found or verified in your saved list.',
      availableInfo: {
        scheduledTime: scheduledTime || 'Not specified',
        rememberedTime: rememberedTime || 'Not specified',
      },
      missingInfo: ['Valid medication profile', 'Clinician instructions'],
      instructionSource: null,
      verificationDate: null,
      recommendedNextStep: 'Do not guess. Contact your prescribing physician or pharmacist immediately.',
      neverDoubledoseWarning: true,
      disclaimer: 'Niramaya displays recorded clinician notes only and never generates medical advice.',
    }
  }

  // 2. Already Recorded Dose
  if (hasRecordedCurrentDose) {
    return {
      status: DECISION_STATES.ALREADY_RECORDED,
      visualStyle: VISUAL_STYLES.MORE_INFO,
      canTake: false,
      title: 'Dose Already Recorded',
      explanation: `Our records show that your ${scheduledTime} dose of ${medication.name} has already been marked as taken today.`,
      availableInfo: {
        medicationName: medication.name,
        dosage: medication.dosage || medication.dose || 'Not specified',
        scheduledTime,
        status: 'Recorded as taken',
      },
      missingInfo: [],
      instructionSource: medication.instructionSource || 'Patient Dose Log',
      verificationDate: medication.verificationDate || null,
      recommendedNextStep: 'Do not take extra medicine now. Do not double doses to make up for an uncertain dose.',
      neverDoubledoseWarning: true,
      disclaimer: 'Niramaya displays recorded clinician notes only and never generates medical advice.',
    }
  }

  // 3. Next Dose Already Recorded or Imminent Confusion
  if (hasRecordedNextDose) {
    return {
      status: DECISION_STATES.CONFLICTING_INSTRUCTIONS,
      visualStyle: VISUAL_STYLES.PROFESSIONAL,
      canTake: false,
      title: 'Subsequent Dose Already Taken',
      explanation: `A later dose for ${medication.name} has already been logged. Taking the earlier missed dose now could lead to taking medication too closely together.`,
      availableInfo: {
        medicationName: medication.name,
        dosage: medication.dosage || medication.dose || '',
        scheduledTime,
        nextScheduledTime: nextScheduledTime || 'Later today',
      },
      missingInfo: ['Clinician instruction for out-of-order dosing'],
      instructionSource: medication.instructionSource || null,
      verificationDate: medication.verificationDate || null,
      recommendedNextStep: 'Skip the missed dose and resume your regular schedule, or consult your pharmacist.',
      neverDoubledoseWarning: true,
      disclaimer: 'Niramaya displays recorded clinician notes only and never generates medical advice.',
    }
  }

  // Retrieve instructions from medication record
  const clinicianNotes = typeof medication.clinicianInstructions === 'string'
    ? medication.clinicianInstructions.trim()
    : ''
  const generalInstructions = typeof medication.instructions === 'string'
    ? medication.instructions.trim()
    : ''
  const instructionSource = medication.instructionSource || medication.clinicianSource || null
  const verificationDate = medication.verificationDate || null

  // Check for explicit conflicting saved instructions
  const hasConflict = detectInstructionConflict(clinicianNotes, generalInstructions)
  if (hasConflict) {
    return {
      status: DECISION_STATES.CONFLICTING_INSTRUCTIONS,
      visualStyle: VISUAL_STYLES.PROFESSIONAL,
      canTake: false,
      title: 'Conflicting Instructions Detected',
      explanation: `Your recorded clinician notes and saved directions contain conflicting guidance for ${medication.name}. The system will not choose between them automatically.`,
      availableInfo: {
        medicationName: medication.name,
        clinicianNotes,
        generalInstructions,
        scheduledTime,
      },
      missingInfo: ['Single unambiguous clinician instruction'],
      instructionSource,
      verificationDate,
      recommendedNextStep: 'Contact your prescribing physician or pharmacist to clarify the correct instruction.',
      neverDoubledoseWarning: true,
      disclaimer: 'Niramaya displays recorded clinician notes only and never generates medical advice.',
    }
  }

  // 4. No Clinician Instructions Available
  if (!clinicianNotes) {
    return {
      status: DECISION_STATES.NO_ADVICE,
      visualStyle: VISUAL_STYLES.PROFESSIONAL,
      canTake: false,
      title: 'No Clinician Instructions on File',
      explanation: `There are no verified clinician-provided missed-dose instructions saved for ${medication.name}. Niramaya will not invent or guess medical advice.`,
      availableInfo: {
        medicationName: medication.name,
        dosage: medication.dosage || medication.dose || 'Not specified',
        scheduledTime,
        generalInstructions: generalInstructions || 'None recorded',
      },
      missingInfo: [
        'Clinician-provided missed-dose protocol',
        'Prescribing doctor contact confirmation',
      ],
      instructionSource: null,
      verificationDate: null,
      recommendedNextStep: 'Call your pharmacist or doctor before taking or skipping this dose. Do not double doses.',
      neverDoubledoseWarning: true,
      disclaimer: 'Niramaya displays recorded clinician notes only and never generates medical advice.',
    }
  }

  // 5. Partial Instructions (e.g. notes exist but missing source or verification date or incomplete)
  const isPartial = !instructionSource || !verificationDate || isInstructionIncomplete(clinicianNotes)
  if (isPartial) {
    const missingItems = []
    if (!instructionSource) missingItems.push('Clinician source attribution')
    if (!verificationDate) missingItems.push('Verification date')
    if (isInstructionIncomplete(clinicianNotes)) missingItems.push('Specific timing window guidance')

    return {
      status: DECISION_STATES.PARTIAL_INSTRUCTIONS,
      visualStyle: VISUAL_STYLES.MORE_INFO,
      canTake: false,
      title: 'Partial Information Available',
      explanation: `We found recorded clinician notes for ${medication.name}, but some verification details are missing. Review the recorded text carefully and confirm with a professional if uncertain.`,
      availableInfo: {
        medicationName: medication.name,
        dosage: medication.dosage || medication.dose || '',
        recordedNotes: clinicianNotes,
        scheduledTime,
        rememberedTime: rememberedTime || 'Not specified',
      },
      missingInfo: missingItems,
      instructionSource: instructionSource || 'Unspecified clinician record',
      verificationDate: verificationDate || 'Date not recorded',
      recommendedNextStep: 'Read your recorded clinician notes below. If uncertain about timing, call your pharmacist.',
      neverDoubledoseWarning: true,
      disclaimer: 'This application is displaying your saved notes as recorded, not independently validating them.',
    }
  }

  // 6. Verified Instructions (Notes, Source, and Verification Date all present and clear)
  return {
    status: DECISION_STATES.VERIFIED_INSTRUCTIONS,
    visualStyle: VISUAL_STYLES.VERIFIED,
    canTake: false, // App never commands the user to take; it surfaces verified instructions
    title: 'Verified Clinician Instructions Available',
    explanation: `Here are the exact clinician instructions saved on file for ${medication.name}:`,
    availableInfo: {
      medicationName: medication.name,
      dosage: medication.dosage || medication.dose || '',
      scheduledTime,
      rememberedTime: rememberedTime || 'Not specified',
      exactInstructions: clinicianNotes,
    },
    missingInfo: [],
    instructionSource,
    verificationDate,
    recommendedNextStep: `Follow the saved clinician instructions above. If you have questions, contact ${instructionSource}.`,
    neverDoubledoseWarning: true,
    disclaimer: 'Niramaya is displaying your recorded instructions exactly as entered from your healthcare provider. We do not independently evaluate or prescribe medicine.',
  }
}

/**
 * Detects obvious contradictory phrasing between saved notes.
 * @param {string} notes
 * @param {string} general
 * @returns {boolean}
 */
export function detectInstructionConflict(notes, general) {
  if (!notes || !general) return false
  const n = notes.toLowerCase()
  const g = general.toLowerCase()

  // E.g., one says "skip" and the other says "take immediately"
  const nSaysSkip = n.includes('skip') || n.includes('do not take')
  const gSaysTake = g.includes('take immediately') || g.includes('take as soon as')
  if (nSaysSkip && gSaysTake) return true

  const gSaysSkip = g.includes('skip') || g.includes('do not take')
  const nSaysTake = n.includes('take immediately') || n.includes('take as soon as')
  if (gSaysSkip && nSaysTake) return true

  return false
}

/**
 * Checks if recorded text appears truncated, vague, or lacking detail.
 * @param {string} text
 * @returns {boolean}
 */
export function isInstructionIncomplete(text) {
  if (!text || text.trim().length < 15) return true
  const vagueTerms = ['ask doctor', 'see doctor', 'call clinic', 'unknown', 'tbd']
  if (vagueTerms.includes(text.trim().toLowerCase())) return true
  return false
}
