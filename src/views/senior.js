// src/views/senior.js — Complete Senior Mode view with today's date, next medicine banner, schedule, TTS, add/edit/delete, safe dose logging & audit undo

import { t, getLocale } from '../i18n/index.js'
import {
  getTodaysSchedule,
  getNextScheduledDose,
  addMedication,
  updateMedication,
  deleteMedication,
  logDose,
  correctAccidentalDose,
  FREQUENCIES,
  DEFAULT_FREQUENCY_TIMES,
} from '../modules/medications.js'
import { speechService } from '../modules/speech.js'
import { showModal } from '../components/modal.js'
import { showToast } from '../components/toast.js'

/**
 * Format 24h 'HH:MM' into friendly 12h display with AM/PM
 * @param {string} timeStr
 * @returns {string}
 */
function formatTime12h(timeStr) {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  const locale = getLocale() === 'hi' ? 'hi-IN' : getLocale() === 'kn' ? 'kn-IN' : 'en-IN'
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date)
}

/**
 * Format today's date nicely according to locale
 * @param {string} locale
 * @returns {string}
 */
function getFormattedTodayDate(locale = 'en') {
  const now = new Date()
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  const langCode = locale === 'hi' ? 'hi-IN' : locale === 'kn' ? 'kn-IN' : 'en-IN'
  try {
    return new Intl.DateTimeFormat(langCode, options).format(now)
  } catch (_) {
    return now.toDateString()
  }
}

/**
 * Status icon and styling helper
 * Clearly distinguishes Taken, Upcoming and Not Recorded (due/missed)
 * @param {'taken'|'due'|'upcoming'|'missed'} status
 */
function getStatusBadge(status) {
  switch (status) {
    case 'taken':
      return {
        icon: '✅',
        label: t('senior.taken'),
        badgeClass: 'badge-taken',
      }
    case 'due':
      return {
        icon: '⏰',
        label: t('senior.dueNow'),
        badgeClass: 'badge-due',
      }
    case 'missed':
      return {
        icon: '⚠️',
        label: t('senior.missedDose'),
        badgeClass: 'badge-missed',
      }
    case 'upcoming':
    default:
      return {
        icon: '⏳',
        label: t('senior.upcoming'),
        badgeClass: 'badge-upcoming',
      }
  }
}

/**
 * Main render function for Senior Mode
 * @param {HTMLElement} container
 */
