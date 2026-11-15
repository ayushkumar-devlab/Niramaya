import { describe, it, expect, beforeEach } from 'vitest'
import { Router } from '../modules/router.js'

describe('router.js (Hash Router)', () => {
  let router

  beforeEach(() => {
    router = new Router()
    globalThis.window = {
      location: { hash: '#/senior' },
      addEventListener: () => {}
    }
    globalThis.history = {
      back: () => {}
    }
    globalThis.document = {
      querySelector: () => null
    }
  })

  it('registers and resolves basic routes', () => {
    let called = false
    router.register('/senior', () => { called = true })
    
    const resolved = router._resolve('#/senior')
    expect(resolved).not.toBeNull()
    expect(resolved.path).toBe('/senior')
    
    router._render(resolved.path, resolved.params)
    expect(called).toBe(true)
    expect(router.getCurrentRoute().path).toBe('/senior')
  })

  it('extracts route parameters correctly', () => {
    let capturedParams = null
    router.register('/medication/:id', (params) => { capturedParams = params })

    const resolved = router._resolve('#/medication/med-123')
    expect(resolved).not.toBeNull()
    expect(resolved.params.id).toBe('med-123')

    router._render(resolved.path, resolved.params)
    expect(capturedParams).toEqual({ id: 'med-123' })
  })

  it('respects beforeEach navigation guard cancellation', () => {
    let reached = false
    router.register('/caregiver', () => { reached = true })
    router.beforeEach = (to, from) => {
      if (to.path === '/caregiver') return false
    }

    const resolved = router._resolve('#/caregiver')
    const allowed = router.beforeEach(resolved, router.getCurrentRoute())
    expect(allowed).toBe(false)
    expect(reached).toBe(false)
  })
})
