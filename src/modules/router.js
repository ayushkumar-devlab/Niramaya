// Lightweight History API router with legacy hash redirects.

export const ROUTES = Object.freeze({
  '/': Object.freeze({ id: 'senior', titleKey: 'nav.senior' }),
  '/missed-dose': Object.freeze({ id: 'dose-decision', titleKey: 'nav.doseDecision' }),
  '/caregiver': Object.freeze({ id: 'caregiver', titleKey: 'nav.caregiver' }),
  '/emergency': Object.freeze({ id: 'emergency', titleKey: 'nav.emergency' }),
  '/safety': Object.freeze({ id: 'safety', titleKey: 'nav.safety' }),
  '/how-to-use': Object.freeze({ id: 'how-to-use', titleKey: 'nav.howToUse' }),
  '/settings': Object.freeze({ id: 'settings', titleKey: 'nav.settings' }),
})

export const LEGACY_HASH_ROUTES = Object.freeze({
  '#/': '/',
  '#/senior': '/',
  '#/missed': '/missed-dose',
  '#/missed-dose': '/missed-dose',
  '#/dose-decision': '/missed-dose',
  '#/caregiver': '/caregiver',
  '#/emergency': '/emergency',
  '#/safety': '/safety',
  '#/how-to-use': '/how-to-use',
  '#/settings': '/settings',
})

const ASSET_PATH = /\/(?:assets|icons)(?:\/|$)|\/[^/]*\.[^/]+$/

export function isAssetPath(pathname) {
  return ASSET_PATH.test(pathname)
}

export function normalizePath(input = '/') {
  const raw = String(input || '/')
  const base = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost'
  const url = new URL(raw, base)
  let pathname = url.pathname || '/'
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, '')
  return `${pathname}${url.search}`
}

function splitLocation(input) {
  const normalized = normalizePath(input)
  const queryIndex = normalized.indexOf('?')
  return {
    pathname: queryIndex === -1 ? normalized : normalized.slice(0, queryIndex),
    search: queryIndex === -1 ? '' : normalized.slice(queryIndex),
  }
}

function legacyTarget(hash) {
  if (!hash || !hash.startsWith('#/')) return null
  const hashLocation = splitLocation(hash.slice(1))
  const route = LEGACY_HASH_ROUTES[`#${hashLocation.pathname}`]
  return route ? `${route}${hashLocation.search}` : null
}

export class Router {
  constructor() {
    /** @type {Record<string, Function>} */
    this.routes = {}
    /** @type {{ path: string, params: Record<string, string>, search: string }|null} */
    this.currentRoute = null
    /** @type {((to: object, from: object|null) => boolean|void)|null} */
    this.beforeEach = null
    this.notFoundHandler = null
    this.onRouteChange = null
    this.initialized = false
    this._handlePopState = () => this._renderLocation(false)
    this._handleClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = event.target.closest?.('a[href]')
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return
      const url = new URL(link.href, window.location.origin)
      if (url.origin !== window.location.origin || isAssetPath(url.pathname)) return
      event.preventDefault()
      this.navigate(`${url.pathname}${url.search}`)
    }
  }

  register(path, handler) {
    this.routes[normalizePath(path).split('?')[0]] = handler
  }

  setNotFoundHandler(handler) {
    this.notFoundHandler = handler
  }

  setRouteChangeHandler(handler) {
    this.onRouteChange = handler
  }

  navigate(path, { replace = false } = {}) {
    const target = normalizePath(path)
    if (replace) history.replaceState({}, '', target)
    else history.pushState({}, '', target)
    this._renderLocation(false)
  }

  back() {
    history.back()
  }

  getCurrentRoute() {
    return this.currentRoute
  }

  rerender() {
    if (this.currentRoute) this._render(this.currentRoute.path, this.currentRoute.params, this.currentRoute.search, true, false)
  }

  init() {
    if (this.initialized) return
    this.initialized = true
    window.addEventListener('popstate', this._handlePopState)
    document.addEventListener('click', this._handleClick)

    const legacy = legacyTarget(window.location.hash)
    if (legacy) {
      history.replaceState({}, '', legacy)
    } else if (window.location.hash) {
      history.replaceState({}, '', `${normalizePath(window.location.pathname)}${window.location.search}`)
    }

    this._renderLocation(true)
  }

  _renderLocation(initial) {
    const { pathname, search } = splitLocation(`${window.location.pathname}${window.location.search}`)
    this._render(pathname, {}, search, initial, false)
  }

  _resolve(input) {
    const { pathname, search } = splitLocation(input)
    if (isAssetPath(pathname)) return null

    for (const [routePath, handler] of Object.entries(this.routes)) {
      const routeParts = routePath.split('/').filter(Boolean)
      const urlParts = pathname.split('/').filter(Boolean)
      if (routeParts.length !== urlParts.length) continue

      const params = {}
      let matched = true
      for (let i = 0; i < routeParts.length; i += 1) {
        if (routeParts[i].startsWith(':')) params[routeParts[i].slice(1)] = decodeURIComponent(urlParts[i])
        else if (routeParts[i] !== urlParts[i]) matched = false
      }
      if (matched) return { path: routePath, params, search, handler }
    }

    return { path: pathname, params: {}, search, handler: null, notFound: true }
  }

  _render(path, params, search = '', initial = false, fromRerender = false) {
    const resolved = this._resolve(`${path}${search}`)
    if (!resolved) return
    const to = { path: resolved.path, params, search }
    const from = this.currentRoute
    if (!fromRerender && typeof this.beforeEach === 'function' && this.beforeEach(to, from) === false) return

    if (!initial && !fromRerender) {
      document.dispatchEvent(new CustomEvent('app:navigate', { detail: to }))
    }
    this.currentRoute = to
    if (resolved.handler) resolved.handler(params)
    else if (this.notFoundHandler) this.notFoundHandler(document.getElementById('app-main'), to)

    if (!fromRerender) this.onRouteChange?.(to, { initial, notFound: Boolean(resolved.notFound), from })
    if (!initial && !fromRerender) {
      Promise.resolve().then(() => {
        const heading = document.querySelector('#app-main h1')
        if (heading) {
          if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1')
          heading.focus()
        }
      })
    }
  }
}

export const router = new Router()
