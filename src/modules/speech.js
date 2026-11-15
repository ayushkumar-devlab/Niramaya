/**
 * speech.js — Web Speech API SpeechSynthesis wrapper
 * Prioritizes SpeechSynthesis, handles language voice mapping,
 * pause, resume, and graceful fallbacks.
 */

class SpeechService {
  constructor() {
    this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
    this.currentUtterance = null
    this.voices = []
    this.isPaused = false

    if (this.synth) {
      this._loadVoices()
      if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
        window.speechSynthesis.onvoiceschanged = () => this._loadVoices()
      }
    }
  }

  _loadVoices() {
    if (!this.synth) return
    try {
      this.voices = this.synth.getVoices() || []
    } catch (_) {
      this.voices = []
    }
  }

  /**
   * Check if speech synthesis is supported.
   * @returns {boolean}
   */
  isAvailable() {
    return Boolean(this.synth)
  }

  hasVoice(lang = 'en') {
    return Boolean(this._findVoice(lang))
  }

  /**
   * Finds the best voice for the given language code ('en', 'hi', 'kn').
   * @param {string} lang
   * @returns {SpeechSynthesisVoice|null}
   */
  _findVoice(lang) {
    if (!this.voices || this.voices.length === 0) {
      this._loadVoices()
    }

    const langMap = {
      en: ['en-IN', 'en-GB', 'en-US', 'en'],
      hi: ['hi-IN', 'hi'],
      kn: ['kn-IN', 'kn'],
    }

    const preferredCodes = langMap[lang] || [lang]

    for (const code of preferredCodes) {
      const match = this.voices.find(
        (v) => v.lang.toLowerCase() === code.toLowerCase() || v.lang.toLowerCase().startsWith(code.toLowerCase())
      )
      if (match) return match
    }

    return null
  }

  /**
   * Speaks the provided text.
   * @param {string} text
   * @param {string} [lang='en']
   * @param {object} [callbacks]
   * @param {Function} [callbacks.onStart]
   * @param {Function} [callbacks.onEnd]
   * @param {Function} [callbacks.onError]
   * @returns {boolean} True if speech started, false if unavailable.
   */
  speak(text, lang = 'en', callbacks = {}) {
    if (!this.synth || !text) {
      if (callbacks.onError) callbacks.onError(new Error('Speech synthesis not available'))
      return false
    }

    // Cancel any ongoing speech
    this.stop()

    try {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'kn' ? 'kn-IN' : 'en-IN'
      utterance.rate = 0.9 // Slightly slower for elderly clarity
      utterance.pitch = 1.0

      const voice = this._findVoice(lang)
      if (voice) {
        utterance.voice = voice
      }

      utterance.onstart = () => {
        this.isPaused = false
        if (callbacks.onStart) callbacks.onStart()
      }

      utterance.onend = () => {
        this.currentUtterance = null
        this.isPaused = false
        if (callbacks.onEnd) callbacks.onEnd()
      }

      utterance.onerror = (e) => {
        this.currentUtterance = null
        this.isPaused = false
        if (callbacks.onError) callbacks.onError(e)
      }

      this.currentUtterance = utterance
      this.synth.speak(utterance)
      return true
    } catch (err) {
      if (callbacks.onError) callbacks.onError(err)
      return false
    }
  }

  /**
   * Stops and cancels speech.
   */
  stop() {
    if (!this.synth) return
    try {
      this.synth.cancel()
      this.currentUtterance = null
      this.isPaused = false
    } catch (_) {}
  }

  /**
   * Pauses current speech.
   */
  pause() {
    if (!this.synth) return
    try {
      this.synth.pause()
      this.isPaused = true
    } catch (_) {}
  }

  /**
   * Resumes paused speech.
   */
  resume() {
    if (!this.synth) return
    try {
      this.synth.resume()
      this.isPaused = false
    } catch (_) {}
  }

  /**
   * Checks if currently speaking.
   * @returns {boolean}
   */
  isSpeaking() {
    return Boolean(this.synth && this.synth.speaking)
  }
}

export const speechService = new SpeechService()
