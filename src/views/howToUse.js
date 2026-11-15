import { t, getLocale } from '../i18n/index.js'
import { speechService } from '../modules/speech.js'
import { showToast } from '../components/toast.js'

const STEPS = [1, 2, 3, 4, 5]

export function renderHowToUse(container) {
  if (!container) return
  container.innerHTML = `
    <div class="view-container guide-container" role="region" aria-labelledby="guide-heading">
      <div class="page-heading-row">
        <div>
          <h1 id="guide-heading">${t('guide.title')}</h1>
          <p class="text-secondary">${t('guide.subtitle')}</p>
        </div>
        <button id="guide-read-aloud" class="btn btn-secondary" type="button">${t('guide.readAloud')}</button>
      </div>
      <ol class="guide-steps">
        ${STEPS.map((step) => `
          <li class="guide-step card">
            <span class="guide-step-number" aria-hidden="true">${step}</span>
            <div>
              <h2>${t(`guide.step${step}Title`)}</h2>
              <p>${t(`guide.step${step}Body`)}</p>
            </div>
          </li>
        `).join('')}
      </ol>
      <section class="card guide-notes" aria-labelledby="guide-notes-heading">
        <h2 id="guide-notes-heading">${t('guide.title')}</h2>
        <ul>
          <li>${t('guide.seniorNote')}</li>
          <li>${t('guide.languageNote')}</li>
          <li>${t('guide.offlineNote')}</li>
          <li>${t('guide.privacyNote')}</li>
        </ul>
        <p class="medical-notice">${t('guide.medicalNotice')}</p>
      </section>
    </div>
  `

  container.querySelector('#guide-read-aloud')?.addEventListener('click', () => {
    const text = [
      t('guide.title'),
      ...STEPS.map((step) => `${t(`guide.step${step}Title`)}. ${t(`guide.step${step}Body`)}`),
      t('guide.seniorNote'),
      t('guide.languageNote'),
      t('guide.offlineNote'),
      t('guide.medicalNotice'),
    ].join(' ')
    if (!speechService.isAvailable() || !speechService.hasVoice(getLocale())) {
      showToast(t('senior.speechUnavailable'), 'warning')
      return
    }
    speechService.speak(text, getLocale())
  })
}
