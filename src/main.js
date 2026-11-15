import './style.css'
import { router } from './modules/router.js'
import { initStore, getStore, KEYS } from './modules/store.js'
import { t, setLanguage, getLocale, initLocale } from './i18n/index.js'
import { renderHowToUse } from './views/howToUse.js'
import { showToast } from './components/toast.js'
import { openWelcomeGuide } from './components/welcome.js'
import { shouldShowWelcome } from './modules/welcomeState.js'
import { getSettings, applySettingsToDocument } from './modules/settings.js'
import { registerConnectivityListeners } from './modules/connectivity.js'

// ─── View placeholders (dynamic imports with fallback) ───────────────────────
let renderSenior, renderCaregiver, renderEmergency, renderDoseDecision, renderSafetyChecker, renderSettings
let isOnline = typeof navigator === 'undefined' ? true : navigator.onLine

function iconSvg(name) {
  const paths = {
    senior: '<path d="M5 10h14M7 6h10M7 14h10M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    dose: '<path d="M12 5a7 7 0 1 0 7 7M12 8v4l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    caregiver: '<circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 20c.5-4 2.8-6 7-6s6.5 2 7 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    emergency: '<path d="M12 3 4 7v5c0 4.5 3.2 7.5 8 9 4.8-1.5 8-4.5 8-9V7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    safety: '<path d="M12 3 19 6v5c0 4-2.5 7-7 9-4.5-2-7-5-7-9V6z" fill="none" stroke="currentColor" stroke-width="2"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-5v2m0 12v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M3 12h2m14 0h2M4.9 19.1l1.4-1.4M18 6.3l1.4-1.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    guide: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 8h7M8 12h7M8 16h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  }
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.guide}</svg>`
}

function placeholderView(title) {
  return (container) => {
    container.innerHTML = `<div class="view-placeholder"><h1>${title}</h1><p>This feature is being built.</p></div>`
  }
}

async function loadViews() {
  try { ({ renderSenior } = await import('./views/senior.js')) } catch(e) { renderSenior = placeholderView('Senior Mode - Coming Soon') }
  try { ({ renderCaregiver } = await import('./views/caregiver.js')) } catch(e) { renderCaregiver = placeholderView('Caregiver - Coming Soon') }
  try { ({ renderEmergency } = await import('./views/emergency.js')) } catch(e) { renderEmergency = placeholderView('Emergency - Coming Soon') }
  try { ({ renderDoseDecision } = await import('./views/doseDecision.js')) } catch(e) { renderDoseDecision = placeholderView('Dose Decision - Coming Soon') }
  try { ({ renderSafetyChecker } = await import('./views/safetyChecker.js')) } catch(e) { renderSafetyChecker = placeholderView('Safety Checker - Coming Soon') }
  try { ({ renderSettings } = await import('./views/settings.js')) } catch(e) { renderSettings = placeholderView('Settings - Coming Soon') }
}

// ─── App Shell ───────────────────────────────────────────────────────────────
function buildAppShell() {
  document.getElementById('app').innerHTML = `
<a class="skip-link" href="#app-main">${t('a11y.skipToMain')}</a>
<header id="app-header" role="banner">
  <div class="header-inner">
   <div class="header-top">
    <a class="header-brand" href="#/senior" aria-label="${t('a11y.logo')}">
      <img class="brand-icon" src="/logo.svg" alt="" width="40" height="40">
      <span class="brand-name">Niramaya</span>
    </a>
    <div class="header-tools">
    <span id="online-status" class="status-chip ${isOnline ? 'is-online' : 'is-offline'}" role="status">
      <span class="status-dot" aria-hidden="true"></span>
      <span class="status-label">${isOnline ? t('a11y.online') : t('a11y.offline')}</span>
    </span>
    <label class="language-selector">
      <span class="sr-only">${t('settings.language')}</span>
      <select id="language-selector" aria-label="${t('a11y.languageSelector')}">
        <option value="en" lang="en">English</option>
        <option value="hi" lang="hi">हिन्दी</option>
        <option value="kn" lang="kn">ಕನ್ನಡ</option>
      </select>
    </label>
    </div>
   </div>
   <nav id="app-desktop-nav" aria-label="${t('a11y.mainNavigation')}">
      ${[['senior','senior'],['dose-decision','dose'],['caregiver','caregiver'],['emergency','emergency'],['safety','safety'],['how-to-use','guide'],['settings','settings']].map(([route, icon]) => `<a href="#/${route}" class="nav-link" data-route="${route}">${iconSvg(icon)}<span>${t(`nav.${route === 'dose-decision' ? 'doseDecision' : route === 'how-to-use' ? 'howToUse' : route}`)}</span></a>`).join('')}
    </nav>
</header>

<main id="app-main" role="main" tabindex="-1">
  <!-- Views render here -->
</main>

<nav id="app-nav" aria-label="${t('a11y.bottomNavigation')}" role="navigation">
  <a href="#/senior" class="tab-item" data-route="senior" aria-label="${t('nav.senior')}">
    ${iconSvg('senior')}<span class="tab-label">${t('nav.senior')}</span>
  </a>
  <a href="#/dose-decision" class="tab-item" data-route="dose-decision" aria-label="${t('nav.doseDecision')}">
    ${iconSvg('dose')}<span class="tab-label">${t('nav.doseDecision')}</span>
  </a>
  <a href="#/caregiver" class="tab-item" data-route="caregiver" aria-label="${t('nav.caregiver')}">
    ${iconSvg('caregiver')}<span class="tab-label">${t('nav.caregiver')}</span>
  </a>
  <a href="#/emergency" class="tab-item" data-route="emergency" aria-label="${t('nav.emergency')}">
    ${iconSvg('emergency')}<span class="tab-label">${t('nav.emergency')}</span>
  </a>
  <a href="#/safety" class="tab-item" data-route="safety" aria-label="${t('nav.safety')}">
    ${iconSvg('safety')}<span class="tab-label">${t('nav.safety')}</span>
  </a>
  <a href="#/settings" class="tab-item" data-route="settings" aria-label="${t('nav.settings')}">
    ${iconSvg('settings')}<span class="tab-label">${t('nav.settings')}</span>
  </a>
</nav>

<div id="toast-container" aria-live="polite" aria-atomic="false"></div>
<div id="locale-live-region" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
<div id="modal-container"></div>
<footer class="app-footer"><span>${t('footer.version')}</span><span>${t('footer.worksOffline')}</span><a href="#/how-to-use">${t('footer.notMedicalAdvice')}</a></footer>
`
}

// ─── Nav active state ────────────────────────────────────────────────────────
function updateNavActiveState(route) {
  const currentRoute = route || window.location.hash.replace(/^#\//, '') || 'senior'
  document.querySelectorAll('[data-route]').forEach(el => {
    el.classList.toggle('active', el.dataset.route === currentRoute)
  })
}

// ─── Locale ──────────────────────────────────────────────────────────────────
function applyLocale() {
  const locale = getLocale()
  document.documentElement.setAttribute('lang', locale)
  document.documentElement.setAttribute('data-lang', locale)
  document.title = `${t('app.name')} — ${t('app.tagline')}`
  const description = document.querySelector('meta[name="description"]')
  if (description) description.setAttribute('content', `${t('app.name')} — ${t('app.tagline')}`)

  // Update desktop nav text
  document.querySelectorAll('#app-desktop-nav .nav-link[data-route]').forEach(el => {
    const key = el.dataset.route === 'dose-decision' ? 'doseDecision' : el.dataset.route === 'how-to-use' ? 'howToUse' : el.dataset.route
    const label = el.querySelector('span:not(.ui-icon)')
    if (label) label.textContent = t(`nav.${key}`)
  })

  // Update bottom nav labels
  document.querySelectorAll('#app-nav .tab-item .tab-label').forEach(el => {
    const route = el.closest('[data-route]')?.dataset.route
    if (route) {
      const key = route === 'dose-decision' ? 'doseDecision' : route
      el.textContent = t(`nav.${key}`)
      el.closest('[data-route]')?.setAttribute('aria-label', t(`nav.${key}`))
    }
  })
  const selector = document.getElementById('language-selector')
  if (selector) {
    selector.value = getLocale()
    selector.setAttribute('aria-label', t('a11y.languageSelector'))
  }
  const status = document.querySelector('#online-status .status-label')
  if (status) status.textContent = isOnline ? t('a11y.online') : t('a11y.offline')
  const footer = document.querySelector('.app-footer')
  if (footer) footer.innerHTML = `<span>${t('footer.version')}</span><span>${t('footer.worksOffline')}</span><a href="#/how-to-use">${t('footer.notMedicalAdvice')}</a>`
}

// ─── Settings ────────────────────────────────────────────────────────────────
function applySettings() {
  try {
    const settings = getStore(KEYS.SETTINGS) || {}
    applySettingsToDocument(settings)
    const lang = settings.language || getLocale() || 'en'
    document.documentElement.setAttribute('data-lang', lang)
    document.documentElement.setAttribute('lang', lang)
  } catch (e) {
    // Store may not be ready yet; apply defaults
    document.documentElement.setAttribute('data-lang', 'en')
    document.documentElement.setAttribute('lang', 'en')
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────
async function init() {
  // 1. Bootstrap store
  initStore()
  initLocale()

  // 2. Apply settings to <html> before paint
  applySettings()

  // 3. Load views (defensive dynamic imports)
  await loadViews()

  // 4. Build app shell HTML
  buildAppShell()

  // 5. Register routes
  router.register('/senior', () => renderSenior(document.getElementById('app-main')))
  router.register('/caregiver', () => renderCaregiver(document.getElementById('app-main')))
  router.register('/emergency', () => renderEmergency(document.getElementById('app-main')))
  router.register('/dose-decision', () => renderDoseDecision(document.getElementById('app-main')))
  router.register('/safety', () => renderSafetyChecker(document.getElementById('app-main')))
  router.register('/settings', () => renderSettings(document.getElementById('app-main')))
  router.register('/how-to-use', () => renderHowToUse(document.getElementById('app-main')))

  // 6. Start router (navigates to current hash or default)
  router.init()

  // 7. Set initial nav active state
  updateNavActiveState()

  const languageSelector = document.getElementById('language-selector')
  if (languageSelector) {
    languageSelector.addEventListener('change', (event) => setLanguage(event.target.value))
  }
  // 9. Register Service Worker with root scope
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(err => {
      console.warn('SW registration failed:', err)
    })
  }

  // 10. Locale change listener
  document.addEventListener('localechange', () => {
    applySettings()
    applyLocale()
    router.rerender()
  })
  document.addEventListener('settingschange', () => {
    applySettings()
    router.rerender()
  })

  // 11. Hash change → update nav active state
  window.addEventListener('hashchange', () => {
    const route = window.location.hash.replace(/^#\//, '') || 'senior'
    updateNavActiveState(route)
  })

  const updateOnlineStatus = (nextIsOnline, { announce = true } = {}) => {
    const changed = isOnline !== nextIsOnline
    isOnline = nextIsOnline
    const status = document.querySelector('#online-status')
    if (status) {
      status.classList.toggle('is-online', isOnline)
      status.classList.toggle('is-offline', !isOnline)
      status.innerHTML = `<span class="status-dot" aria-hidden="true"></span><span class="status-label">${isOnline ? t('a11y.online') : t('a11y.offline')}</span>`
    }
    if (announce && changed) {
      const messageKey = isOnline ? 'toast.backOnline' : 'toast.offline'
      const message = t(messageKey)
      const liveRegion = document.getElementById('locale-live-region')
      if (liveRegion) liveRegion.textContent = message
      showToast(message, isOnline ? 'success' : 'warning')
    }
  }
  const connectivity = registerConnectivityListeners(window, (nextIsOnline) => updateOnlineStatus(nextIsOnline))
  isOnline = connectivity.initial

  if (import.meta.env.MODE !== 'test' && shouldShowWelcome()) openWelcomeGuide({ markSeenOnClose: true })
}

init().catch(console.error)
