/**
 * caregiverNotes.js — CareCircle Notes Management Module
 * Allows family & caregivers to record, edit, and delete timestamped observations.
 */

import { getStore, updateStore, KEYS } from './store.js'

function _genId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Returns all caregiver notes sorted by createdAt descending.
 * @returns {Array<object>}
 */
export function getAllNotes() {
  const notes = getStore(KEYS.CAREGIVER_NOTES) ?? []
  if (!Array.isArray(notes)) return []
  return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/**
 * Adds a new caregiver note.
 * @param {object} data
 * @param {string} data.content
 * @param {string} [data.medicationId]
 * @param {string} [data.author='Caregiver']
 * @returns {{ success: boolean, note?: object, error?: string }}
 */
export function addNote(data) {
  if (!data || typeof data.content !== 'string' || !data.content.trim()) {
    return { success: false, error: 'Note content cannot be empty' }
  }

  const now = new Date().toISOString()
  const note = {
    id: _genId(),
    content: data.content.trim(),
    medicationId: data.medicationId || null,
    author: data.author || 'Caregiver',
    createdAt: now,
    updatedAt: now,
  }

  updateStore(KEYS.CAREGIVER_NOTES, (current) => {
    const list = Array.isArray(current) ? current : []
    return [note, ...list]
  })

  return { success: true, note }
}

/**
 * Updates an existing caregiver note.
 * @param {string} id
 * @param {string} content
 * @returns {{ success: boolean, error?: string }}
 */
export function updateNote(id, content) {
  if (!content || !content.trim()) {
    return { success: false, error: 'Note content cannot be empty' }
  }

  let found = false
  updateStore(KEYS.CAREGIVER_NOTES, (current) => {
    const list = Array.isArray(current) ? current : []
    return list.map((n) => {
      if (n.id === id) {
        found = true
        return {
          ...n,
          content: content.trim(),
          updatedAt: new Date().toISOString(),
        }
      }
      return n
    })
  })

  return found ? { success: true } : { success: false, error: 'Note not found' }
}

/**
 * Deletes a caregiver note by id.
 * @param {string} id
 * @returns {boolean}
 */
export function deleteNote(id) {
  let found = false
  updateStore(KEYS.CAREGIVER_NOTES, (current) => {
    const list = Array.isArray(current) ? current : []
    return list.filter((n) => {
      if (n.id === id) {
        found = true
        return false
      }
      return true
    })
  })
  return found
}
