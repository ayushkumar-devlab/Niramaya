import { getStore, KEYS, setStore } from './store.js'

export function hasSeenWelcome() {
  return getStore(KEYS.WELCOME_SEEN) === true
}

export function markWelcomeSeen() {
  return setStore(KEYS.WELCOME_SEEN, true)
}

export function shouldShowWelcome() {
  return !hasSeenWelcome()
}
