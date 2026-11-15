// src/views/emergency.js — Dedicated High-Contrast Emergency Snapshot (Swasthya Card)

import { t } from '../i18n/index.js'
import {
  getEmergencySnapshot,
  saveEmergencySnapshot,
  ALLERGY_STATUSES,
  isValidPhoneNumber,
} from '../modules/emergency.js'
import { showModal } from '../components/modal.js'
import { showToast } from '../components/toast.js'

export function renderEmergency(container) {
  if (!container) return

  const data = getEmergencySnapshot()
  const hasEmergencyContact = Boolean(
    data.emergencyContact && data.emergencyContact.name && data.emergencyContact.phone
  )
  const contactPhone = hasEmergencyContact ? data.emergencyContact.phone.trim() : ''
  const cleanTelHref = contactPhone ? `tel:${contactPhone.replace(/\s+/g, '')}` : '#'

  // Allergy status display
  let allergyDisplayClass = 'allergy-badge-unknown'
  let allergyText = t('emergency.allergyUnknown')
  if (data.allergyStatus === ALLERGY_STATUSES.NO_KNOWN) {
    allergyDisplayClass = 'allergy-badge-none'
    allergyText = t('emergency.noKnownAllergies')
  } else if (
    data.allergyStatus === ALLERGY_STATUSES.HAS_ALLERGIES &&
    data.allergiesList &&
    data.allergiesList.length > 0
  ) {
    allergyDisplayClass = 'allergy-badge-has'
    allergyText = data.allergiesList.join(', ')
  }

  container.innerHTML = `
    <div class="view-container emergency-container" role="region" aria-labelledby="emergency-card-title">
      <!-- High-Contrast Emergency Banner Header -->
      <header class="emergency-hero-banner" role="banner">
        <div class="emergency-print-brand"><img src="/logo.svg" alt="${t('a11y.logo')}"><strong>Niramaya</strong></div>
        <div class="emergency-badge-lead">
          <span class="emergency-pulse-icon" aria-hidden="true">🚨</span>
          <span>${t('emergency.badgeTitle')}</span>
        </div>
        <h1 id="emergency-card-title" class="emergency-patient-name" tabindex="-1">
          ${escapeHtml(data.patientName || t('emergency.medicalEmergencyCard'))}
        </h1>
        <div class="emergency-vitals-row mt-2">
          ${data.age ? `<span class="vital-pill"><strong>${t('emergency.age')}</strong> ${escapeHtml(data.age)}</span>` : ''}
          ${data.bloodType ? `<span class="vital-pill blood-pill"><strong>${t('emergency.bloodLabel')}</strong> ${escapeHtml(data.bloodType)}</span>` : ''}
          <span class="vital-pill ${allergyDisplayClass}"><strong>${t('emergency.allergiesLabel')}</strong> ${escapeHtml(allergyText)}</span>
        </div>
      </header>

      <!-- Primary Emergency Action: Large Accessible Call Button -->
      <section class="emergency-call-section mt-4 no-print" aria-label="${t('emergency.callActionLabel')}">
        ${
          hasEmergencyContact
            ? `
          <a
            id="btn-call-emergency"
            href="${cleanTelHref}"
            class="btn btn-emergency-call"
            aria-label="${t('emergency.callContactLabel', { name: data.emergencyContact.name, phone: data.emergencyContact.phone })}"
          >
            <span class="call-icon" aria-hidden="true">📞</span>
            <div class="call-text-group">
              <span class="call-lead-label">${t('emergency.callAction')}</span>
              <span class="call-contact-name">${escapeHtml(data.emergencyContact.name)} (${escapeHtml(data.emergencyContact.relationship || t('emergency.contactLabel'))})</span>
              <span class="call-phone-number">${escapeHtml(data.emergencyContact.phone)}</span>
            </div>
          </a>
        `
            : `
          <div class="card warning-contact-missing p-4 text-center">
            <span class="text-danger font-bold">⚠️ ${t('emergency.noContact')}</span>
            <p class="text-secondary text-sm mt-1">${t('emergency.addContactHelp')}</p>
            <button id="btn-quick-add-contact" class="btn btn-primary btn-sm mt-3">
              ${t('emergency.addContact')}
            </button>
          </div>
        `
        }
      </section>

      <!-- Top Actions Bar -->
      <div class="emergency-actions-bar mt-4 no-print">
        <button id="btn-edit-emergency" class="btn btn-secondary btn-sm" type="button">
          ✏️ ${t('emergency.editInfo')}
        </button>
        <button id="btn-print-emergency" class="btn btn-ghost btn-sm" type="button">
          🖨️ ${t('caregiver.printReport')}
        </button>
      </div>

      <!-- Medical Sections Grid -->
      <div class="emergency-sections-grid mt-4">
        <!-- 1. Known Medical Conditions -->
        <section class="card emergency-section-card" aria-labelledby="conditions-heading">
          <h2 id="conditions-heading" class="emergency-section-heading">
            <span aria-hidden="true">🩺</span> ${t('emergency.conditions')}
          </h2>
          <div class="emergency-section-body mt-2">
            ${
              data.conditions && data.conditions.length > 0
                ? `<ul class="medical-tags-list">
                    ${data.conditions.map((c) => `<li class="medical-tag condition-tag">${escapeHtml(c)}</li>`).join('')}
                  </ul>`
                : `<p class="text-secondary italic">${t('emergency.noConditionsRecorded')}</p>`
            }
          </div>
        </section>

        <!-- 2. Allergies Details -->
        <section class="card emergency-section-card" aria-labelledby="allergies-heading">
          <h2 id="allergies-heading" class="emergency-section-heading">
            <span aria-hidden="true">⚠️</span> ${t('emergency.allergies')}
          </h2>
          <div class="emergency-section-body mt-2">
            <p class="font-bold ${data.allergyStatus === ALLERGY_STATUSES.HAS_ALLERGIES ? 'text-danger' : ''}">
              ${escapeHtml(allergyText)}
            </p>
            ${
              data.allergyStatus === ALLERGY_STATUSES.UNKNOWN
                ? `<p class="text-secondary text-xs mt-1">⚠️ ${t('emergency.allergyNote')}</p>`
                : ''
            }
          </div>
        </section>

        <!-- 3. Current Medications (Auto-synchronized from store) -->
        <section class="card emergency-section-card col-span-full" aria-labelledby="medications-heading">
          <h2 id="medications-heading" class="emergency-section-heading">
            <span aria-hidden="true">💊</span> ${t('emergency.currentPrescriptions', { count: data.currentMedications.length })}
          </h2>
          <div class="emergency-section-body mt-2">
            ${
              data.currentMedications && data.currentMedications.length > 0
                ? `
                <div class="table-responsive">
                  <table class="table-clean emergency-med-table">
                    <thead>
                      <tr>
                        <th>${t('emergency.medicationLabel')}</th>
                        <th>${t('emergency.dosageLabel')}</th>
                        <th>${t('emergency.timesLabel')}</th>
                        <th>${t('emergency.instructionsLabel')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${data.currentMedications
                        .map(
                          (m) => `
                        <tr>
                          <td><strong>${escapeHtml(m.name)}</strong></td>
                          <td><span class="badge badge-due">${escapeHtml(m.dosage)}</span></td>
                          <td>${m.times && m.times.length > 0 ? m.times.join(', ') : t('emergency.daily')}</td>
                          <td class="text-secondary text-sm">${escapeHtml(m.instructions || t('emergency.standardDosing'))}</td>
                        </tr>
                      `
                        )
                        .join('')}
                    </tbody>
                  </table>
                </div>
              `
                : `<p class="text-secondary italic">${t('emergency.noActivePrescriptions')}</p>`
            }
          </div>
        </section>

        <!-- 4. Primary Doctor & Clinic Contacts -->
        <section class="card emergency-section-card col-span-full" aria-labelledby="doctor-heading">
          <h2 id="doctor-heading" class="emergency-section-heading">
            <span aria-hidden="true">👨‍⚕️</span> ${t('emergency.gp')}
          </h2>
          <div class="emergency-section-body mt-2">
            ${
              data.primaryDoctor && (data.primaryDoctor.name || data.primaryDoctor.phone)
                ? `
                <div class="doctor-contact-box">
                  <p><strong>${t('emergency.doctorLabel')}</strong> ${escapeHtml(data.primaryDoctor.name || t('emergency.notSpecified'))}</p>
                  ${data.primaryDoctor.clinic ? `<p><strong>${t('emergency.clinicLabel')}</strong> ${escapeHtml(data.primaryDoctor.clinic)}</p>` : ''}
                  ${
                    data.primaryDoctor.phone
                      ? `<p><strong>${t('emergency.phoneLabel')}</strong> <a href="tel:${data.primaryDoctor.phone.replace(/\s+/g, '')}" class="text-teal font-bold">${escapeHtml(data.primaryDoctor.phone)}</a></p>`
                      : ''
                  }
                </div>
              `
                : `<p class="text-secondary italic">${t('emergency.doctorNotSpecified')}</p>`
            }
          </div>
        </section>
      </div>

      <!-- Offline Availability & Device Privacy Notice -->
      <footer class="card emergency-privacy-footer mt-6 no-print" role="note">
        <div class="privacy-flex">
          <span class="privacy-icon" aria-hidden="true">🛡️</span>
          <div>
            <h3 class="privacy-title">${t('emergency.privacyTitle')}</h3>
            <p class="privacy-text text-secondary">
              ${t('emergency.privacyText')}
              <em>${t('emergency.privacyCaution')}</em>
            </p>
          </div>
        </div>
      </footer>
    </div>
  `

  // Wire Edit Button
  const btnEdit = container.querySelector('#btn-edit-emergency')
  if (btnEdit) {
    btnEdit.addEventListener('click', () => {
      openEmergencyEditModal(data, () => renderEmergency(container))
    })
  }

  // Quick Add Contact Button
  const btnQuickAdd = container.querySelector('#btn-quick-add-contact')
  if (btnQuickAdd) {
    btnQuickAdd.addEventListener('click', () => {
      openEmergencyEditModal(data, () => renderEmergency(container))
    })
  }

  // Wire Print Button
  const btnPrint = container.querySelector('#btn-print-emergency')
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print()
    })
  }
}

