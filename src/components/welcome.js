import { t, getLocale, setLanguage } from '../i18n/index.js'
import { getStore, KEYS } from '../modules/store.js'
import { createWelcomeStepper, markWelcomeSeen } from '../modules/welcomeState.js'
import { speechService } from '../modules/speech.js'
import { showToast } from './toast.js'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const STEP_COUNT = 6
const STEP_ICON = {
  2: '<path d="M5 5h14v14H5zM8 9h8M8 13h8M8 17h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  3: '<path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  4: '<path d="M12 5a7 7 0 1 0 7 7M12 8v4l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  5: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 8h7M8 12h7M8 16h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  6: '<path d="M12 3 19 6v5c0 4-2.5 7-7 9-4.5-2-7-5-7-9V6z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
}

function iconSvg(step) {
  return `<svg class="welcome-step-icon" viewBox="0 0 24 24" aria-hidden="true">${STEP_ICON[step] || STEP_ICON[2]}</svg>`
}

function stepText(step) {
  if (step === 1) {
    return [t('welcome.title'), t('welcome.tagline'), t('welcome.intro')].join(' ')
  }
  if (step === 6) {
    return [
      t('guide.step5Title'),
      t('guide.step5Body'),
      t('welcome.finalData'),
      t('welcome.finalOffline'),
      t('welcome.finalMedical'),
    ].join(' ')
  }
  const guideStep = step - 1
  return `${t(`guide.step${guideStep}Title`)}. ${t(`guide.step${guideStep}Body`)}`
}

function stepContent(step) {
  if (step === 1) {
    return `
      <img class="welcome-logo" src="/logo.svg" alt="${t('a11y.logo')}" width="56" height="56">
      <p class="welcome-eyebrow">${t('welcome.greeting')}</p>
      <h2 id="welcome-heading">${t('welcome.title')}</h2>
      <p class="welcome-tagline">${t('welcome.tagline')}</p>
      <p>${t('welcome.intro')}</p>
      <div class="welcome-language-options" role="group" aria-label="${t('welcome.chooseLanguage')}">
        ${[['en', 'welcome.english', 'en'], ['hi', 'welcome.hindi', 'hi'], ['kn', 'welcome.kannada', 'kn']].map(([value, key, lang]) => `
          <button type="button" class="welcome-language-button ${getLocale() === value ? 'active' : ''}" data-welcome-language="${value}" lang="${lang}" aria-pressed="${getLocale() === value}">${t(key)}</button>
        `).join('')}
      </div>
    `
  }

  if (step === 6) {
    return `
      ${iconSvg(step)}
      <h2 id="welcome-heading">${t('guide.step5Title')}</h2>
      <p>${t('guide.step5Body')}</p>
      <h3>${t('welcome.finalTitle')}</h3>
      <p>${t('welcome.finalData')}</p>
      <p>${t('welcome.finalOffline')}</p>
      <p class="welcome-medical-notice">${t('welcome.finalMedical')}</p>
    `
  }

  const guideStep = step - 1
  return `
    ${iconSvg(step)}
    <h2 id="welcome-heading">${t(`guide.step${guideStep}Title`)}</h2>
    <p>${t(`guide.step${guideStep}Body`)}</p>
  `
}

export function openWelcomeGuide({ markSeenOnClose = false } = {}) {
  const existing = document.querySelector('.welcome-backdrop')
  if (existing) return

  const previousFocus = document.activeElement
  const scrollY = window.scrollY
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.top = `-${scrollY}px`
  document.body.style.width = '100%'

  const backdrop = document.createElement('div')
  backdrop.className = 'welcome-backdrop'
  backdrop.setAttribute('role', 'dialog')
  backdrop.setAttribute('aria-modal', 'true')
  backdrop.setAttribute('aria-labelledby', 'welcome-heading')
  backdrop.innerHTML = `
    <div class="welcome-dialog">
      <button class="welcome-close" type="button" aria-label="${t('a11y.closeDialog')}">&times;</button>
      <div class="welcome-progress" aria-live="polite"></div>
      <div class="welcome-content"></div>
      <div class="welcome-live sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
      <div class="welcome-actions">
        <button class="btn btn-ghost welcome-back" type="button">${t('welcome.back')}</button>
        <button class="btn btn-ghost welcome-skip" type="button">${t('welcome.skip')}</button>
        <button class="btn btn-secondary welcome-read" type="button">${t('welcome.readAloud')}</button>
        <button class="btn btn-primary welcome-next" type="button"></button>
      </div>
    </div>
  `
  document.body.appendChild(backdrop)

  const stepper = createWelcomeStepper(STEP_COUNT)
  let closed = false
  const content = backdrop.querySelector('.welcome-content')
  const progress = backdrop.querySelector('.welcome-progress')
  const live = backdrop.querySelector('.welcome-live')
  const next = backdrop.querySelector('.welcome-next')
  const back = backdrop.querySelector('.welcome-back')

  const renderStep = (announce = true) => {
    const step = stepper.current
    content.innerHTML = stepContent(step)
    progress.textContent = t('welcome.stepCounter', { current: step, total: STEP_COUNT })
    back.hidden = step === 1
    next.textContent = t(step === STEP_COUNT ? 'welcome.getStarted' : 'welcome.next')
    backdrop.querySelector('.welcome-skip').textContent = t('welcome.skip')
    backdrop.querySelector('.welcome-read').textContent = t('welcome.readAloud')
    backdrop.querySelector('.welcome-close').setAttribute('aria-label', t('a11y.closeDialog'))
    if (announce) live.textContent = `${progress.textContent}. ${stepText(step)}`
    const first = backdrop.querySelector('.welcome-language-button, .welcome-next')
    first?.focus()
  }

  const close = () => {
    if (closed) return
    closed = true
    if (markSeenOnClose) markWelcomeSeen()
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('localechange', onLocaleChange)
    backdrop.remove()
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''
    window.scrollTo(0, scrollY)
    previousFocus?.focus?.()
    document.getElementById('app-main')?.focus()
  }

  const onLocaleChange = () => {
    if (!closed) renderStep(false)
  }

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = [...backdrop.querySelectorAll(FOCUSABLE)]
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  backdrop.querySelector('.welcome-close').addEventListener('click', close)
  backdrop.querySelector('.welcome-skip').addEventListener('click', close)
  backdrop.querySelector('.welcome-next').addEventListener('click', () => {
    if (stepper.current === STEP_COUNT) close()
    else { stepper.next(); renderStep() }
  })
  backdrop.querySelector('.welcome-back').addEventListener('click', () => {
    if (stepper.current > 1) { stepper.back(); renderStep() }
  })
  backdrop.querySelector('.welcome-read').addEventListener('click', () => {
    const step = stepper.current
    const text = stepText(step)
    if (!speechService.isAvailable() || !speechService.hasVoice(getLocale())) {
      showToast(t('senior.speechUnavailable'), 'warning')
      return
    }
    speechService.speak(text, getLocale())
  })
  backdrop.addEventListener('click', (event) => {
    const languageButton = event.target.closest('[data-welcome-language]')
    if (!languageButton) return
    setLanguage(languageButton.dataset.welcomeLanguage)
    renderStep()
  })
  document.addEventListener('localechange', onLocaleChange)
  document.addEventListener('keydown', onKeyDown)
  renderStep(false)
}
