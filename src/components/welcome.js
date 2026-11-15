import { t, getLocale, setLanguage } from '../i18n/index.js'
import { markWelcomeSeen } from '../modules/welcomeState.js'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const ITEM_ICONS = [
  '<path d="M5 5h14v14H5zM8 9h8M8 13h8M8 17h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  '<path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  '<path d="M12 5a7 7 0 1 0 7 7M12 8v4l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  '<path d="M12 3 19 6v5c0 4-2.5 7-7 9-4.5-2-7-5-7-9V6z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
]
const ITEM_KEYS = ['addMedicines', 'checkSchedule', 'markTaken', 'emergencyCard']
let activeClose = null

export function closeWelcomeGuide() {
  activeClose?.()
}

function iconSvg(index) {
  return `<svg class="welcome-item-icon" viewBox="0 0 24 24" aria-hidden="true">${ITEM_ICONS[index]}</svg>`
}

function renderContent() {
  return `
    <img class="welcome-logo" src="/logo.svg" alt="${t('a11y.logo')}" width="48" height="48">
    <h2 id="welcome-heading">${t('welcome.title')}</h2>
    <p class="welcome-tagline">${t('welcome.tagline')}</p>
    <div class="welcome-language-options" role="group" aria-label="${t('welcome.chooseLanguage')}">
      ${[['en', 'welcome.english', 'en'], ['hi', 'welcome.hindi', 'hi'], ['kn', 'welcome.kannada', 'kn']].map(([value, key, lang]) => `
        <button type="button" class="welcome-language-button ${getLocale() === value ? 'active' : ''}" data-welcome-language="${value}" lang="${lang}" aria-pressed="${getLocale() === value}">${t(key)}</button>
      `).join('')}
    </div>
    <section class="welcome-how-to" aria-labelledby="welcome-how-to-heading">
      <h3 id="welcome-how-to-heading">${t('welcome.howToUse')}</h3>
      <ul class="welcome-item-list">
        ${ITEM_KEYS.map((key, index) => `<li>${iconSvg(index)}<span>${t(`welcome.${key}`)}</span></li>`).join('')}
      </ul>
    </section>
    <p class="welcome-privacy">${t('welcome.privacyLine')}</p>
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
      <div class="welcome-content"></div>
      <div class="welcome-live sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
      <div class="welcome-actions">
        <button class="btn btn-primary welcome-start" type="button">${t('welcome.getStarted')}</button>
      </div>
    </div>
  `
  document.body.appendChild(backdrop)

  let closed = false
  const content = backdrop.querySelector('.welcome-content')
  const live = backdrop.querySelector('.welcome-live')

  const render = (focusLanguage = null) => {
    content.innerHTML = renderContent()
    backdrop.querySelector('.welcome-close').setAttribute('aria-label', t('a11y.closeDialog'))
    backdrop.querySelector('.welcome-start').textContent = t('welcome.getStarted')
    if (focusLanguage) backdrop.querySelector(`[data-welcome-language="${focusLanguage}"]`)?.focus()
  }

  const close = () => {
    if (closed) return
    closed = true
    activeClose = null
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
    if (closed) return
    render()
    live.textContent = t('welcome.title')
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
  backdrop.querySelector('.welcome-start').addEventListener('click', close)
  backdrop.addEventListener('click', (event) => {
    const languageButton = event.target.closest('[data-welcome-language]')
    if (!languageButton) return
    setLanguage(languageButton.dataset.welcomeLanguage)
    render(languageButton.dataset.welcomeLanguage)
  })
  document.addEventListener('localechange', onLocaleChange)
  document.addEventListener('keydown', onKeyDown)
  activeClose = close
  render()
  backdrop.querySelector('.welcome-language-button, .welcome-start')?.focus()
}
