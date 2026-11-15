export function registerConnectivityListeners(target, onChange) {
  const initial = Boolean(target?.navigator?.onLine)
  const handleOnline = () => onChange(true)
  const handleOffline = () => onChange(false)

  target?.addEventListener('online', handleOnline)
  target?.addEventListener('offline', handleOffline)

  return {
    initial,
    destroy() {
      target?.removeEventListener('online', handleOnline)
      target?.removeEventListener('offline', handleOffline)
    },
  }
}
