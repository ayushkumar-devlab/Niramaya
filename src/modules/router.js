// router.js — Lightweight hash-based SPA router

export class Router {
  constructor() {
    /** @type {Record<string, Function>} */
    this.routes = {}
    /** @type {{ path: string, params: Record<string, string> }|null} */
    this.currentRoute = null
    /** @type {((to: object, from: object|null) => boolean|void)|null} */
    this.beforeEach = null
  }

  /**
   * Register a route handler.
   * @param {string} path - e.g. '/senior' or '/medication/:id'
   * @param {(params: Record<string, string>) => void} handler
   */
  register(path, handler) {
    this.routes[path] = handler
  }

  /**
   * Programmatically navigate to a path.
   * @param {string} path - e.g. '/senior' or '/medication/123'
   * @param {Record<string, string>} [params={}]
   */
  navigate(path, params = {}) {
    // Build query string from params not embedded in the path itself
    window.location.hash = `#${path}`
  }

  /** Go back in browser history. */
  back() {
    history.back()
  }

  /** @returns {{ path: string, params: Record<string, string> }|null} */
  getCurrentRoute() {
    return this.currentRoute
  }

  /**
   * Initialise the router: attach hashchange listener and handle the
   * current hash (or default to #/senior).
   */
  init() {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash || '#/senior'
      const result = this._resolve(hash)
      if (result) {
        this._render(result.path, result.params)
      }
    })

    // Handle the initial hash on page load
    const initialHash = window.location.hash || '#/senior'
    if (!window.location.hash) {
      window.location.hash = '#/senior'
    } else {
      const result = this._resolve(initialHash)
      if (result) {
        this._render(result.path, result.params)
      }
    }
  }

  /**
   * Match a hash string to a registered route and extract path params.
   * @param {string} hash - e.g. '#/medication/abc123'
   * @returns {{ path: string, params: Record<string, string> }|null}
   */
  _resolve(hash) {
    // Strip leading '#' to get the path portion e.g. '/medication/abc123'
    const rawPath = hash.startsWith('#') ? hash.slice(1) : hash
    const urlParts = rawPath.split('/').filter(Boolean)

    for (const [routePath, _handler] of Object.entries(this.routes)) {
      const routeParts = routePath.split('/').filter(Boolean)

      if (routeParts.length !== urlParts.length) continue

      const params = {}
      let matched = true

      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          // Dynamic segment — capture as param
          params[routeParts[i].slice(1)] = decodeURIComponent(urlParts[i])
        } else if (routeParts[i] !== urlParts[i]) {
          matched = false
          break
        }
      }

      if (matched) {
        return { path: routePath, params }
      }
    }

    // No match — fall back to default route if registered
    if (this.routes['/senior']) {
      return { path: '/senior', params: {} }
    }

    return null
  }

  /**
   * Call the route handler, update currentRoute, and focus the first h1.
   * @param {string} path
   * @param {Record<string, string>} params
   */
  _render(path, params) {
    const handler = this.routes[path]
    if (!handler) return

    const to = { path, params }
    const from = this.currentRoute

    // Run navigation guard if set
    if (typeof this.beforeEach === 'function') {
      const result = this.beforeEach(to, from)
      if (result === false) return // navigation cancelled
    }

    this.currentRoute = to
    handler(params)

    // Accessibility: move focus to the main heading after render
    // Use a microtask so the handler has time to inject DOM
    Promise.resolve().then(() => {
      const h1 = document.querySelector('#app-main h1')
      if (h1) {
        if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1')
        h1.focus()
      }
    })
  }
}

/** Singleton router instance */
export const router = new Router()