/**
 * Edit Emergency Information Modal
 */
function openEmergencyEditModal(data, onSaved) {
  const wrapper = document.createElement('div')
  wrapper.className = 'emergency-form-wrapper'

  const allergiesCsv =
    data.allergyStatus === ALLERGY_STATUSES.HAS_ALLERGIES && data.allergiesList
      ? data.allergiesList.join(', ')
      : ''
  const conditionsCsv = data.conditions ? data.conditions.join(', ') : ''

  wrapper.innerHTML = `
    <form id="emergency-edit-form" novalidate>
      <div class="form-group mb-3">
        <label for="form-em-name" class="form-label">${t('emergency.patientName')} *</label>
        <input
          id="form-em-name"
          type="text"
          class="form-input"
          required
          placeholder="${t('emergency.patientNamePlaceholder')}"
          value="${escapeHtml(data.patientName || '')}"
        />
      </div>

      <div class="form-row-2 mb-3">
        <div class="form-group">
          <label for="form-em-age" class="form-label">${t('emergency.age')}</label>
          <input
            id="form-em-age"
            type="number"
            class="form-input"
            placeholder="${t('emergency.agePlaceholder')}"
            value="${escapeHtml(data.age || '')}"
          />
        </div>
        <div class="form-group">
          <label for="form-em-blood" class="form-label">${t('emergency.blood')}</label>
          <select id="form-em-blood" class="form-select">
            <option value="">-- ${t('emergency.blood')} --</option>
            ${['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown']
              .map(
                (bg) =>
                  `<option value="${bg}" ${data.bloodType === bg ? 'selected' : ''}>${bg}</option>`
              )
              .join('')}
          </select>
        </div>
      </div>

      <!-- Allergy Status Fieldset -->
      <div class="form-group mb-3">
        <label class="form-label font-bold">${t('emergency.allergies')}</label>
        <div class="radio-group-vertical mt-1">
          <label class="radio-label">
            <input
              type="radio"
              name="allergyStatusRadio"
              value="${ALLERGY_STATUSES.UNKNOWN}"
              ${data.allergyStatus === ALLERGY_STATUSES.UNKNOWN ? 'checked' : ''}
            />
            <span>⚠️ ${t('emergency.allergyUnknown')}</span>
          </label>
          <label class="radio-label">
            <input
              type="radio"
              name="allergyStatusRadio"
              value="${ALLERGY_STATUSES.NO_KNOWN}"
              ${data.allergyStatus === ALLERGY_STATUSES.NO_KNOWN ? 'checked' : ''}
            />
            <span>✅ ${t('emergency.noKnownAllergies')}</span>
          </label>
          <label class="radio-label">
            <input
              type="radio"
              name="allergyStatusRadio"
              value="${ALLERGY_STATUSES.HAS_ALLERGIES}"
              ${data.allergyStatus === ALLERGY_STATUSES.HAS_ALLERGIES ? 'checked' : ''}
            />
            <span>🚨 ${t('emergency.hasSpecificAllergies')}</span>
          </label>
        </div>
        <input
          id="form-em-allergies-list"
          type="text"
          class="form-input mt-2"
          placeholder="${t('emergency.allergiesPlaceholder')}"
          value="${escapeHtml(allergiesCsv)}"
          style="${data.allergyStatus === ALLERGY_STATUSES.HAS_ALLERGIES ? '' : 'display:none;'}"
        />
      </div>

      <!-- Medical Conditions -->
      <div class="form-group mb-3">
        <label for="form-em-conditions" class="form-label">${t('emergency.conditions')} (${t('emergency.commaSeparated')})</label>
        <input
          id="form-em-conditions"
          type="text"
          class="form-input"
          placeholder="${t('emergency.conditionsPlaceholder')}"
          value="${escapeHtml(conditionsCsv)}"
        />
      </div>

      <hr class="mt-4 mb-4" />
      <h3 class="font-bold text-navy mb-2">${t('emergency.contactTitle')}</h3>

      <div class="form-group mb-3">
        <label for="form-em-contact-name" class="form-label">${t('emergency.contactName')}</label>
        <input
          id="form-em-contact-name"
          type="text"
          class="form-input"
          placeholder="${t('emergency.contactNamePlaceholder')}"
          value="${escapeHtml(data.emergencyContact?.name || '')}"
        />
      </div>

      <div class="form-row-2 mb-3">
        <div class="form-group">
          <label for="form-em-contact-phone" class="form-label">${t('emergency.contactPhone')}</label>
          <input
            id="form-em-contact-phone"
            type="tel"
            class="form-input"
            placeholder="${t('emergency.contactPhonePlaceholder')}"
            value="${escapeHtml(data.emergencyContact?.phone || '')}"
          />
        </div>
        <div class="form-group">
          <label for="form-em-contact-rel" class="form-label">${t('emergency.relationship')}</label>
          <input
            id="form-em-contact-rel"
            type="text"
            class="form-input"
            placeholder="${t('emergency.relationshipPlaceholder')}"
            value="${escapeHtml(data.emergencyContact?.relationship || '')}"
          />
        </div>
      </div>

      <hr class="mt-4 mb-4" />
      <h3 class="font-bold text-navy mb-2">${t('emergency.gp')}</h3>

      <div class="form-row-2 mb-3">
        <div class="form-group">
          <label for="form-em-doctor-name" class="form-label">${t('emergency.doctorName')}</label>
          <input
            id="form-em-doctor-name"
            type="text"
            class="form-input"
            placeholder="${t('emergency.doctorNamePlaceholder')}"
            value="${escapeHtml(data.primaryDoctor?.name || '')}"
          />
        </div>
        <div class="form-group">
          <label for="form-em-doctor-phone" class="form-label">${t('emergency.doctorPhone')}</label>
          <input
            id="form-em-doctor-phone"
            type="tel"
            class="form-input"
            placeholder="${t('emergency.doctorPhonePlaceholder')}"
            value="${escapeHtml(data.primaryDoctor?.phone || '')}"
          />
        </div>
      </div>
    </form>
  `

  const radioGroup = wrapper.querySelectorAll('input[name="allergyStatusRadio"]')
  const allergiesInput = wrapper.querySelector('#form-em-allergies-list')

  radioGroup.forEach((r) => {
    r.addEventListener('change', (e) => {
      if (e.target.value === ALLERGY_STATUSES.HAS_ALLERGIES) {
        allergiesInput.style.display = 'block'
        allergiesInput.focus()
      } else {
        allergiesInput.style.display = 'none'
      }
    })
  })

  showModal({
    title: t('emergency.editInfo'),
    content: wrapper,
    confirmText: t('common.save'),
    cancelText: t('common.cancel'),
    onConfirm: async () => {
      const patientName = wrapper.querySelector('#form-em-name').value.trim()
      const age = wrapper.querySelector('#form-em-age').value.trim()
      const bloodType = wrapper.querySelector('#form-em-blood').value
      const selectedAllergyStatus =
        wrapper.querySelector('input[name="allergyStatusRadio"]:checked')?.value ||
        ALLERGY_STATUSES.UNKNOWN
      const allergiesRaw = allergiesInput.value
      const conditionsRaw = wrapper.querySelector('#form-em-conditions').value

      const contactName = wrapper.querySelector('#form-em-contact-name').value.trim()
      const contactPhone = wrapper.querySelector('#form-em-contact-phone').value.trim()
      const contactRel = wrapper.querySelector('#form-em-contact-rel').value.trim()

      const doctorName = wrapper.querySelector('#form-em-doctor-name').value.trim()
      const doctorPhone = wrapper.querySelector('#form-em-doctor-phone').value.trim()

      // Validate contact phone if entered
      if (contactPhone && !isValidPhoneNumber(contactPhone)) {
        showToast(t('validation.emergencyPhone'), 'error')
        return false
      }

      // Validate doctor phone if entered
      if (doctorPhone && !isValidPhoneNumber(doctorPhone)) {
        showToast(t('validation.doctorPhone'), 'error')
        return false
      }

      const allergiesList =
        selectedAllergyStatus === ALLERGY_STATUSES.HAS_ALLERGIES
          ? allergiesRaw
              .split(',')
              .map((a) => a.trim())
              .filter(Boolean)
          : []

      const conditionsList = conditionsRaw
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)

      const payload = {
        patientName,
        age,
        bloodType,
        allergyStatus: selectedAllergyStatus,
        allergiesList,
        conditions: conditionsList,
        emergencyContact: {
          name: contactName,
          phone: contactPhone,
          relationship: contactRel,
        },
        primaryDoctor: {
          name: doctorName,
          phone: doctorPhone,
        },
      }

      const saveRes = saveEmergencySnapshot(payload)
      if (!saveRes.success) {
        showToast(saveRes.errors[0], 'error')
        return false
      }

      showToast('Emergency snapshot updated', 'success')
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
