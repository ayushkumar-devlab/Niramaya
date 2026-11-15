// src/views/senior.js
import { t } from '../i18n/index.js'

export function renderSenior(container) {
  if (!container) return
  container.innerHTML = `
    <section class="view-container senior-view" aria-labelledby="senior-heading">
      <div class="view-header">
        <h1 id="senior-heading" tabindex="-1">${t('senior.title')}</h1>
        <p class="subtitle">${t('senior.subtitle')}</p>
      </div>
      <div class="card p-6 mt-4">
        <h2>${t('senior.todaySchedule')}</h2>
        <p class="text-secondary mt-2">${t('senior.noMeds')}</p>
      </div>
    </section>
  `
}
