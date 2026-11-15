/**
 * Niramaya Modal Dialog Component
 *
 * Usage:
 *   import { showModal } from './components/modal.js'
 *
 *   // Simple confirmation
 *   const confirmed = await showModal({
 *     title: 'Mark as Taken?',
 *     content: 'This will log the dose as taken at 08:00 AM.',
 *     confirmText: 'Yes, Mark Taken',
 *     cancelText: 'Cancel',
 *   })
 *   if (confirmed) { ... }
 *
 *   // Dangerous action
 *   const ok = await showModal({
 *     title: 'Delete Medication',
 *     content: 'This cannot be undone.',
 *     confirmText: 'Delete',
 *     dangerous: true,
 *   })
 *
 *   // Persistent (no backdrop-click dismiss)
 *   await showModal({ title: 'Important', content: '...', persistent: true })
 */

/** All focusable element selectors for focus-trap */
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Show a modal dialog.
 *
 * @param {object}   options
 * @param {string}   options.title          — Modal heading.
 * @param {string|HTMLElement} options.content — Body: HTML string or DOM node.
 * @param {string}   [options.confirmText='Confirm'] — Primary action label.
 * @param {string}   [options.cancelText='Cancel']   — Secondary action label. Set to null to hide.
 * @param {Function} [options.onConfirm]    — Called when confirmed (before promise resolves).
 * @param {Function} [options.onCancel]     — Called when cancelled (before promise resolves).
 * @param {boolean}  [options.dangerous=false] — Renders confirm button as danger variant.
 * @param {boolean}  [options.persistent=false] — If true, backdrop click does NOT close the modal.
 *
 * @returns {Promise<boolean>} Resolves `true` on confirm, `false` on cancel/dismiss.
 */
export function showModal({
  title,
  content,
  confirmText = 'Confirm',
  cancelText  = 'Cancel',
  onConfirm,
  onCancel,
  dangerous   = false,
  persistent  = false,
} = {}) {
  return new Promise((resolve) => {
    /* ── Preserve pre-existing scroll position & lock body ── */
    const scrollY = window.scrollY
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    const previouslyFocused = document.activeElement

    /* ── Build backdrop ── */
    const backdrop = document.createElement('div')
    backdrop.className = 'modal-backdrop'
    backdrop.setAttribute('role', 'dialog')
    backdrop.setAttribute('aria-modal', 'true')
    backdrop.setAttribute('aria-labelledby', 'modal-title')
    backdrop.setAttribute('aria-describedby', 'modal-body-desc')

    /* ── Build modal ── */
    const modal = document.createElement('div')
    modal.className = `modal${dangerous ? ' modal-dangerous' : ''}`

    /* Header */
    const header = document.createElement('div')
    header.className = 'modal-header'
    header.innerHTML = `
      <h2 class="modal-title" id="modal-title">${escapeHtml(title ?? '')}</h2>
      <button class="modal-close-btn" aria-label="${t('a11y.closeDialog')}" type="button">&#x2715;</button>
    `

    /* Body */
    const body = document.createElement('div')
    body.className = 'modal-body'
    body.id = 'modal-body-desc'
    if (content instanceof HTMLElement) {
      body.appendChild(content)
    } else {
      body.innerHTML = typeof content === 'string' ? content : ''
    }

    /* Footer */
    const footer = document.createElement('div')
    footer.className = 'modal-footer'

    if (cancelText !== null) {
      const cancelBtn = document.createElement('button')
      cancelBtn.type = 'button'
      cancelBtn.className = 'btn btn-ghost'
      cancelBtn.textContent = cancelText
      cancelBtn.addEventListener('click', () => closeModal(false))
      footer.appendChild(cancelBtn)
    }

    const confirmBtn = document.createElement('button')
    confirmBtn.type = 'button'
    confirmBtn.className = `btn ${dangerous ? 'btn-danger' : 'btn-primary'}`
    confirmBtn.textContent = confirmText
    confirmBtn.addEventListener('click', () => closeModal(true))
    footer.appendChild(confirmBtn)

    modal.appendChild(header)
    modal.appendChild(body)
    modal.appendChild(footer)
    backdrop.appendChild(modal)
    document.body.appendChild(backdrop)

    /* ── Focus first focusable element ── */
    requestAnimationFrame(() => {
      const firstFocusable = modal.querySelector(FOCUSABLE_SELECTORS)
      if (firstFocusable) firstFocusable.focus()
      else confirmBtn.focus()
    })

    /* ── Close logic ── */
    let isClosing = false
    let isFinished = false

    function closeModal(confirmed) {
      if (isClosing) return
      isClosing = true

      /* Animate out */
      backdrop.classList.add('modal-exit')

      /* Restore scroll */
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)

      /* Restore focus */
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }

      function finish() {
        if (isFinished) return
        isFinished = true
        backdrop.remove()
        if (confirmed) {
          onConfirm?.()
        } else {
          onCancel?.()
        }
        resolve(confirmed)
      }

      /* Wait for exit animation, then clean up */
      backdrop.addEventListener('animationend', finish, { once: true })
      // Fallback if animation doesn't fire (e.g. prefers-reduced-motion)
      setTimeout(finish, 300)
    }

    /* ── Close button in header ── */
    header.querySelector('.modal-close-btn').addEventListener('click', () => closeModal(false))

    /* ── Backdrop click ── */
    backdrop.addEventListener('click', (e) => {
      if (!persistent && e.target === backdrop) {
        closeModal(false)
      }
    })

    /* ── Escape key ── */
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeModal(false)
        document.removeEventListener('keydown', handleKeyDown)
        return
      }

      /* Focus trap — keep Tab inside the modal */
      if (e.key === 'Tab') {
        const focusable = Array.from(modal.querySelectorAll(FOCUSABLE_SELECTORS))
        if (focusable.length === 0) { e.preventDefault(); return }

        const first = focusable[0]
        const last  = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    /* Clean up key listener when modal resolves */
    backdrop.addEventListener('animationend', () => {
      document.removeEventListener('keydown', handleKeyDown)
    }, { once: true })
  })
}

/** Sanitise strings for injection into innerHTML */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
import { t } from '../i18n/index.js'