export function renderSenior(container) {
  if (!container) return

  // Build root view skeleton
  container.innerHTML = `
    <div class="view-container senior-container" role="region" aria-labelledby="senior-page-heading">
      <div class="senior-header">
        <div class="senior-title-group">
          <h1 id="senior-page-heading" class="senior-heading" tabindex="-1"></h1>
          <p class="senior-date-badge" id="senior-today-date"></p>
          <p class="senior-subtitle" id="senior-subtitle-text"></p>
        </div>

        <div class="senior-header-actions">
          <button id="btn-read-schedule" class="btn btn-secondary btn-tts" type="button" aria-label="${t('senior.readAloud')}">
            <span class="btn-icon" aria-hidden="true">🔊</span>
            <span class="btn-text">${t('senior.readAloud')}</span>
          </button>
          <button id="btn-add-med" class="btn btn-primary btn-add" type="button" aria-label="${t('senior.addMed')}">
            <span class="btn-icon" aria-hidden="true">➕</span>
            <span class="btn-text">${t('senior.addMed')}</span>
          </button>
        </div>
      </div>

      <!-- Next Scheduled Medicine Spotlight -->
      <section id="senior-next-dose-section" class="mb-4" aria-label="${t('senior.nextDoseBannerTitle')}"></section>

      <div id="senior-live-region" class="sr-only" aria-live="polite" aria-atomic="true"></div>

      <!-- Schedule Content Area -->
      <section id="senior-schedule-list" class="senior-schedule" aria-label="${t('senior.todaySchedule')}">
      </section>
    </div>
  `

  // Text contents set safely
  const headingEl = container.querySelector('#senior-page-heading')
  if (headingEl) headingEl.textContent = t('senior.title')

  const dateBadgeEl = container.querySelector('#senior-today-date')
  if (dateBadgeEl) {
    dateBadgeEl.textContent = `📅 ${getFormattedTodayDate(getLocale())}`
  }

  const subtitleEl = container.querySelector('#senior-subtitle-text')
  if (subtitleEl) subtitleEl.textContent = t('senior.subtitle')

  const liveRegion = container.querySelector('#senior-live-region')

  /**
   * Safe live announcement helper
   * @param {string} msg
   */
  function announce(msg) {
    if (liveRegion) {
      liveRegion.textContent = ''
      setTimeout(() => {
        liveRegion.textContent = msg
      }, 50)
    }
  }

  /**
   * Refreshes and renders schedule items safely
   */
  function refreshSchedule() {
    const nextDoseSection = container.querySelector('#senior-next-dose-section')
    const scheduleListEl = container.querySelector('#senior-schedule-list')
    if (!scheduleListEl) return

    scheduleListEl.innerHTML = ''
    if (nextDoseSection) nextDoseSection.innerHTML = ''

    const schedule = getTodaysSchedule()

    if (schedule.length === 0) {
      const emptyCard = document.createElement('div')
      emptyCard.className = 'card senior-empty-card'

      const emptyIcon = document.createElement('div')
      emptyIcon.className = 'empty-icon'
      emptyIcon.setAttribute('aria-hidden', 'true')
      emptyIcon.textContent = '💊'

      const emptyTitle = document.createElement('h2')
      emptyTitle.className = 'empty-title'
      emptyTitle.textContent = t('senior.noMeds')

      const emptySub = document.createElement('p')
      emptySub.className = 'empty-sub text-secondary'
      emptySub.textContent = t('senior.noMedsSub')

      const emptyAddBtn = document.createElement('button')
      emptyAddBtn.className = 'btn btn-primary btn-lg mt-4'
      emptyAddBtn.type = 'button'
      emptyAddBtn.textContent = t('senior.addMed')
      emptyAddBtn.addEventListener('click', () => openMedicationModal(null, refreshSchedule))

      emptyCard.appendChild(emptyIcon)
      emptyCard.appendChild(emptyTitle)
      emptyCard.appendChild(emptySub)
      emptyCard.appendChild(emptyAddBtn)
      scheduleListEl.appendChild(emptyCard)
      return
    }

    // Next Scheduled Medicine Spotlight Banner
    const nextDose = getNextScheduledDose()
    if (nextDose && nextDoseSection) {
      const banner = document.createElement('div')
      banner.className = 'card next-dose-spotlight'
      banner.innerHTML = `
        <div class="next-dose-header">
          <span class="next-dose-badge" aria-hidden="true">🔔</span>
          <span class="next-dose-label">${t('senior.nextDoseBannerTitle')}</span>
        </div>
        <div class="next-dose-body mt-2">
          <p class="next-dose-time-lead">${t('senior.nextDoseAt').replace('{time}', formatTime12h(nextDose.scheduledTime))}</p>
          <h2 class="next-dose-med-title">${escapeHtml(nextDose.medication.name)} <span class="next-dose-dosage">(${escapeHtml(nextDose.medication.dosage || nextDose.medication.dose || '')})</span></h2>
          ${nextDose.medication.instructions ? `<p class="next-dose-inst mt-1 text-secondary">ℹ️ ${escapeHtml(nextDose.medication.instructions)}</p>` : ''}
        </div>
      `
      nextDoseSection.appendChild(banner)
    }

    // Check if all are taken
    const allTaken = schedule.every((item) => item.status === 'taken')
    if (allTaken) {
      const allDoneBanner = document.createElement('div')
      allDoneBanner.className = 'card all-done-card mb-4'
      allDoneBanner.innerHTML = `
        <div class="all-done-content">
          <span class="all-done-icon" aria-hidden="true">🎉</span>
          <div>
            <h3 class="all-done-title">${t('senior.allDone')}</h3>
            <p class="all-done-sub text-secondary">${t('senior.allDoneSub')}</p>
          </div>
        </div>
      `
      scheduleListEl.appendChild(allDoneBanner)
    }

    // Render cards
    schedule.forEach((item, index) => {
      const card = createDoseCard(item, index, refreshSchedule, announce)
      scheduleListEl.appendChild(card)
    })
  }

  // Bind Top Actions
  const btnAddMed = container.querySelector('#btn-add-med')
  if (btnAddMed) {
    btnAddMed.addEventListener('click', () => openMedicationModal(null, refreshSchedule))
  }

  const btnReadSchedule = container.querySelector('#btn-read-schedule')
  if (btnReadSchedule) {
    btnReadSchedule.addEventListener('click', () => {
      readAloudSchedule(btnReadSchedule)
    })
  }

  // Initial draw
  refreshSchedule()
}

