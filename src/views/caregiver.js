// src/views/caregiver.js — Complete CareCircle Dashboard, 7-Day Calendar, Missed History, Notes, and Printable Reports

import { t, getLocale } from '../i18n/index.js'
import { calculateSevenDayAdherence, getMissedDoseHistory } from '../modules/adherence.js'
import { getAllNotes, addNote, updateNote, deleteNote } from '../modules/caregiverNotes.js'
import { getAllMedications } from '../modules/medications.js'
import { isPinProtected, verifyPin, setCaregiverPin } from '../modules/caregiverAuth.js'
import { showModal } from '../components/modal.js'
import { showToast } from '../components/toast.js'
import { getStore, KEYS } from '../modules/store.js'

let isUnlockedSession = false

export function renderCaregiver(container) {
  if (!container) return

  // Check if PIN gate is active and session is locked
  if (isPinProtected() && !isUnlockedSession) {
    renderPinGate(container)
    return
  }

  renderCaregiverDashboard(container)
}

/**
 * PIN Privacy Gate Screen
 */
function renderPinGate(container) {
  container.innerHTML = `
    <div class="view-container caregiver-pin-container" role="region" aria-labelledby="pin-gate-title">
      <div class="card pin-gate-card">
        <div class="pin-icon" aria-hidden="true">🔒</div>
        <h1 id="pin-gate-title" class="senior-heading">${t('caregiver.pinEntry')}</h1>
        <p class="pin-explainer text-secondary mt-2">
          ${t('caregiver.pinNotice')}
        </p>

        <form id="pin-form" class="mt-4" novalidate>
          <div class="form-group mb-4">
            <label for="caregiver-pin-input" class="sr-only">${t('caregiver.pin')}</label>
            <input
              id="caregiver-pin-input"
              type="password"
              inputmode="numeric"
              maxlength="4"
              class="form-input form-input-lg pin-input"
              placeholder="••••"
              autofocus
              required
            />
          </div>
          <p id="pin-error-msg" class="text-danger mb-3" style="display:none;"></p>
          <button id="btn-unlock-pin" type="submit" class="btn btn-primary btn-lg btn-full">
            ${t('common.confirm')}
          </button>
        </form>

        <p class="pin-security-disclaimer text-secondary mt-4">
          ℹ️ <em>${t('caregiver.pinDisclaimer')}</em>
        </p>
      </div>
    </div>
  `

  const pinForm = container.querySelector('#pin-form')
  const pinInput = container.querySelector('#caregiver-pin-input')
  const errorMsg = container.querySelector('#pin-error-msg')

  pinForm.addEventListener('submit', (e) => {
    e.preventDefault()
    const pin = pinInput.value.trim()
    if (verifyPin(pin)) {
      isUnlockedSession = true
      renderCaregiverDashboard(container)
    } else {
      errorMsg.textContent = t('caregiver.pinInvalid')
      errorMsg.style.display = 'block'
      pinInput.value = ''
      pinInput.focus()
    }
  })
}

/**
 * Main Caregiver Dashboard Renderer
 */
