// src/views/doseDecision.js — Dedicated Explainable Missed-Dose Assistant Interface

import { t, getLocale } from '../i18n/index.js'
import { getAllMedications, getTodayString } from '../modules/medications.js'
import {
  evaluateMissedDose,
  DECISION_STATES,
  VISUAL_STYLES,
} from '../modules/doseDecision.js'
import { getStore, KEYS } from '../modules/store.js'

export function renderDoseDecision(container) {
  if (!container) return

  const medications = getAllMedications()

  // Format 12h display
  function formatTime12h(timeStr) {
    if (!timeStr) return ''
    const [hStr, mStr] = timeStr.split(':')
    let hours = parseInt(hStr, 10)
    const minutes = mStr || '00'
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12 || 12
    return `${hours}:${minutes} ${ampm}`
  }

  // Pre-selected parameters from route or state
  const hash = window.location.hash || ''
  const queryParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '')
  const preselectedMedId = queryParams.get('medId') || ''
  const preselectedTime = queryParams.get('time') || ''

  // Now time in HH:MM
  const now = new Date()
  const currentHours = String(now.getHours()).padStart(2, '0')
  const currentMinutes = String(now.getMinutes()).padStart(2, '0')
  const defaultRememberedTime = `${currentHours}:${currentMinutes}`

  container.innerHTML = `
    <div class="view-container dose-decision-container" role="region" aria-labelledby="dose-decision-heading">
      <div class="view-header">
        <h1 id="dose-decision-heading" class="senior-heading" tabindex="-1">${t('dose.title')}</h1>
        <p class="subtitle text-secondary mt-1">${t('dose.subtitle')}</p>
      </div>

      <!-- Context Question Form -->
      <section class="card dose-question-card mt-4" aria-labelledby="form-heading">
        <h2 id="form-heading" class="dose-section-title">Missed Dose Context</h2>
        <form id="dose-decision-form" class="mt-4" novalidate>
          <!-- 1. Which medicine was missed? -->
          <div class="form-group mb-4">
            <label for="dd-med-select" class="form-label">${t('dose.selectMed')} *</label>
            <select id="dd-med-select" class="form-select form-input-lg" required>
              <option value="">-- Choose a medication --</option>
              ${medications
                .map(
                  (m) => `
                <option value="${m.id}" ${m.id === preselectedMedId ? 'selected' : ''}>
                  ${escapeHtml(m.name)} (${escapeHtml(m.dosage || m.dose || '')})
                </option>
              `
                )
                .join('')}
            </select>
          </div>

          <!-- 2. What was its scheduled time? -->
          <div class="form-group mb-4">
            <label for="dd-scheduled-time" class="form-label">${t('dose.scheduledTime')} *</label>
            <select id="dd-scheduled-time" class="form-select form-input-lg" required>
              <option value="">-- Choose scheduled time --</option>
            </select>
          </div>

          <!-- 3. When did you remember? -->
          <div class="form-group mb-4">
            <label for="dd-remembered-time" class="form-label">${t('dose.rememberedTime')}</label>
            <input
              id="dd-remembered-time"
              type="time"
              class="form-input form-input-lg"
              value="${defaultRememberedTime}"
            />
          </div>

          <!-- 4. Has the next dose already been recorded? -->
          <div class="form-group mb-4">
            <fieldset class="dose-fieldset">
              <legend class="form-label">${t('dose.hasRecordedNext')}</legend>
              <div class="radio-group mt-2">
                <label class="radio-label">
                  <input type="radio" name="nextRecorded" value="no" checked />
                  <span>${t('common.no')}</span>
                </label>
                <label class="radio-label ml-4">
                  <input type="radio" name="nextRecorded" value="yes" />
                  <span>${t('common.yes')}</span>
                </label>
              </div>
            </fieldset>
          </div>

          <button id="btn-check-dose" type="button" class="btn btn-primary btn-lg btn-full mt-2">
            ${t('dose.checkDecision')}
          </button>
        </form>
      </section>

      <!-- Output / Result Card Area -->
      <section id="dose-result-area" class="mt-6" aria-live="polite" aria-atomic="true"></section>
    </div>
  `

  const medSelect = container.querySelector('#dd-med-select')
  const timeSelect = container.querySelector('#dd-scheduled-time')
  const rememberedInput = container.querySelector('#dd-remembered-time')
  const btnCheck = container.querySelector('#btn-check-dose')
  const resultArea = container.querySelector('#dose-result-area')

  // Populate time dropdown based on selected medication
  function updateTimeOptions() {
    const medId = medSelect.value
    timeSelect.innerHTML = '<option value="">-- Choose scheduled time --</option>'
    const med = medications.find((m) => m.id === medId)
    if (!med || !Array.isArray(med.times)) return

    med.times.forEach((tStr) => {
      const opt = document.createElement('option')
      opt.value = tStr
      opt.textContent = `${tStr} (${formatTime12h(tStr)})`
      if (tStr === preselectedTime) opt.selected = true
      timeSelect.appendChild(opt)
    })
  }

  medSelect.addEventListener('change', updateTimeOptions)
  if (preselectedMedId) updateTimeOptions()

  // Evaluate button trigger
  btnCheck.addEventListener('click', () => {
    const medId = medSelect.value
    const scheduledTime = timeSelect.value
    const rememberedTime = rememberedInput.value
    const hasRecordedNextDose = container.querySelector('input[name="nextRecorded"]:checked')?.value === 'yes'

    if (!medId) {
      alert('Please select a medication.')
      medSelect.focus()
      return
    }

    if (!scheduledTime) {
      alert('Please select the scheduled time.')
      timeSelect.focus()
      return
    }

    const medication = medications.find((m) => m.id === medId)

    // Check if current dose is already recorded today
    const today = getTodayString()
    const logs = getStore(KEYS.DOSE_LOGS) ?? []
    const hasRecordedCurrentDose = logs.some(
      (l) =>
        l.medicationId === medId &&
        l.scheduledTime === scheduledTime &&
        l.date === today &&
        l.status === 'taken'
    )

    // Call pure decision engine
    const decision = evaluateMissedDose({
      medication,
      scheduledTime,
      rememberedTime,
      hasRecordedCurrentDose,
      hasRecordedNextDose,
    })

    renderDecisionResult(decision, resultArea)
  })
}

