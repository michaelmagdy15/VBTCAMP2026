import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const hapticPatterns = {
  selection: 10,
  light: 20,
  medium: 40,
  heavy: 70,
  success: [25, 45, 35],
  warning: [35, 50, 35],
  error: [50, 50, 50, 50],
  sos: [100, 100, 100, 100, 100, 100]
};

/**
 * Triggers native device vibration using Capacitor Haptics (works natively on iOS/Android)
 * with graceful fallback to Web Vibration API on mobile browsers.
 */
export const triggerHaptic = async (style = 'medium') => {
  try {
    if (style === 'selection' && typeof Haptics.selectionChanged === 'function') {
      await Haptics.selectionChanged();
      return;
    }
    if (style === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (style === 'error') {
      await Haptics.notification({ type: NotificationType.Error });
    } else if (style === 'warning') {
      await Haptics.notification({ type: NotificationType.Warning });
    } else if (style === 'light' || style === 'selection') {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (style === 'heavy') {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } else {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
  } catch (e) {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(hapticPatterns[style] || 15);
      }
    } catch {
      // Ignore on unsupported devices
    }
  }
};

/**
 * Detects if the app is running as an installed fullscreen standalone app (PWA or Capacitor)
 */
export const isStandaloneApp = () => {
  if (typeof window === 'undefined') return false;
  try {
    const isDisplayStandalone =
      typeof window.matchMedia === 'function' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches);
    const isIOSStandalone = window.navigator?.standalone === true;
    const isCapacitorNative = Boolean(window.Capacitor?.isNativePlatform?.());
    return Boolean(isDisplayStandalone || isIOSStandalone || isCapacitorNative);
  } catch {
    return false;
  }
};

/**
 * Detects iOS / iPadOS devices for "Share -> Add to Home Screen" native install instructions
 */
export const isIOSDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

