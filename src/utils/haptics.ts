export function triggerLightFeedback(pattern: number | number[] = 10): void {
  try {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silently ignore browsers or contexts that restrict vibration
  }
}
