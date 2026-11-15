import { t, getLocale, setLanguage } from '../i18n/index.js'
import { clearStore, exportData, importData, initStore } from '../modules/store.js'
import { getSettings, saveSettings, applySettingsToDocument, TEXT_SIZES } from '../modules/settings.js'
import { speechService } from '../modules/speech.js'
import { showModal } from '../components/modal.js'
import { showToast } from '../components/toast.js'
import { openWelcomeGuide } from '../components/welcome.js'

const languageOptions = [
  ['en', 'English', 'en'],
  ['hi', 'हिन्दी', 'hi'],
  ['kn', 'ಕನ್ನಡ', 'kn'],
]

export function renderSettings(container) {
  if (!container) return
  const settings = getSettings()
  const language = getLocale()
  const rate = Number.isFinite(settings.speechRate) ? settings.speechRate : 0.9
  const size = TEXT_SIZES.includes(settings.fontSize) ? settings.fontSize : 'normal'

  container.innerHTML = `
    <section class="view-container settings-view stack" aria-labelledby="settings-heading">
      <div class="view-header">
        <h1 id="settings-heading" tabindex="-1">${t('settings.title')}</h1>
      </div>

      <section class="card settings-card stack" aria-labelledby="settings-language-heading">
        <div>
          <h2 id="settings-language-heading">${t('settings.language')}</h2>
          <p class="text-secondary">${t('settings.about')}</p>
        </div>
        <div class="language-options" role="radiogroup" aria-label="${t('settings.language')}">
          ${languageOptions.map(([value, label, lang]) => `
            <label class="language-option ${language === value ? 'selected' : ''}" lang="${lang}">
              <input type="radio" name="settings-language" value="${value}" ${language === value ? 'checked' : ''}>
              <span>${label}</span>
            </label>
          `).join('')}
        </div>
      </section>

      <section class="card settings-card stack" aria-labelledby="settings-display-heading">
        <h2 id="settings-display-heading">${t('settings.display')}</h2>
        <label class="setting-switch">
          <input id="setting-senior-mode" type="checkbox" ${settings.seniorMode ? 'checked' : ''}>
          <span>${t('settings.seniorMode')}</span>
        </label>
        <div class="setting-row">
          <div>
            <strong>${t('settings.textSize')}</strong>
            <p id="text-size-preview" class="text-secondary">${t('settings.textPreview')}</p>
          </div>
          <div class="button-group" role="group" aria-label="${t('settings.textSize')}">
            <button id="settings-text-decrease" class="btn btn-secondary btn-sm" type="button" aria-label="${t('settings.decreaseText')}">A−</button>
            <button id="settings-text-increase" class="btn btn-secondary btn-sm" type="button" aria-label="${t('settings.increaseText')}">A+</button>
          </div>
        </div>
        <label class="setting-switch">
          <input id="setting-high-contrast" type="checkbox" ${settings.highContrast ? 'checked' : ''}>
          <span><strong>${t('settings.highContrast')}</strong><small>${t('settings.highContrastHelp')}</small></span>
        </label>
        <label class="setting-field" for="setting-reduce-motion">
          <span>${t('settings.reduceMotion')}</span>
          <select id="setting-reduce-motion" class="form-select">
            <option value="system" ${settings.reduceMotion === 'system' ? 'selected' : ''}>${t('settings.reduceMotionSystem')}</option>
            <option value="on" ${settings.reduceMotion === 'on' ? 'selected' : ''}>${t('settings.reduceMotionOn')}</option>
            <option value="off" ${settings.reduceMotion === 'off' ? 'selected' : ''}>${t('settings.reduceMotionOff')}</option>
          </select>
        </label>
      </section>

      <section class="card settings-card stack" aria-labelledby="settings-voice-heading">
        <h2 id="settings-voice-heading">${t('settings.voice')}</h2>
        <label class="setting-switch">
          <input id="setting-voice-enabled" type="checkbox" ${settings.voiceEnabled !== false ? 'checked' : ''}>
          <span>${t('settings.voiceEnabled')}</span>
        </label>
        <label class="setting-field" for="setting-speech-rate">
          <span>${t('settings.speechSpeed')} <output id="speech-rate-output">${rate.toFixed(1)}x</output></span>
          <input id="setting-speech-rate" type="range" min="0.7" max="1.2" step="0.1" value="${rate}">
        </label>
        <button id="test-voice" class="btn btn-secondary" type="button">${t('settings.testVoice')}</button>
      </section>

      <section class="card settings-card stack" aria-labelledby="settings-data-heading">
        <h2 id="settings-data-heading">${t('settings.dataPrivacy')}</h2>
        <p class="text-secondary">${t('settings.dataOnDevice')}</p>
        <div class="button-group settings-data-actions">
          <button id="export-data" class="btn btn-secondary" type="button">${t('settings.exportData')}</button>
          <button id="import-data" class="btn btn-secondary" type="button">${t('settings.importDataAction')}</button>
          <input id="import-file" type="file" accept="application/json,.json" hidden>
          <button id="clear-data" class="btn btn-danger" type="button">${t('settings.clearData')}</button>
        </div>
      </section>

      <section class="card settings-card stack" aria-labelledby="settings-help-heading">
        <h2 id="settings-help-heading">${t('settings.help')}</h2>
        <div class="button-group">
          <a class="btn btn-secondary" href="/how-to-use">${t('settings.openGuide')}</a>
          <button id="show-welcome-guide" class="btn btn-secondary" type="button">${t('welcome.showGuide')}</button>
          <a class="btn btn-secondary" href="/safety">${t('settings.openSafety')}</a>
          <a class="btn btn-ghost" href="/how-to-use">${t('settings.disclaimer')}</a>
        </div>
      </section>

      <section class="card settings-card stack" aria-labelledby="settings-about-heading">
        <h2 id="settings-about-heading">${t('settings.about')}</h2>
        <p><strong>Niramaya</strong> · v1.0</p>
        <p class="text-secondary">${t('settings.worksOffline')}</p>
        <p class="text-secondary">${t('settings.disclaimer')}</p>
        <p class="text-secondary">${t('settings.noDataLeaves')}</p>
      </section>
    </section>
  `

  const save = (updates) => {
    applySettingsToDocument(saveSettings(updates))
  }

  container.querySelectorAll('input[name="settings-language"]').forEach((input) => {
    input.addEventListener('change', (event) => setLanguage(event.target.value))
  })
  container.querySelector('#show-welcome-guide')?.addEventListener('click', () => openWelcomeGuide({ markSeenOnClose: false }))
  container.querySelector('#setting-senior-mode')?.addEventListener('change', (event) => save({ seniorMode: event.target.checked }))
  container.querySelector('#setting-high-contrast')?.addEventListener('change', (event) => save({ highContrast: event.target.checked }))
  container.querySelector('#setting-reduce-motion')?.addEventListener('change', (event) => save({ reduceMotion: event.target.value }))

  const changeTextSize = (direction) => {
    const current = TEXT_SIZES.indexOf(getSettings().fontSize || 'normal')
    const next = direction === 'up' ? Math.min(TEXT_SIZES.length - 1, current + 1) : Math.max(0, current - 1)
    save({ fontSize: TEXT_SIZES[next] })
  }
  container.querySelector('#settings-text-decrease')?.addEventListener('click', () => changeTextSize('down'))
  container.querySelector('#settings-text-increase')?.addEventListener('click', () => changeTextSize('up'))

  const rateInput = container.querySelector('#setting-speech-rate')
  const rateOutput = container.querySelector('#speech-rate-output')
  rateInput?.addEventListener('input', (event) => {
    const value = Number(event.target.value)
    if (rateOutput) rateOutput.textContent = `${value.toFixed(1)}x`
    applySettingsToDocument(saveSettings({ speechRate: value }, { notify: false }))
  })
  container.querySelector('#setting-voice-enabled')?.addEventListener('change', (event) => save({ voiceEnabled: event.target.checked }))
  container.querySelector('#test-voice')?.addEventListener('click', () => {
    if (!speechService.isAvailable() || !speechService.hasVoice(getLocale())) {
      showToast(t('senior.speechUnavailable'), 'warning')
      return
    }
    speechService.speak(t('settings.textPreview'), getLocale(), { rate: getSettings().speechRate })
  })

  container.querySelector('#export-data')?.addEventListener('click', () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'niramaya-backup.json'
    link.click()
    URL.revokeObjectURL(url)
    showToast(t('settings.exportSuccess'), 'success')
  })

  const importFile = container.querySelector('#import-file')
  container.querySelector('#import-data')?.addEventListener('click', () => importFile?.click())
  importFile?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const result = importData(await file.text())
    if (!result.success) {
      showToast(t('settings.importInvalid'), 'warning')
      return
    }
    showToast(t('settings.importSuccess'), 'success')
    initStore()
    const importedLanguage = getSettings().language
    if (['en', 'hi', 'kn'].includes(importedLanguage)) setLanguage(importedLanguage)
    document.dispatchEvent(new CustomEvent('settingschange'))
  })

  container.querySelector('#clear-data')?.addEventListener('click', async () => {
    const confirmed = await showModal({
      title: t('settings.clearDataTitle'),
      content: `<p>${t('settings.clearDataBody')}</p>`,
      confirmText: t('settings.clearDataConfirm'),
      cancelText: t('common.cancel'),
      dangerous: true,
    })
    if (!confirmed) return
    clearStore()
    initStore()
    setLanguage('en')
    showToast(t('common.success'), 'success')
    document.dispatchEvent(new CustomEvent('settingschange'))
  })
}
