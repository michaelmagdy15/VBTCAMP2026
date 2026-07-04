import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Triggers native device vibration using Capacitor Haptics (works natively on iOS/Android).
 */
export const triggerHaptic = async (style = 'medium') => {
  try {
    if (style === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (style === 'error') {
      await Haptics.notification({ type: NotificationType.Error });
    } else if (style === 'warning') {
      await Haptics.notification({ type: NotificationType.Warning });
    } else if (style === 'light') {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (style === 'heavy') {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } else {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
  } catch (e) {
    // Ignore on unsupported devices (e.g. standard desktop browser)
  }
};

export const hapticPatterns = {
  light: 30,
  medium: 50,
  heavy: 80,
  success: [30, 50, 40],
  error: [50, 50, 50, 50],
  sos: [100, 100, 100, 100, 100, 100]
};