function renderCaregiverDashboard(container) {
  const adherenceData = calculateSevenDayAdherence()
  const medications = getAllMedications()
  const profile = getStore(KEYS.PROFILE) ?? {}
  const patientName = profile.name ? profile.name : t('common.familyMember')

  container.innerHTML = `
    <div class="view-container caregiver-container" role="region" aria-labelledby="caregiver-title">
      <!-- Header with Action Buttons -->
      <div class="caregiver-header no-print">
        <div>
          <h1 id="caregiver-title" class="senior-heading" tabindex="-1">${t('caregiver.title')}</h1>
          <p class="subtitle text-secondary">${t('caregiver.monitoringFor')} <strong>${escapeHtml(patientName)}</strong></p>
        </div>
        <div class="caregiver-actions">
          <button id="btn-print-report" class="btn btn-secondary btn-print" type="button" aria-label="${t('caregiver.printReport')}">
            <span aria-hidden="true">🖨️</span> <span>${t('caregiver.printReport')}</span>
          </button>
        </div>
      </div>

      <!-- Printable Report Header (Only visible when printing) -->
      <div class="print-only print-report-header">
        <h1>${t('caregiver.reportTitle')}</h1>
        <p><strong>${t('caregiver.patient')}</strong> ${escapeHtml(patientName)} | <strong>${t('caregiver.period')}</strong> ${adherenceData.startDate} to ${adherenceData.endDate}</p>
        <p><strong>${t('caregiver.printedOn')}</strong> ${new Intl.DateTimeFormat(getLocale() === 'hi' ? 'hi-IN' : getLocale() === 'kn' ? 'kn-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}</p>
        <hr class="mt-2 mb-4" />
      </div>

      <!-- Summary Metrics Grid -->
      <section class="caregiver-metrics-grid mt-4" aria-label="${t('caregiver.adherenceSummary')}">
        <div class="metric-card card">
          <span class="metric-label">${t('caregiver.adherenceRate')}</span>
          <div class="metric-value-row">
            <span class="metric-number ${adherenceData.adherenceRate >= 80 ? 'text-success' : 'text-warning'}">
              ${adherenceData.adherenceRate}%
            </span>
            <span class="metric-sub text-secondary">${t('caregiver.goal')}</span>
          </div>
        </div>

        <div class="metric-card card">
          <span class="metric-label">${t('caregiver.dosesTaken')}</span>
          <div class="metric-value-row">
            <span class="metric-number text-teal">${adherenceData.dosesTaken}</span>
            <span class="metric-sub text-secondary">${t('caregiver.eligible', { count: adherenceData.totalEligibleDoses })}</span>
          </div>
        </div>

        <div class="metric-card card">
          <span class="metric-label">${t('caregiver.unrecordedMissed')}</span>
          <div class="metric-value-row">
            <span class="metric-number text-danger">${adherenceData.dosesUnrecorded}</span>
            <span class="metric-sub text-secondary">${t('caregiver.requiringReview')}</span>
          </div>
        </div>

        <div class="metric-card card">
          <span class="metric-label">${t('caregiver.correctedDoses')}</span>
          <div class="metric-value-row">
            <span class="metric-number text-secondary">${adherenceData.dosesCorrected}</span>
            <span class="metric-sub text-secondary">${t('caregiver.accidentalUndos')}</span>
          </div>
        </div>
      </section>

      <!-- 7-Day Adherence Heatmap / Calendar -->
      <section class="card calendar-card mt-6" aria-labelledby="calendar-heading">
        <div class="section-header-row">
          <h2 id="calendar-heading" class="section-title">${t('caregiver.sevenDay')}</h2>
          <div class="legend-row text-sm">
            <span class="legend-item"><span class="legend-dot dot-taken"></span> ${t('caregiver.taken')}</span>
            <span class="legend-item"><span class="legend-dot dot-unrecorded"></span> ${t('caregiver.unrecorded')}</span>
            <span class="legend-item"><span class="legend-dot dot-corrected"></span> ${t('caregiver.corrected')}</span>
            <span class="legend-item"><span class="legend-dot dot-future"></span> ${t('caregiver.future')}</span>
          </div>
        </div>

        <div class="calendar-table-wrapper mt-4">
          <table class="calendar-table" aria-label="${t('caregiver.adherenceBreakdown')}">
            <thead>
              <tr>
                <th scope="col">${t('caregiver.date')}</th>
                <th scope="col">${t('caregiver.scheduledDoses')}</th>
                <th scope="col">${t('caregiver.statusBreakdown')}</th>
              </tr>
            </thead>
            <tbody id="calendar-body">
              ${renderCalendarRows(adherenceData.calendarGrid)}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Medication-Wise Adherence Breakdown -->
      <section class="card med-adherence-card mt-6" aria-labelledby="med-adherence-title">
        <h2 id="med-adherence-title" class="section-title">${t('caregiver.medicationWise')}</h2>
        <div class="med-adherence-list mt-4">
          ${renderMedicationAdherenceList(adherenceData.medicationStats)}
        </div>
      </section>

      <!-- Missed & Unconfirmed History with Filter -->
      <section class="card missed-history-card mt-6" aria-labelledby="missed-history-title">
        <div class="section-header-row">
          <h2 id="missed-history-title" class="section-title">${t('caregiver.missedHistory')}</h2>
          <div class="history-filter no-print">
            <label for="filter-med-select" class="sr-only">${t('caregiver.relatedMedication')}</label>
            <select id="filter-med-select" class="form-select">
              <option value="">${t('caregiver.allMedications')}</option>
              ${medications.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div id="missed-history-list" class="mt-4">
          ${renderMissedHistory(getMissedDoseHistory())}
        </div>
      </section>

      <!-- Caregiver Notes Section -->
      <section class="card notes-card mt-6" aria-labelledby="notes-title">
        <div class="section-header-row">
          <h2 id="notes-title" class="section-title">${t('caregiver.notes')}</h2>
          <button id="btn-add-note" class="btn btn-primary btn-sm no-print" type="button">
            ${t('caregiver.addNote')}
          </button>
        </div>

        <div id="caregiver-notes-list" class="notes-list mt-4">
          ${renderNotesList(getAllNotes(), medications)}
        </div>
      </section>
    </div>
  `

  // Wire Print Report Button
  const btnPrint = container.querySelector('#btn-print-report')
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print()
    })
  }

  // Wire History Filter
  const filterSelect = container.querySelector('#filter-med-select')
  const historyListEl = container.querySelector('#missed-history-list')
  if (filterSelect && historyListEl) {
    filterSelect.addEventListener('change', (e) => {
      const selectedMedId = e.target.value
      const filtered = getMissedDoseHistory({ medicationId: selectedMedId || null })
      historyListEl.innerHTML = renderMissedHistory(filtered)
    })
  }

  // Wire Add Note Button
  const btnAddNote = container.querySelector('#btn-add-note')
  if (btnAddNote) {
    btnAddNote.addEventListener('click', () => {
      openNoteModal(null, medications, () => renderCaregiverDashboard(container))
    })
  }

  // Attach dynamic note listeners (Edit / Delete)
  attachNoteEventListeners(container, medications)
}

