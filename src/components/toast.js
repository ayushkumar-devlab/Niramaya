/**
 * Niramaya Toast Notification Component
 *
 * Usage:
 *   import { showToast } from './components/toast.js'
 *   showToast('Medication logged!', 'success')
 *   showToast('Something went wrong', 'error', 5000)
 */

const ICONS = {
  info:    '&#x2139;&#xFE0F;',   // ℹ️
  success: '&#x2705;',           // ✅
  error:   '&#x274C;',           // ❌
  warning: '&#x26A0;&#xFE0F;',   // ⚠️
}

const TITLES = {
  info:    'Info',
  success: 'Success',
  error:   'Error',
  warning: 'Warning',
}

/** Lazily creates (or retrieves) the shared container element */
function getContainer() {
  let container = document.getElementById('toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    container.setAttribute('role', 'region')
    container.setAttribute('aria-label', t('a11y.notifications'))
    container.setAttribute('aria-live', 'polite')
    container.setAttribute('aria-atomic', 'false')
    document.body.appendChild(container)
  }
  return container
}

/**
 * Display a toast notification.
 *
 * @param {string} message  — The body text to display.
 * @param {'info'|'success'|'error'|'warning'} [type='info']
 * @param {number} [duration=3000]  — Auto-dismiss delay in ms. 0 = no auto-dismiss.
 * @returns {HTMLElement}  The toast element (so callers can dismiss programmatically).
 */
export function showToast(message, type = 'info', duration = 3000) {
  const container = getContainer()

  /* ── Build element ── */
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status')
  toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite')

  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${ICONS[type] ?? ICONS.info}</span>
    <div class="toast-body">
      <div class="toast-title">${TITLES[type] ?? 'Notice'}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close" aria-label="${t('a11y.dismissNotification')}" type="button">&#x2715;</button>
  `

  container.appendChild(toast)

  /* ── Dismiss logic ── */
  let dismissed = false

  function dismiss() {
    if (dismissed) return
    dismissed = true
    toast.classList.add('toast-exit')
    toast.addEventListener('animationend', () => toast.remove(), { once: true })
    // Fallback: forcibly remove after animation duration + buffer
    setTimeout(() => toast.remove(), 400)
  }

  toast.querySelector('.toast-close').addEventListener('click', dismiss)

  if (duration > 0) {
    setTimeout(dismiss, duration)
  }

  return toast
}

/** Sanitise user-supplied strings before injecting into innerHTML */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
import { t } from '../i18n/index.js'