/**
 * Creates an individual accessible Dose Card
 */
function createDoseCard(item, index, refreshSchedule, announce) {
  const { medication, scheduledTime, status, doseLog } = item
  const badgeInfo = getStatusBadge(status)
  const isTaken = status === 'taken'

  const card = document.createElement('article')
  card.className = `card dose-card ${isTaken ? 'dose-card-taken' : ''} ${status === 'due' ? 'dose-card-due' : ''}`
  card.setAttribute('aria-labelledby', `dose-title-${index}`)

  // Header row (Time + Status)
  const headerRow = document.createElement('div')
  headerRow.className = 'dose-card-header'

  const timeEl = document.createElement('div')
  timeEl.className = 'dose-time'
  timeEl.innerHTML = `<span class="time-clock-icon" aria-hidden="true">🕒</span> <strong>${formatTime12h(scheduledTime)}</strong>`

  const statusBadge = document.createElement('div')
  statusBadge.className = `status-badge ${badgeInfo.badgeClass}`
  statusBadge.setAttribute('role', 'status')
  statusBadge.innerHTML = `<span aria-hidden="true">${badgeInfo.icon}</span> <span>${badgeInfo.label}</span>`

  headerRow.appendChild(timeEl)
  headerRow.appendChild(statusBadge)
  card.appendChild(headerRow)

  // Medication Name, Active Ingredient & Dosage row
  const bodySection = document.createElement('div')
  bodySection.className = 'dose-card-body'

  const titleEl = document.createElement('h2')
  titleEl.id = `dose-title-${index}`
  titleEl.className = 'dose-med-name'
  titleEl.textContent = medication.name

  const dosageEl = document.createElement('p')
  dosageEl.className = 'dose-med-dosage'
  dosageEl.textContent = medication.dosage || medication.dose || ''

  bodySection.appendChild(titleEl)
  bodySection.appendChild(dosageEl)

  // Active Ingredient (if entered)
  if (medication.activeIngredient) {
    const aiEl = document.createElement('p')
    aiEl.className = 'dose-active-ingredient'
    aiEl.innerHTML = `<span class="ai-label">${t('senior.active')}</span> `
    const aiText = document.createElement('span')
    aiText.textContent = medication.activeIngredient
    aiEl.appendChild(aiText)
    bodySection.appendChild(aiEl)
  }

  // Instructions (if any)
  if (medication.instructions) {
    const instEl = document.createElement('p')
    instEl.className = 'dose-instructions'
    instEl.innerHTML = `<span aria-hidden="true">ℹ️</span> `
    const instText = document.createElement('span')
    instText.textContent = medication.instructions
    instEl.appendChild(instText)
    bodySection.appendChild(instEl)
  }

  // Clinician Notes (if any)
  if (medication.clinicianInstructions) {
    const clinEl = document.createElement('p')
    clinEl.className = 'dose-clinician-notes'
    clinEl.innerHTML = `<span aria-hidden="true">🩺</span> <strong>${t('senior.clinician')}</strong> `
    const clinText = document.createElement('span')
    clinText.textContent = medication.clinicianInstructions
    clinEl.appendChild(clinText)
    bodySection.appendChild(clinEl)
  }

  card.appendChild(bodySection)

  // Actions footer
  const footerRow = document.createElement('div')
  footerRow.className = 'dose-card-actions'

  // Read Aloud Single Dose Button
  const btnSpeak = document.createElement('button')
  btnSpeak.className = 'btn btn-ghost btn-speak-dose'
  btnSpeak.type = 'button'
  btnSpeak.setAttribute('aria-label', `${t('senior.readAloud')} ${medication.name}`)
  btnSpeak.innerHTML = `<span aria-hidden="true">🔊</span> <span class="sr-only">${t('senior.readAloud')}</span>`
  btnSpeak.addEventListener('click', () => {
    const speechText = `${t('senior.scheduledFor')} ${medication.name}, ${medication.dosage || medication.dose || ''}, ${formatTime12h(scheduledTime)}.`
    speechService.speak(speechText, getLocale())
  })
  footerRow.appendChild(btnSpeak)

  // Edit Button
  const btnEdit = document.createElement('button')
  btnEdit.className = 'btn btn-ghost btn-edit-dose'
  btnEdit.type = 'button'
  btnEdit.setAttribute('aria-label', `${t('senior.editMed')} ${medication.name}`)
  btnEdit.innerHTML = `<span aria-hidden="true">✏️</span> <span class="sr-only">${t('senior.editMed')}</span>`
  btnEdit.addEventListener('click', () => {
    openMedicationModal(medication, refreshSchedule)
  })
  footerRow.appendChild(btnEdit)

  // Delete Button
  const btnDelete = document.createElement('button')
  btnDelete.className = 'btn btn-ghost btn-delete-dose'
  btnDelete.type = 'button'
  btnDelete.setAttribute('aria-label', `${t('senior.deleteMed')} ${medication.name}`)
  btnDelete.innerHTML = `<span aria-hidden="true">🗑️</span> <span class="sr-only">${t('senior.deleteMed')}</span>`
  btnDelete.addEventListener('click', async () => {
    const confirmed = await showModal({
      title: t('senior.deleteConfirmTitle'),
      content: t('senior.deleteConfirmBody').replace('{medName}', medication.name),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      dangerous: true,
    })
    if (confirmed) {
      deleteMedication(medication.id)
      const deletedMessage = t('senior.deletedToast', { name: medication.name })
      announce(deletedMessage)
      showToast(deletedMessage, 'info')
      refreshSchedule()
    }
  })
  footerRow.appendChild(btnDelete)

  // DoseDecision Link for Missed/Due doses
  if (!isTaken) {
    const btnMissedHelp = document.createElement('a')
    btnMissedHelp.className = 'btn btn-ghost btn-missed-help'
    btnMissedHelp.href = `#/dose-decision?medId=${encodeURIComponent(medication.id)}&time=${encodeURIComponent(scheduledTime)}`
    btnMissedHelp.setAttribute('aria-label', `${t('senior.missedDoseAction')} for ${medication.name}`)
    btnMissedHelp.innerHTML = `<span aria-hidden="true">❓</span> <span>${t('senior.missedDoseAction')}</span>`
    footerRow.appendChild(btnMissedHelp)
  }

  // Primary Action: Mark as Taken Button or Undo Taken with Audit Trail
  if (isTaken) {
    const takenContainer = document.createElement('div')
    takenContainer.className = 'taken-action-group'

    const btnTakenStatus = document.createElement('button')
    btnTakenStatus.className = 'btn btn-taken btn-take-action'
    btnTakenStatus.type = 'button'
    btnTakenStatus.disabled = true
    btnTakenStatus.innerHTML = `<span aria-hidden="true">✓</span> <span>${t('senior.taken')}</span>`
    takenContainer.appendChild(btnTakenStatus)

    // Correction button for accidental entries
    const btnUndo = document.createElement('button')
    btnUndo.className = 'btn btn-ghost btn-undo-dose'
    btnUndo.type = 'button'
    btnUndo.setAttribute('aria-label', t('senior.undoTaken'))
    btnUndo.innerHTML = `<span aria-hidden="true">↩️</span> <span>${t('senior.undoTaken')}</span>`
    btnUndo.addEventListener('click', async () => {
      const confirmed = await showModal({
        title: t('senior.undoConfirmTitle'),
        content: t('senior.undoConfirmBody')
          .replace('{medName}', medication.name)
          .replace('{time}', formatTime12h(scheduledTime)),
        confirmText: t('common.confirm'),
        cancelText: t('common.cancel'),
      })

      if (confirmed && doseLog) {
        const correctRes = correctAccidentalDose(doseLog.id, 'User corrected accidental taken mark')
        if (correctRes.success) {
          const undoMsg = t('senior.undoSuccessToast').replace('{medName}', medication.name)
          announce(undoMsg)
          showToast(undoMsg, 'info')
          refreshSchedule()
        }
      }
    })
    takenContainer.appendChild(btnUndo)
    footerRow.appendChild(takenContainer)
  } else {
    const btnTake = document.createElement('button')
    btnTake.className = 'btn btn-primary btn-take-action'
    btnTake.type = 'button'
    btnTake.innerHTML = `<span aria-hidden="true">💊</span> <span>${t('senior.markTaken')}</span>`
    btnTake.addEventListener('click', async () => {
      // Confirmation Dialog before recording
      const confirmed = await showModal({
        title: t('senior.confirmTakenTitle'),
        content: t('senior.confirmTakenQuestion')
          .replace('{medName}', medication.name)
          .replace('{dosage}', medication.dosage || medication.dose || '')
          .replace('{time}', formatTime12h(scheduledTime)),
        confirmText: t('senior.markTaken'),
        cancelText: t('common.cancel'),
      })

      if (confirmed) {
        const result = logDose(medication.id, scheduledTime)
        if (result.success) {
          const successMsg = t('senior.successTakenToast').replace('{medName}', medication.name)
          announce(successMsg)
          showToast(successMsg, 'success')
          refreshSchedule()
        } else {
          showToast(t('senior.alreadyTakenToast'), 'warning')
          refreshSchedule()
        }
      }
    })
    footerRow.appendChild(btnTake)
  }

  card.appendChild(footerRow)
  return card
}