/**
 * Calendar Heatmap Table Rows
 */
function renderCalendarRows(calendarGrid) {
  if (!calendarGrid || calendarGrid.length === 0) {
    return '<tr><td colspan="3" class="text-secondary text-center p-4">No schedule data available.</td></tr>'
  }

  return calendarGrid
    .map((day) => {
      const slots = day.slots || []
      const takenCount = slots.filter((s) => s.status === 'taken').length
      const eligibleCount = slots.filter((s) => !s.isFuture).length

      return `
      <tr>
        <td class="font-semibold">${day.date}</td>
        <td>
          <div class="dose-slot-bubbles">
            ${
              slots.length === 0
                ? '<span class="text-secondary text-sm">No doses scheduled</span>'
                : slots
                    .map((s) => {
                      const bubbleClass = `slot-bubble bubble-${s.status}`
                      return `<span class="${bubbleClass}" title="${escapeHtml(t('caregiver.doseAt', { name: s.medicationName, time: s.time, status: s.status }))}">${s.time}</span>`
                    })
                    .join('')
            }
          </div>
        </td>
        <td>
          <span class="text-sm font-semibold">
            ${eligibleCount > 0 ? `${takenCount}/${eligibleCount} taken` : 'No past doses'}
          </span>
        </td>
      </tr>
    `
    })
    .join('')
}

/**
 * Medication-wise Adherence Progress Bars
 */
function renderMedicationAdherenceList(medStats) {
  if (!medStats || medStats.length === 0) {
    return '<p class="text-secondary">No medications scheduled in this period.</p>'
  }

  return medStats
    .map((stat) => {
      const rate = stat.adherenceRate
      const barColor = rate >= 80 ? 'bg-success' : rate >= 50 ? 'bg-warning' : 'bg-danger'

      return `
      <div class="med-adherence-item mb-3">
        <div class="med-adherence-header">
          <strong>${escapeHtml(stat.name)} <span class="text-secondary font-normal">(${escapeHtml(stat.dosage)})</span></strong>
          <span class="font-bold">${rate}%</span>
        </div>
        <div class="progress-bar-bg mt-1">
          <div class="progress-bar-fill ${barColor}" style="width: ${rate}%;"></div>
        </div>
        <span class="text-xs text-secondary mt-1 block">
          ${stat.taken} taken / ${stat.eligible} eligible doses (${stat.unrecorded} unrecorded)
        </span>
      </div>
    `
    })
    .join('')
}

/**
 * Missed / Unrecorded Dose History Renderer
 */