/**
 * Renders the explainable decision result card using one of 3 visual styles
 */
function renderDecisionResult(decision, targetEl) {
  if (!targetEl) return

  let styleClass = 'result-verified'
  let statusBadgeIcon = '✅'
  let visualHeader = 'Verified Saved Instructions'

  if (decision.visualStyle === VISUAL_STYLES.MORE_INFO) {
    styleClass = 'result-more-info'
    statusBadgeIcon = '⚠️'
    visualHeader = 'More Information Required'
  } else if (decision.visualStyle === VISUAL_STYLES.PROFESSIONAL) {
    styleClass = 'result-professional'
    statusBadgeIcon = '🩺'
    visualHeader = 'Professional Assistance Required'
  }

  targetEl.innerHTML = `
    <article class="card dose-result-card ${styleClass}">
      <div class="result-banner">
        <span class="result-banner-icon" aria-hidden="true">${statusBadgeIcon}</span>
        <div>
          <span class="result-visual-label">${visualHeader}</span>
          <h2 class="result-title">${escapeHtml(decision.title)}</h2>
        </div>
      </div>

      <div class="result-body mt-4">
        <!-- Explanation -->
        <p class="result-explanation">${escapeHtml(decision.explanation)}</p>

        <!-- Exact Saved Clinician Instructions (if verified) -->
        ${
          decision.availableInfo.exactInstructions
            ? `
          <div class="exact-instructions-box mt-4">
            <h3 class="instructions-box-title">Recorded Clinician Instructions:</h3>
            <blockquote class="instructions-quote">"${escapeHtml(decision.availableInfo.exactInstructions)}"</blockquote>
            <div class="source-attribution mt-2">
              <p><strong>Source:</strong> ${escapeHtml(decision.instructionSource || 'Unspecified')}</p>
              <p><strong>Verified on:</strong> ${escapeHtml(decision.verificationDate || 'Date not recorded')}</p>
            </div>
          </div>
        `
            : ''
        }

        <!-- Recorded notes if partial -->
        ${
          decision.availableInfo.recordedNotes
            ? `
          <div class="exact-instructions-box mt-4">
            <h3 class="instructions-box-title">Recorded Notes Found:</h3>
            <blockquote class="instructions-quote">"${escapeHtml(decision.availableInfo.recordedNotes)}"</blockquote>
            <div class="source-attribution mt-2">
              <p><strong>Source:</strong> ${escapeHtml(decision.instructionSource || 'Not recorded')}</p>
              <p><strong>Verified on:</strong> ${escapeHtml(decision.verificationDate || 'Not recorded')}</p>
            </div>
          </div>
        `
            : ''
        }

        <!-- Missing Information Checklist -->
        ${
          decision.missingInfo && decision.missingInfo.length > 0
            ? `
          <div class="missing-info-box mt-4">
            <h3 class="missing-info-title">Missing Information:</h3>
            <ul class="missing-info-list">
              ${decision.missingInfo.map((m) => `<li>❌ ${escapeHtml(m)}</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }

        <!-- Recommended Safe Next Step -->
        <div class="next-step-box mt-4">
          <h3 class="next-step-title">Recommended Safe Next Step:</h3>
          <p class="next-step-text">👉 ${escapeHtml(decision.recommendedNextStep)}</p>
        </div>

        <!-- Strict Double Dose Warning -->
        <div class="hard-warning-box mt-4" role="alert">
          <span class="warning-icon" aria-hidden="true">🚫</span>
          <div>
            <strong>Hard Safety Rule:</strong>
            <p>Never take a double dose to make up for a missed one.</p>
          </div>
        </div>

        <!-- Medical Disclaimer -->
        <p class="result-disclaimer mt-4 text-secondary">
          ℹ️ <em>${escapeHtml(decision.disclaimer)}</em>
        </p>
      </div>
    </article>
  `

  targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
