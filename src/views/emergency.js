// src/views/emergency.js
import { t } from '../i18n/index.js'

export function renderEmergency(container) {
  if (!container) return
  container.innerHTML = `
    <section class="view-container emergency-view" aria-labelledby="emergency-heading">
      <div class="view-header">
        <h1 id="emergency-heading" tabindex="-1">${t('emergency.title')}</h1>
      </div>
      <div class="card p-6 mt-4">
        <p class="text-secondary">${t('emergency.noData')}</p>
      </div>
    </section>
  `
}
