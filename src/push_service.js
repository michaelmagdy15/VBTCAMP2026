import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { FCM } from '@capacitor-community/fcm';
import { registerDevicePushToken } from './firebase';

/**
 * Initializes and registers push notifications based on platform (Native iOS or Web PWA).
 * @param {object} currentUser - Logged in user object.
 * @param {string} vapidKey - Firebase Web Push VAPID key.
 */
export async function setupPushNotifications(currentUser, vapidKey) {
  if (!currentUser) return;

  const isNative = Capacitor.isNativePlatform();
  console.log(`[Push Service] Initializing on ${isNative ? 'Native App' : 'Browser/PWA'} platform...`);

  if (isNative) {
    // ----------------------------------------------------
    // Option B: Native iOS Push (APNs via Capacitor)
    // ----------------------------------------------------
    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive === 'granted') {
        // Trigger registration with Apple APNs
        await PushNotifications.register();
      } else {
        console.warn("[Push Service] Native push notification permissions denied.");
      }

      // Successful registration listener (receives APNs device token)
      // Note: we remove any previous listeners first to avoid double registration
      await PushNotifications.removeAllListeners();

      await PushNotifications.addListener('registration', async (token) => {
        console.log('[Push Service] Native APNs push token received:', token.value);
        try {
          // Convert native APNs token to Firebase FCM token
          const fcmResponse = await FCM.getToken();
          const fcmToken = fcmResponse.token;
          console.log('[Push Service] Native FCM token resolved:', fcmToken);
          // Register token with 'native' platform tag in Firestore
          await registerDevicePushToken(currentUser.name, currentUser.role, fcmToken, 'native');
        } catch (fcmError) {
          console.error('[Push Service] Error resolving FCM token from APNs:', fcmError);
          // Fallback to registering APNs token directly if FCM fails
          await registerDevicePushToken(currentUser.name, currentUser.role, token.value, 'native');
        }
      });

      await PushNotifications.addListener('registrationError', (error) => {
        console.error('[Push Service] Native push registration error:', error);
      });

      // Handle message when app is in foreground
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[Push Service] Foreground push notification received:', notification);
        // Dispatch local event so UI/Audio can play bells & show active ping alerts
        const pushEvent = new CustomEvent('vbt-push-notification', {
          detail: {
            title: notification.title,
            body: notification.body,
            data: notification.data
          }
        });
        window.dispatchEvent(pushEvent);
      });

      // Handle user clicking the notification
      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[Push Service] Action clicked on native notification:', action);
      });

    } catch (err) {
      console.error("[Push Service] Error configuring native push notifications:", err);
    }
  } else {
    // ----------------------------------------------------
    // Option A: Browser PWA Web Push (FCM Web)
    // ----------------------------------------------------
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.warn("[Push Service] Browser does not support Web Push / Service Workers.");
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        await registerDevicePushToken(currentUser.name, currentUser.role, vapidKey, 'web');
      } catch (err) {
        console.error("[Push Service] Error registering PWA Web Push token:", err);
      }
    }
  }
}
