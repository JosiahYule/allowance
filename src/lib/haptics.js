// A tiny tactile tap where the platform supports it (Android/Chrome). Silently
// no-ops elsewhere (iOS Safari ignores vibrate), so it's safe to call anywhere.
export function haptic(ms = 8) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* ignore */
  }
}
