// src/views/caregiver.js
import { t } from '../i18n/index.js'

export function renderCaregiver(container) {
  if (!container) return
  container.innerHTML = `
    <section class="view-container caregiver-view" aria-labelledby="caregiver-heading">
      <div class="view-header">
        <h1 id="caregiver-heading" tabindex="-1">${t('caregiver.title')}</h1>
        <p class="subtitle text-secondary">${t('caregiver.sevenDay')}</p>
      </div>
      <div class="card p-6 mt-4">
        <p class="text-secondary">${t('caregiver.noNotes')}</p>
      </div>
    </section>
  `
}
