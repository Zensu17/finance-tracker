/**
 * Firebase Cloud Messaging (FCM) Notifications Utility
 * 
 * This module handles:
 * - Service Worker registration
 * - FCM token management
 * - Token persistence to Firestore
 * - Permission requests
 * - Notification testing
 */

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

// Browser support check
export const isNotificationSupported = async (): Promise<boolean> => {
  try {
    const supported = await isSupported();
    return supported && 'serviceWorker' in navigator && 'Notification' in window;
  } catch {
    return false;
  }
};

/**
 * Register the Service Worker for FCM
 * This must be done early in the app lifecycle
 */
export const registerServiceWorker = async (): Promise<boolean> => {
  try {
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Workers not supported in this browser');
      return false;
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });

    console.log('✓ Service Worker registered successfully:', registration);
    return true;
  } catch (error) {
    console.error('✗ Service Worker registration failed:', error);
    return false;
  }
};

/**
 * Request notification permission from user
 * Shows a dialog asking for permission to send notifications
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('✓ Notification permission granted');
      toast.success('✓ Notifications enabled');
      return true;
    } else if (permission === 'denied') {
      console.warn('⚠️ Notification permission denied by user');
      toast.error('⚠️ Notifications blocked. Check your browser settings to enable.');
      return false;
    } else {
      // Permission is 'default' (dismissed)
      console.warn('⚠️ Notification permission dismissed');
      return false;
    }
  } catch (error) {
    console.error('✗ Error requesting notification permission:', error);
    toast.error('✗ Could not request notification permission');
    return false;
  }
};

/**
 * Get FCM Token for this device/browser
 * This token uniquely identifies this device for sending notifications
 */
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const supported = await isNotificationSupported();
    if (!supported) {
      console.warn('⚠️ Notifications not supported');
      return null;
    }

    const messaging = getMessaging();

    // This will automatically request permission if needed
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_MESSAGING_VAPID_KEY as string,
    });

    if (token) {
      console.log('✓ FCM Token obtained:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.warn('⚠️ No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('✗ Error getting FCM token:', error);
    return null;
  }
};

/**
 * Save FCM Token to Firestore
 * Store token in users/{uid}/settings/notifications collection
 */
export const saveFCMTokenToFirestore = async (
  userId: string,
  fcmToken: string
): Promise<boolean> => {
  try {
    const tokenRef = doc(db, `users/${userId}/settings`, 'notifications');

    await setDoc(
      tokenRef,
      {
        fcmToken,
        lastUpdated: new Date().toISOString(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
        },
      },
      { merge: true }
    );

    console.log('✓ FCM Token saved to Firestore');
    return true;
  } catch (error) {
    console.error('✗ Error saving FCM token to Firestore:', error);
    return false;
  }
};

/**
 * Initialize Firebase Messaging and set up foreground notification handler
 * This handles notifications that arrive while the app is open
 */
export const initializeMessaging = async (_userId?: string): Promise<boolean> => {
  try {
    const supported = await isNotificationSupported();
    if (!supported) {
      console.warn('⚠️ FCM not supported on this browser');
      return false;
    }

    // Register service worker first
    const swRegistered = await registerServiceWorker();
    if (!swRegistered) return false;

    const messaging = getMessaging();

    // Set up handler for foreground messages (when app is open)
    onMessage(messaging, (payload) => {
      console.log('✓ Foreground message received:', payload);

      const title = payload.notification?.title || 'Finance Tracker';
      const body = payload.notification?.body || 'You have a new notification';

      // Show a toast notification
      toast.info(`📢 ${title}: ${body}`);

      // Optionally, show a browser notification even in foreground
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/vite.svg',
          badge: '/vite.svg',
          data: payload.data || {},
        });
      }
    });

    console.log('✓ Firebase Messaging initialized');
    return true;
  } catch (error) {
    console.error('✗ Error initializing Firebase Messaging:', error);
    return false;
  }
};

/**
 * Complete flow: Request permission, get token, save to Firestore
 * Call this when user clicks "Enable Notifications" button
 */
export const enableNotifications = async (userId: string): Promise<boolean> => {
  try {
    // Step 1: Request permission
    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      return false;
    }

    // Step 2: Get FCM token
    const token = await getFCMToken();
    if (!token) {
      toast.error('✗ Failed to get notification token');
      return false;
    }

    // Step 3: Save token to Firestore
    const saved = await saveFCMTokenToFirestore(userId, token);
    if (!saved) {
      toast.error('✗ Failed to save notification settings');
      return false;
    }

    console.log('✓ Notifications enabled successfully');
    return true;
  } catch (error) {
    console.error('✗ Error enabling notifications:', error);
    toast.error('✗ Failed to enable notifications');
    return false;
  }
};

/**
 * Check if notifications are currently enabled for this user
 */
export const isNotificationsEnabled = (): boolean => {
  if (!('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
};

/**
 * Get current notification status
 */
export const getNotificationStatus = (): 'granted' | 'denied' | 'default' | 'unsupported' => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as 'granted' | 'denied' | 'default';
};

/**
 * Test notification (for development/testing)
 * Sends a test notification to verify setup is working
 */
export const sendTestNotification = async (): Promise<void> => {
  try {
    if (!isNotificationsEnabled()) {
      toast.error('⚠️ Notifications are not enabled');
      return;
    }

    // Show a test notification
    const title = 'Test Notification';
    const options = {
      body: 'This is a test notification from your Finance Tracker',
      icon: '/vite.svg',
      badge: '/vite.svg',
      tag: 'test-notification',
    };

    if ('Notification' in window) {
      new Notification(title, options);
      toast.success('✓ Test notification sent');
    }
  } catch (error) {
    console.error('✗ Error sending test notification:', error);
    toast.error('✗ Failed to send test notification');
  }
};

/**
 * Clean up and disable notifications
 */
export const disableNotifications = async (userId: string): Promise<boolean> => {
  try {
    // Remove token from Firestore
    const tokenRef = doc(db, `users/${userId}/settings`, 'notifications');
    await setDoc(
      tokenRef,
      {
        fcmToken: null,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );

    console.log('✓ Notifications disabled');
    toast.success('✓ Notifications disabled');
    return true;
  } catch (error) {
    console.error('✗ Error disabling notifications:', error);
    return false;
  }
};
