import { describe, it, expect, beforeEach } from 'vitest'
import {
  initStore,
  getStore,
  setStore,
  updateStore,
  clearStore,
  exportData,
  importData,
  KEYS
} from '../modules/store.js'

describe('store.js (LocalStorage wrapper)', () => {
  beforeEach(() => {
    // Setup mock localStorage in node environment
    let storage = {}
    globalThis.localStorage = {
      getItem: (key) => (key in storage ? storage[key] : null),
      setItem: (key, value) => { storage[key] = String(value) },
      removeItem: (key) => { delete storage[key] },
      clear: () => { storage = {} },
      key: (i) => Object.keys(storage)[i] || null,
      get length() { return Object.keys(storage).length }
    }
  })

  it('initializes default values properly', () => {
    initStore()
    expect(getStore(KEYS.SCHEMA_VERSION)).toBe(1)
    expect(getStore(KEYS.MEDICATIONS)).toEqual([])
    expect(getStore(KEYS.SETTINGS)).toEqual({
      language: 'en',
      seniorMode: false,
      fontSize: 'normal',
      guideDismissed: false,
    })
    expect(getStore(KEYS.PROFILE)).toEqual({
      name: '',
      seniorMode: false,
      language: 'en',
      pin: null,
    })
  })

  it('can set and get store items', () => {
    initStore()
    const testData = [{ id: '1', name: 'Metformin', dose: '500mg' }]
    const result = setStore(KEYS.MEDICATIONS, testData)
    expect(result).toBe(true)

    const retrieved = getStore(KEYS.MEDICATIONS)
    expect(retrieved).toEqual(testData)
  })

  it('supports atomic updateStore', () => {
    initStore()
    setStore(KEYS.MEDICATIONS, [{ id: '1', name: 'Aspirin' }])
    
    updateStore(KEYS.MEDICATIONS, (meds) => [
      ...meds,
      { id: '2', name: 'Atorvastatin' }
    ])

    const updated = getStore(KEYS.MEDICATIONS)
    expect(updated.length).toBe(2)
    expect(updated[1].name).toBe('Atorvastatin')
  })

  it('exports and imports backup data correctly', () => {
    initStore()
    setStore(KEYS.MEDICATIONS, [{ id: '1', name: 'Lisinopril' }])
    
    const exported = exportData()
    expect(typeof exported).toBe('string')
    const parsed = JSON.parse(exported)
    expect(parsed._schemaVersion).toBe(1)
    expect(parsed[KEYS.MEDICATIONS]).toEqual([{ id: '1', name: 'Lisinopril' }])

    // Clear store and import
    clearStore()
    expect(getStore(KEYS.MEDICATIONS)).toBeNull()

    const importRes = importData(exported)
    expect(importRes.success).toBe(true)
    expect(getStore(KEYS.MEDICATIONS)).toEqual([{ id: '1', name: 'Lisinopril' }])
  })

  it('clears only nm_ prefixed items', () => {
    globalThis.localStorage.setItem('other_app_key', 'keep_me')
    initStore()
    expect(globalThis.localStorage.getItem('other_app_key')).toBe('keep_me')

    clearStore()
    expect(globalThis.localStorage.getItem('other_app_key')).toBe('keep_me')
    expect(getStore(KEYS.SETTINGS)).toBeNull()
  })
})
