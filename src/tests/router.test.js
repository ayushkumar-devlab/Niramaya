import { describe, it, expect, beforeEach } from 'vitest'
import { Router, ROUTES, isAssetPath, normalizePath } from '../modules/router.js'
import { getStore, initStore, KEYS, setStore } from '../modules/store.js'

describe('router.js (History API Router)', () => {
  let router
  let listeners
  let documentListeners

  beforeEach(() => {
    router = new Router()
    listeners = {}
    documentListeners = {}
    globalThis.window = {
      location: {
        origin: 'http://localhost',
        pathname: '/',
        search: '',
        hash: '',
      },
      addEventListener: (type, handler) => { listeners[type] = handler },
      scrollTo: () => {},
    }
    globalThis.history = {
      pushState: (_state, _title, url) => {
        const parsed = new URL(url, window.location.origin)
        window.location.pathname = parsed.pathname
        window.location.search = parsed.search
        window.location.hash = ''
      },
      replaceState: (_state, _title, url) => {
        const parsed = new URL(url, window.location.origin)
        window.location.pathname = parsed.pathname
        window.location.search = parsed.search
        window.location.hash = ''
      },
      back: () => {},
    }
    globalThis.document = {
      addEventListener: (type, handler) => { documentListeners[type] = handler },
      dispatchEvent: () => true,
      getElementById: () => null,
      querySelector: () => null,
    }
    const data = {}
    globalThis.localStorage = {
      getItem: (key) => data[key] ?? null,
      setItem: (key, value) => { data[key] = String(value) },
      removeItem: (key) => { delete data[key] },
      clear: () => Object.keys(data).forEach((key) => delete data[key]),
    }
  })

  it('uses the frozen route table and resolves clean paths', () => {
    expect(Object.isFrozen(ROUTES)).toBe(true)
    router.register('/', () => {})
    router.register('/caregiver', () => {})
    expect(router._resolve('/caregiver/').path).toBe('/caregiver')
    expect(router._resolve('/caregiver?from=test').search).toBe('?from=test')
    expect(router._resolve('/caregiver')).toMatchObject({ path: '/caregiver' })
  })

  it('navigates with pushState and renders without a reload', () => {
    let rendered = 0
    router.register('/caregiver', () => { rendered += 1 })
    router.navigate('/caregiver')
    expect(window.location.pathname).toBe('/caregiver')
    expect(rendered).toBe(1)
    expect(router.getCurrentRoute().path).toBe('/caregiver')
  })

  it('renders Back and Forward destinations from popstate', () => {
    const rendered = []
    router.register('/', () => rendered.push('/'))
    router.register('/caregiver', () => rendered.push('/caregiver'))
    router.init()
    router.navigate('/caregiver')
    window.location.pathname = '/'
    listeners.popstate?.()
    expect(rendered).toEqual(['/', '/caregiver', '/'])
  })

  it('redirects legacy hashes with replaceState and removes the hash', () => {
    window.location.hash = '#/caregiver'
    router.register('/', () => {})
    router.register('/caregiver', () => {})
    router.init()
    expect(window.location.pathname).toBe('/caregiver')
    expect(window.location.hash).toBe('')
  })

  it('renders unknown paths while excluding asset-like paths', () => {
    expect(router._resolve('/not-a-route')).toMatchObject({ path: '/not-a-route', notFound: true })
    expect(router._resolve('/sw.js')).toBeNull()
    expect(router._resolve('/assets/main.js')).toBeNull()
    expect(isAssetPath('/manifest.webmanifest')).toBe(true)
  })

  it('invokes the not-found handler for an unknown route', () => {
    let renderedPath = null
    const container = {}
    globalThis.document.getElementById = () => container
    router.setNotFoundHandler((_target, route) => { renderedPath = route.path })
    router.init()
    window.location.pathname = '/not-a-route'
    listeners.popstate?.()
    expect(renderedPath).toBe('/not-a-route')
  })

  it('normalizes trailing slashes and preserves query strings', () => {
    expect(normalizePath('/caregiver/?view=week')).toBe('/caregiver?view=week')
    expect(normalizePath('/')).toBe('/')
  })

  it('supports navigation guards and route-change callbacks', () => {
    let reached = false
    let changed = null
    router.register('/caregiver', () => { reached = true })
    router.beforeEach = () => false
    router.setRouteChangeHandler((route) => { changed = route })
    router.navigate('/caregiver')
    expect(reached).toBe(false)
    expect(changed).toBeNull()
  })

  it('does not change stored medication data during navigation or legacy redirects', () => {
    initStore()
    const medications = [{ id: 'm1', name: 'Demo Medicine', dosage: '10 mg' }]
    setStore(KEYS.MEDICATIONS, medications)
    router.register('/', () => {})
    router.register('/caregiver', () => {})
    router.navigate('/caregiver')
    expect(getStore(KEYS.MEDICATIONS)).toEqual(medications)

    window.location.hash = '#/senior'
    const reloadedRouter = new Router()
    reloadedRouter.register('/', () => {})
    reloadedRouter.init()
    expect(getStore(KEYS.MEDICATIONS)).toEqual(medications)
  })
})
