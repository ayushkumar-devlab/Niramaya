// src/views/safetyChecker.js
import { t } from '../i18n/index.js'

export function renderSafetyChecker(container) {
  if (!container) return
  container.innerHTML = `
    <section class="view-container safety-view" aria-labelledby="safety-heading">
      <div class="view-header">
        <h1 id="safety-heading" tabindex="-1">${t('safety.title')}</h1>
      </div>
      <div class="card p-6 mt-4">
        <p class="text-secondary">${t('safety.disclaimer')}</p>
      </div>
    </section>
  `
}
