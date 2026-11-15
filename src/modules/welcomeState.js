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

export function createWelcomeStepper(totalSteps = 6) {
  let step = 1
  return {
    get current() { return step },
    get total() { return totalSteps },
    next() { step = Math.min(totalSteps, step + 1); return step },
    back() { step = Math.max(1, step - 1); return step },
    goTo(nextStep) {
      step = Math.min(totalSteps, Math.max(1, Number(nextStep) || 1))
      return step
    },
  }
}
