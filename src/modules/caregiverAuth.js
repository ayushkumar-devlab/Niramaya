/**
 * caregiverAuth.js — Simple Optional PIN Privacy Barrier
 *
 * PRIVACY TRANSPARENCY NOTICE:
 * This module implements a basic convenience privacy barrier stored in browser LocalStorage.
 * It is NOT high-security cryptographic authentication. Local browser storage can be cleared
 * or inspected by device administrators. We use salted hashing to avoid storing plaintext PINs,
 * but users are informed of these privacy boundaries.
 */

import { getStore, updateStore, KEYS } from './store.js'

/**
 * Simple hash function for PIN strings (FNV-1a 32-bit with salt)
 * @param {string} pin
 * @returns {string}
 */
export function hashPin(pin) {
  const salt = 'niramaya_caregiver_salt_2026'
  const str = salt + pin.trim()
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return ('0000000' + (hash >>> 0).toString(16)).substr(-8)
}

/**
 * Checks if Caregiver PIN protection is currently active.
 * @returns {boolean}
 */
export function isPinProtected() {
  const config = getStore(KEYS.CAREGIVER) ?? {}
  return Boolean(config.enabled && config.hashedPin)
}

/**
 * Verifies a 4-digit PIN against the stored hash.
 * @param {string} pin
 * @returns {boolean}
 */
export function verifyPin(pin) {
  if (!isPinProtected()) return true
  const config = getStore(KEYS.CAREGIVER) ?? {}
  return config.hashedPin === hashPin(pin)
}

/**
 * Sets or updates the 4-digit caregiver PIN.
 * @param {string} pin
 * @returns {{ success: boolean, error?: string }}
 */
export function setCaregiverPin(pin) {
  const cleaned = String(pin).trim()
  if (!/^\d{4}$/.test(cleaned)) {
    return { success: false, error: 'PIN must be exactly 4 digits' }
  }

  const hashedPin = hashPin(cleaned)
  updateStore(KEYS.CAREGIVER, (current) => ({
    ...(current || {}),
    enabled: true,
    hashedPin,
    updatedAt: new Date().toISOString(),
  }))

  return { success: true }
}

/**
 * Disables PIN protection.
 */
export function disablePinProtection() {
  updateStore(KEYS.CAREGIVER, (current) => ({
    ...(current || {}),
    enabled: false,
    hashedPin: null,
  }))
}
