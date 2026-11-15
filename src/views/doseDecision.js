// src/views/doseDecision.js
import { t } from '../i18n/index.js'

export function renderDoseDecision(container) {
  if (!container) return
  container.innerHTML = `
    <section class="view-container dose-decision-view" aria-labelledby="dose-heading">
      <div class="view-header">
        <h1 id="dose-heading" tabindex="-1">${t('dose.title')}</h1>
      </div>
      <div class="card p-6 mt-4">
        <p class="text-secondary">${t('dose.disclaimer')}</p>
      </div>
    </section>
  `
}
