// src/views/settings.js
import { t } from '../i18n/index.js'

export function renderSettings(container) {
  if (!container) return
  container.innerHTML = `
    <section class="view-container settings-view" aria-labelledby="settings-heading">
      <div class="view-header">
        <h1 id="settings-heading" tabindex="-1">${t('settings.title')}</h1>
      </div>
      <div class="card p-6 mt-4">
        <h2>${t('settings.language')}</h2>
        <p class="text-secondary mt-2">${t('settings.about')}</p>
      </div>
    </section>
  `
}
