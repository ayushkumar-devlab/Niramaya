import './style.css'
import { router } from './modules/router.js'
import { initStore, getStore } from './modules/store.js'
import { t, setLocale, getLocale, initLocale } from './i18n/index.js'

// ─── View placeholders (dynamic imports with fallback) ───────────────────────
let renderSenior, renderCaregiver, renderEmergency, renderDoseDecision, renderSafetyChecker, renderSettings

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
<header id="app-header" role="banner">
  <div class="header-inner">
    <div class="header-brand">
      <svg class="brand-icon" width="32" height="32" viewBox="0 0 192 192" aria-hidden="true">
        <rect width="192" height="192" rx="32" fill="#1a2b4a"/>
        <text x="96" y="136" font-family="system-ui" font-weight="700" font-size="110" text-anchor="middle" fill="#ffffff">N</text>
        <line x1="32" y1="168" x2="160" y2="168" stroke="#0d9488" stroke-width="6" stroke-linecap="round"/>
      </svg>
      <span class="brand-name">Niramaya</span>
    </div>
    <nav id="app-desktop-nav" aria-label="${t('a11y.mainNavigation')}">
      <a href="#/senior" class="nav-link" data-route="senior">${t('nav.senior')}</a>
      <a href="#/dose-decision" class="nav-link" data-route="dose-decision">${t('nav.doseDecision')}</a>
      <a href="#/caregiver" class="nav-link" data-route="caregiver">${t('nav.caregiver')}</a>
      <a href="#/emergency" class="nav-link" data-route="emergency">${t('nav.emergency')}</a>
      <a href="#/safety" class="nav-link" data-route="safety">${t('nav.safety')}</a>
      <a href="#/settings" class="nav-link" data-route="settings">${t('nav.settings')}</a>
    </nav>
    <label class="language-selector">
      <span class="sr-only">${t('settings.language')}</span>
      <select id="language-selector" aria-label="${t('settings.language')}">
        <option value="en" lang="en">English</option>
        <option value="hi" lang="hi">हिन्दी</option>
        <option value="kn" lang="kn">ಕನ್ನಡ</option>
      </select>
    </label>
    <button id="senior-mode-toggle" class="btn-ghost senior-toggle" aria-pressed="false" aria-label="${t('a11y.toggleSeniorMode')}">
      <span class="toggle-icon">👴</span>
    </button>
  </div>
</header>

<main id="app-main" role="main" tabindex="-1">
  <!-- Views render here -->
</main>

<nav id="app-nav" aria-label="${t('a11y.bottomNavigation')}" role="navigation">
  <a href="#/senior" class="tab-item" data-route="senior" aria-label="${t('nav.senior')}">
    <span class="tab-icon">💊</span><span class="tab-label">${t('nav.senior')}</span>
  </a>
  <a href="#/dose-decision" class="tab-item" data-route="dose-decision" aria-label="${t('nav.doseDecision')}">
    <span class="tab-icon">❓</span><span class="tab-label">${t('nav.doseDecision')}</span>
  </a>
  <a href="#/caregiver" class="tab-item" data-route="caregiver" aria-label="${t('nav.caregiver')}">
    <span class="tab-icon">🩺</span><span class="tab-label">${t('nav.caregiver')}</span>
  </a>
  <a href="#/emergency" class="tab-item" data-route="emergency" aria-label="${t('nav.emergency')}">
    <span class="tab-icon">🚨</span><span class="tab-label">${t('nav.emergency')}</span>
  </a>
  <a href="#/safety" class="tab-item" data-route="safety" aria-label="${t('nav.safety')}">
    <span class="tab-icon">🛡️</span><span class="tab-label">${t('nav.safety')}</span>
  </a>
  <a href="#/settings" class="tab-item" data-route="settings" aria-label="${t('nav.settings')}">
    <span class="tab-icon">⚙️</span><span class="tab-label">${t('nav.settings')}</span>
  </a>
</nav>

<div id="toast-container" aria-live="polite" aria-atomic="false"></div>
<div id="locale-live-region" class="sr-only" aria-live="polite" aria-atomic="true"></div>
<div id="modal-container"></div>
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
    el.textContent = t(`nav.${el.dataset.route}`)
  })

  // Update bottom nav labels
  document.querySelectorAll('#app-nav .tab-item .tab-label').forEach(el => {
    const route = el.closest('[data-route]')?.dataset.route
    if (route) el.textContent = t(`nav.${route}`)
  })
  const selector = document.getElementById('language-selector')
  if (selector) {
    selector.value = getLocale()
    selector.setAttribute('aria-label', t('settings.language'))
  }
  const seniorToggle = document.getElementById('senior-mode-toggle')
  if (seniorToggle) seniorToggle.setAttribute('aria-label', t('a11y.toggleSeniorMode'))
}

// ─── Settings ────────────────────────────────────────────────────────────────
function applySettings() {
  try {
    const store = getStore()
    const settings = store?.settings || {}
    const html = document.documentElement

    if (settings.seniorMode) {
      html.setAttribute('data-senior', 'true')
    } else {
      html.removeAttribute('data-senior')
    }

    const lang = settings.lang || getLocale() || 'en'
    html.setAttribute('data-lang', lang)
    html.setAttribute('lang', lang)
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

  // 6. Start router (navigates to current hash or default)
  router.init()

  // 7. Set initial nav active state
  updateNavActiveState()

  // 8. Senior Mode toggle
  const toggleBtn = document.getElementById('senior-mode-toggle')
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const html = document.documentElement
      const isSenior = html.hasAttribute('data-senior')
      if (isSenior) {
        html.removeAttribute('data-senior')
        toggleBtn.setAttribute('aria-pressed', 'false')
      } else {
        html.setAttribute('data-senior', 'true')
        toggleBtn.setAttribute('aria-pressed', 'true')
      }

      // Persist to store if available
      try {
        const store = getStore()
        if (store?.settings) {
          store.settings.seniorMode = !isSenior
        }

        const languageSelector = document.getElementById('language-selector')
        if (languageSelector) {
          languageSelector.value = getLocale()
          languageSelector.addEventListener('change', (event) => setLocale(event.target.value))
        }
      } catch (_) {}
    })
  }

  // 9. Register Service Worker with root scope
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(err => {
      console.warn('SW registration failed:', err)
    })
  }

  // 10. Locale change listener
  window.addEventListener('localechange', () => {
    applySettings()
    applyLocale()
    router.rerender()
  })

  // 11. Hash change → update nav active state
  window.addEventListener('hashchange', () => {
    const route = window.location.hash.replace(/^#\//, '') || 'senior'
    updateNavActiveState(route)
  })
}

init().catch(console.error)