function renderMissedHistory(records) {
  if (!records || records.length === 0) {
    return `<p class="text-success p-3">✅ ${t('caregiver.noMissed')}</p>`
  }

  return `
    <div class="table-responsive">
      <table class="table-clean">
        <thead>
          <tr>
            <th>${t('caregiver.dateTime')}</th>
            <th>${t('caregiver.medicine')}</th>
            <th>${t('caregiver.status')}</th>
            <th class="no-print">${t('caregiver.action')}</th>
          </tr>
        </thead>
        <tbody>
          ${records
            .map(
              (r) => `
            <tr>
              <td><strong>${r.date}</strong> at ${r.time}</td>
              <td>${escapeHtml(r.medicationName)} <span class="text-secondary">(${escapeHtml(r.dosage)})</span></td>
              <td>
                <span class="badge ${r.status === 'corrected' ? 'badge-upcoming' : 'badge-missed'}">
                  ${r.status === 'corrected' ? t('caregiver.correctedEntry') : t('caregiver.unrecorded')}
                </span>
              </td>
              <td class="no-print">
                <a href="#/dose-decision?medId=${encodeURIComponent(r.medicationId)}&time=${encodeURIComponent(r.time)}" class="btn btn-ghost btn-sm">
                  ${t('caregiver.doseDecision')}
                </a>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `
}

/**
 * Caregiver Notes List
 */
function renderNotesList(notes, medications) {
  if (!notes || notes.length === 0) {
    return `<p class="text-secondary p-3">${t('caregiver.noNotes')}</p>`
  }

  return notes
    .map((note) => {
      const med = medications.find((m) => m.id === note.medicationId)
      const dateFormatted = new Intl.DateTimeFormat(getLocale() === 'hi' ? 'hi-IN' : getLocale() === 'kn' ? 'kn-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(note.createdAt))

      return `
      <article class="note-card card p-4 mb-3" data-note-id="${note.id}">
        <div class="note-header">
          <div>
            <strong>${escapeHtml(note.author)}</strong>
            ${med ? `<span class="badge badge-due ml-2">${escapeHtml(med.name)}</span>` : ''}
          </div>
          <span class="text-xs text-secondary">${dateFormatted}</span>
        </div>
        <p class="note-content mt-2">${escapeHtml(note.content)}</p>
        <div class="note-actions mt-3 no-print">
          <button class="btn btn-ghost btn-sm btn-edit-note" data-id="${note.id}">${t('caregiver.edit')}</button>
          <button class="btn btn-ghost btn-sm text-danger btn-delete-note" data-id="${note.id}">${t('caregiver.delete')}</button>
        </div>
      </article>
    `
    })
    .join('')
}

/**
 * Attach Note Edit / Delete events
 */
function attachNoteEventListeners(container, medications) {
  container.querySelectorAll('.btn-edit-note').forEach((btn) => {
    btn.addEventListener('click', () => {
      const noteId = btn.dataset.id
      const note = getAllNotes().find((n) => n.id === noteId)
      if (note) {
        openNoteModal(note, medications, () => renderCaregiverDashboard(container))
      }
    })
  })

  container.querySelectorAll('.btn-delete-note').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const noteId = btn.dataset.id
      const confirmed = await showModal({
        title: t('caregiver.deleteNoteTitle'),
        content: t('caregiver.deleteNoteBody'),
        confirmText: t('common.delete'),
        cancelText: t('common.cancel'),
        dangerous: true,
      })
      if (confirmed) {
        deleteNote(noteId)
        showToast(t('caregiver.noteDeleted'), 'info')
        renderCaregiverDashboard(container)
      }
    })
  })
}

/**
 * Add / Edit Note Modal
 */
function openNoteModal(noteToEdit = null, medications = [], onSaved) {
  const isEdit = Boolean(noteToEdit)
  const wrapper = document.createElement('div')
  wrapper.className = 'note-form-wrapper'

  wrapper.innerHTML = `
    <form id="note-form" novalidate>
      <div class="form-group mb-4">
        <label for="form-note-content" class="form-label">${t('caregiver.noteContent')} *</label>
        <textarea
          id="form-note-content"
          class="form-textarea"
          rows="4"
          required
          placeholder="${t('caregiver.notePlaceholder')}"
        >${isEdit ? escapeHtml(noteToEdit.content) : ''}</textarea>
      </div>

      <div class="form-group mb-4">
        <label for="form-note-med" class="form-label">${t('caregiver.relatedMedication')}</label>
        <select id="form-note-med" class="form-select">
          <option value="">${t('caregiver.noMedication')}</option>
          ${medications
            .map(
              (m) =>
                `<option value="${m.id}" ${isEdit && noteToEdit.medicationId === m.id ? 'selected' : ''}>${escapeHtml(m.name)}</option>`
            )
            .join('')}
        </select>
      </div>
    </form>
  `

  showModal({
    title: isEdit ? t('caregiver.noteUpdated') : t('caregiver.noteContent'),
    content: wrapper,
    confirmText: t('common.save'),
    cancelText: t('common.cancel'),
    onConfirm: async () => {
      const content = wrapper.querySelector('#form-note-content').value.trim()
      const medId = wrapper.querySelector('#form-note-med').value

      if (!content) {
        showToast(t('caregiver.noteEmpty'), 'error')
        return false
      }

      if (isEdit) {
        updateNote(noteToEdit.id, content)
        showToast(t('caregiver.noteUpdated'), 'success')
      } else {
        addNote({ content, medicationId: medId || null, author: 'Caregiver' })
        showToast(t('caregiver.noteSaved'), 'success')
      }

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