/**
 * Text-to-Speech logic for reading the entire schedule aloud
 */
function readAloudSchedule(buttonEl) {
  if (!speechService.isAvailable() || !speechService.hasVoice(getLocale())) {
    showToast(t('senior.speechUnavailable'), 'warning')
    return
  }

  if (speechService.isSpeaking()) {
    speechService.stop()
    buttonEl.innerHTML = `<span class="btn-icon" aria-hidden="true">🔊</span><span class="btn-text">${t('senior.readAloud')}</span>`
    return
  }

  const schedule = getTodaysSchedule()
  if (schedule.length === 0) {
    speechService.speak(t('senior.noMeds'), getLocale())
    return
  }

  const lines = [t('senior.scheduleSpeech')]
  for (const item of schedule) {
    const timeFormatted = formatTime12h(item.scheduledTime)
    const statusText = item.status === 'taken' ? t('senior.takenSpeech') : t('senior.notTakenSpeech')
    lines.push(`${item.medication.name}, ${item.medication.dosage || item.medication.dose}, ${t('senior.scheduledFor')} ${timeFormatted}. ${t('senior.status')}: ${statusText}.`)
  }

  const fullText = lines.join(' ')
  buttonEl.innerHTML = `<span class="btn-icon" aria-hidden="true">⏹️</span><span class="btn-text">${t('senior.stopSpeech')}</span>`

  speechService.speak(fullText, getLocale(), {
    onEnd: () => {
      buttonEl.innerHTML = `<span class="btn-icon" aria-hidden="true">🔊</span><span class="btn-text">${t('senior.readAloud')}</span>`
    },
    onError: () => {
      buttonEl.innerHTML = `<span class="btn-icon" aria-hidden="true">🔊</span><span class="btn-text">${t('senior.readAloud')}</span>`
    },
  })
}

