import { t } from '../i18n/index.js'
import { getAllMedications } from '../modules/medications.js'
import {
  checkMedications,
  SAFETY_SEVERITIES,
} from '../safety/safetyChecker.js'
import { openMedicationEditor } from './senior.js'

const severityIcons = {
  [SAFETY_SEVERITIES.INFORMATIONAL]: 'ℹ️',
  [SAFETY_SEVERITIES.REVIEW_RECOMMENDED]: '⚠️',
  [SAFETY_SEVERITIES.URGENT_PROFESSIONAL_REVIEW]: '🚨',
}

export function renderSafetyChecker(container) {
  if (!container) return

  if (container._safetyMedicationChangeHandler) {
    document.removeEventListener('medicationschange', container._safetyMedicationChangeHandler)
  }
  container._safetyMedicationChangeHandler = () => renderSafetyChecker(container)
  document.addEventListener('medicationschange', container._safetyMedicationChangeHandler)

  const medications = getAllMedications()
  let warnings = checkMedications(medications)
  const isCaregiverMode = !document.documentElement.hasAttribute('data-senior')

  container.innerHTML = `
    <section class="view-container safety-view" aria-labelledby="safety-heading">
      <div class="view-header">
        <h1 id="safety-heading" tabindex="-1">${t('safety.title')}</h1>
      </div>
      <div class="card safety-disclaimer-card mt-4" role="note">
        <p class="text-secondary">${t('safety.disclaimer')}</p>
      </div>
      <section class="card safety-summary-card mt-4" aria-labelledby="safety-summary-heading">
        <div class="section-header-row">
          <h2 id="safety-summary-heading" class="section-title">${t('a11y.safetyResults')}</h2>
          ${isCaregiverMode ? `
            <label class="safety-filter-label" for="safety-severity-filter">${t('safety.filterLabel')}</label>
            <select id="safety-severity-filter" class="form-select">
              <option value="all">${t('safety.filterAll')}</option>
              ${Object.values(SAFETY_SEVERITIES).map((severity) => `<option value="${severity}">${t(`safety.severity.${severity}`)}</option>`).join('')}
            </select>
          ` : ''}
        </div>
        <div id="safety-summary" class="safety-summary-grid"></div>
      </section>
      <section id="safety-results" class="safety-results mt-4" aria-live="polite" aria-atomic="true"></section>
    </section>
  `

  const summary = container.querySelector('#safety-summary')
  const results = container.querySelector('#safety-results')
  const filter = container.querySelector('#safety-severity-filter')

  function renderResults() {
    const selected = filter?.value || 'all'
    const visibleWarnings = selected === 'all' ? warnings : warnings.filter((item) => item.severity === selected)
    const counts = Object.values(SAFETY_SEVERITIES).map((severity) => ({
      severity,
      count: warnings.filter((item) => item.severity === severity).length,
    }))
    summary.innerHTML = counts.map(({ severity, count }) => `
      <div class="safety-count safety-count-${severity}">
        <span class="safety-severity-icon" aria-hidden="true">${severityIcons[severity]}</span>
        <span class="safety-count-label">${t(`safety.severity.${severity}`)}</span>
        <strong class="safety-count-value">${count}</strong>
      </div>
    `).join('')

    if (warnings.length === 0) {
      results.innerHTML = `<div class="card safety-empty-card"><p>${t('safety.empty')}</p></div>`
      results.setAttribute('aria-label', t('safety.empty'))
      return
    }

    results.innerHTML = visibleWarnings.map(renderWarning).join('')
    results.setAttribute('aria-label', t('a11y.safetyResults'))
    results.querySelectorAll('[data-review-medication]').forEach((button) => {
      button.addEventListener('click', () => {
        const medication = medications.find((item, index) => (
          String(item.id || `record-${index}`) === button.dataset.reviewMedication
        ))
        if (medication) openMedicationEditor(medication, () => renderSafetyChecker(container))
      })
    })
  }

  function renderWarning(item) {
    const affected = item.medicationIds.map((id) => {
      const index = medications.findIndex((medication, medIndex) => String(medication.id || `record-${medIndex}`) === id)
      return index >= 0 ? `
        <li class="safety-medication">
          <span>${escapeHtml(medications[index].name || t('safety.unnamedRecord'))}</span>
          <button type="button" class="btn btn-ghost btn-sm" data-review-medication="${escapeHtml(id)}">${t('safety.reviewRecord')}</button>
        </li>
      ` : ''
    }).join('')
    const fields = item.params.fields
      ? item.params.fields.split(', ').map((field) => t(`med.${field}`)).join(', ')
      : ''
    const params = { ...item.params, fields }
    return `
      <article class="card safety-warning-card safety-warning-${item.severity}">
        <div class="safety-warning-header">
          <span class="safety-severity-badge" aria-label="${t(`safety.severity.${item.severity}`)}">
            <span aria-hidden="true">${severityIcons[item.severity]}</span>
            ${t(`safety.severity.${item.severity}`)}
          </span>
          <span class="safety-certainty">${t(`safety.certainty.${item.certainty}`)}</span>
        </div>
        <h3 class="safety-category">${t(`safety.category.${item.category}`)}</h3>
        <p>${t(item.messageKey, params)}</p>
        <p class="safety-next-step"><strong>${t('safety.nextStepLabel')}</strong> ${t(item.nextStepKey, params)}</p>
        <ul class="safety-medication-list">${affected}</ul>
      </article>
    `
  }

  if (filter) filter.addEventListener('change', renderResults)
  renderResults()
  const liveRegion = document.getElementById('locale-live-region')
  if (liveRegion) liveRegion.textContent = t('a11y.safetyLive', { count: warnings.length })
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
