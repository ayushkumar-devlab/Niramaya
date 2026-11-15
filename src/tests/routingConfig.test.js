import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))
const manifest = JSON.parse(readFileSync(new URL('../../public/manifest.json', import.meta.url), 'utf8'))
const serviceWorker = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8')

describe('routing deployment configuration', () => {
  it('rewrites app paths but excludes real files and assets', () => {
    const source = vercel.rewrites[0].source
    const matcher = new RegExp(`^${source}$`)
    expect(matcher.test('/caregiver')).toBe(true)
    expect(matcher.test('/')).toBe(true)
    expect(matcher.test('/sw.js')).toBe(false)
    expect(matcher.test('/manifest.json')).toBe(false)
    expect(matcher.test('/favicon.svg')).toBe(false)
    expect(matcher.test('/icons/icon-192.svg')).toBe(false)
    expect(matcher.test('/assets/main.js')).toBe(false)
    expect(vercel.headers[0].source).toBe('/sw.js')
  })

  it('uses the root PWA scope and service-worker navigation shell', () => {
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(serviceWorker).toContain("event.request.mode === 'navigate'")
    expect(serviceWorker).toContain("caches.match('/')")
    expect(serviceWorker).toContain("const CACHE_NAME = 'niramaya-v12'")
  })
})