/**
 * Add / Edit Medication Accessible Modal Form
 * @param {object|null} medToEdit
 * @param {Function} onSaved
 */
function openMedicationModal(medToEdit = null, onSaved) {
  const isEdit = Boolean(medToEdit)
  const modalContainer = document.getElementById('modal-container')
  if (!modalContainer) return

  const formWrapper = document.createElement('div')
  formWrapper.className = 'med-form-wrapper'

  // Pre-fill state
  let currentTimes = isEdit ? [...medToEdit.times] : ['08:00']
  let currentFrequency = isEdit ? medToEdit.frequency : FREQUENCIES.ONCE_DAILY

  formWrapper.innerHTML = `
    <form id="med-form" novalidate>
      <div class="form-group mb-4">
        <label for="form-med-name" class="form-label">${t('med.name')} *</label>
        <input
          id="form-med-name"
          name="name"
          type="text"
          class="form-input form-input-lg"
          required
          maxlength="100"
          placeholder="${t('med.namePlaceholder')}"
          value="${isEdit ? escapeHtml(medToEdit.name) : ''}"
        />
        <p id="error-name" class="form-error sr-only" role="alert"></p>
      </div>

      <div class="form-group mb-4">
        <label for="form-med-dosage" class="form-label">${t('med.dosage')} *</label>
        <input
          id="form-med-dosage"
          name="dosage"
          type="text"
          class="form-input form-input-lg"
          required
          maxlength="50"
          placeholder="${t('med.dosagePlaceholder')}"
          value="${isEdit ? escapeHtml(medToEdit.dosage || medToEdit.dose || '') : ''}"
        />
        <p id="error-dosage" class="form-error sr-only" role="alert"></p>
      </div>

      <div class="form-group mb-4">
        <label for="form-med-active" class="form-label">${t('med.activeIngredient')}</label>
        <input
          id="form-med-active"
          name="activeIngredient"
          type="text"
          class="form-input"
          maxlength="100"
          placeholder="${t('med.activeIngredientPlaceholder')}"
          value="${isEdit ? escapeHtml(medToEdit.activeIngredient || '') : ''}"
        />
      </div>

      <div class="form-group mb-4">
        <label for="form-med-frequency" class="form-label">${t('med.frequency')}</label>
        <select id="form-med-frequency" class="form-select form-input-lg">
          <option value="${FREQUENCIES.ONCE_DAILY}">${t('med.frequencies.once_daily')}</option>
          <option value="${FREQUENCIES.TWICE_DAILY}">${t('med.frequencies.twice_daily')}</option>
          <option value="${FREQUENCIES.THREE_TIMES_DAILY}">${t('med.frequencies.three_times_daily')}</option>
          <option value="${FREQUENCIES.CUSTOM}">${t('med.frequencies.custom')}</option>
        </select>
      </div>

      <div class="form-group mb-4">
        <label class="form-label">${t('med.times')} *</label>
        <div id="times-inputs-container" class="times-list mb-2"></div>
        <button id="btn-add-time" type="button" class="btn btn-ghost btn-sm">
          ${t('med.timeAdd')}
        </button>
        <p id="error-times" class="form-error sr-only" role="alert"></p>
      </div>

      <div class="form-group mb-4">
        <label for="form-med-instructions" class="form-label">${t('med.instructions')}</label>
        <input
          id="form-med-instructions"
          name="instructions"
          type="text"
          class="form-input"
          maxlength="150"
          placeholder="${t('med.instructionsPlaceholder')}"
          value="${isEdit ? escapeHtml(medToEdit.instructions || '') : ''}"
        />
      </div>

      <div class="form-group mb-4">
        <label for="form-med-clinician" class="form-label">${t('med.clinicianInstructions')}</label>
        <textarea
          id="form-med-clinician"
          name="clinicianInstructions"
          class="form-textarea"
          rows="2"
          maxlength="300"
          placeholder="${t('med.clinicianInstructionsPlaceholder')}"
        >${isEdit ? escapeHtml(medToEdit.clinicianInstructions || '') : ''}</textarea>
      </div>

      <div class="form-group mb-4">
        <label for="form-med-source" class="form-label">${t('med.instructionSource')}</label>
        <input
          id="form-med-source"
          name="instructionSource"
          type="text"
          class="form-input"
          maxlength="100"
          placeholder="${t('med.instructionSourcePlaceholder')}"
          value="${isEdit ? escapeHtml(medToEdit.instructionSource || '') : ''}"
        />
      </div>

      <div class="form-group mb-4">
        <label for="form-med-date" class="form-label">${t('med.verificationDate')}</label>
        <input
          id="form-med-date"
          name="verificationDate"
          type="date"
          class="form-input"
          value="${isEdit ? escapeHtml(medToEdit.verificationDate || '') : ''}"
        />
      </div>

      <p id="form-general-error" class="form-error text-danger mb-3" style="display:none;"></p>
    </form>
  `

  const selectFreq = formWrapper.querySelector('#form-med-frequency')
  if (selectFreq) {
    selectFreq.value = currentFrequency
  }

  const timesContainer = formWrapper.querySelector('#times-inputs-container')

  function renderTimesInputs() {
    timesContainer.innerHTML = ''
    currentTimes.forEach((timeVal, idx) => {
      const row = document.createElement('div')
      row.className = 'time-input-row mb-2'

      const input = document.createElement('input')
      input.type = 'time'
      input.className = 'form-input time-picker'
      input.required = true
      input.value = timeVal
      input.addEventListener('change', (e) => {
        currentTimes[idx] = e.target.value
      })

      const removeBtn = document.createElement('button')
      removeBtn.type = 'button'
      removeBtn.className = 'btn btn-ghost btn-remove-time'
      removeBtn.setAttribute('aria-label', t('a11y.removeTime', { count: idx + 1 }))
      removeBtn.innerHTML = '✖'
      removeBtn.disabled = currentTimes.length <= 1
      removeBtn.addEventListener('click', () => {
        currentTimes.splice(idx, 1)
        renderTimesInputs()
      })

      row.appendChild(input)
      row.appendChild(removeBtn)
      timesContainer.appendChild(row)
    })
  }

  renderTimesInputs()

  if (selectFreq) {
    selectFreq.addEventListener('change', (e) => {
      const freq = e.target.value
      currentFrequency = freq
      if (freq !== FREQUENCIES.CUSTOM && DEFAULT_FREQUENCY_TIMES[freq]) {
        currentTimes = [...DEFAULT_FREQUENCY_TIMES[freq]]
        renderTimesInputs()
      }
    })
  }

  const btnAddTime = formWrapper.querySelector('#btn-add-time')
  if (btnAddTime) {
    btnAddTime.addEventListener('click', () => {
      currentTimes.push('12:00')
      renderTimesInputs()
    })
  }

  showModal({
    title: isEdit ? t('med.editTitle') : t('med.addTitle'),
    content: formWrapper,
    confirmText: t('med.saveBtn'),
    cancelText: t('med.cancelBtn'),
    onConfirm: async () => {
      const nameInput = formWrapper.querySelector('#form-med-name')
      const dosageInput = formWrapper.querySelector('#form-med-dosage')
      const activeInput = formWrapper.querySelector('#form-med-active')
      const instInput = formWrapper.querySelector('#form-med-instructions')
      const clinInput = formWrapper.querySelector('#form-med-clinician')
      const sourceInput = formWrapper.querySelector('#form-med-source')
      const dateInput = formWrapper.querySelector('#form-med-date')
      const genError = formWrapper.querySelector('#form-general-error')

      const payload = {
        name: nameInput.value,
        dosage: dosageInput.value,
        activeIngredient: activeInput ? activeInput.value : '',
        frequency: currentFrequency,
        times: currentTimes,
        instructions: instInput.value,
        clinicianInstructions: clinInput.value,
        instructionSource: sourceInput ? sourceInput.value : '',
        verificationDate: dateInput ? dateInput.value : '',
      }

      let res
      if (isEdit) {
        res = updateMedication(medToEdit.id, payload)
      } else {
        res = addMedication(payload)
      }

      if (!res.success) {
        if (genError) {
          genError.textContent = res.errors.join('; ')
          genError.style.display = 'block'
        }
        showToast(res.errors[0], 'error')
        return false
      }

      showToast(t(isEdit ? 'senior.updatedToast' : 'senior.addedToast', { name: payload.name }), 'success')
      if (onSaved) onSaved()
      return true
    },
  })
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
