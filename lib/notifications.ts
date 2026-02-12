import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification handling behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission for push notifications denied');
    return false;
  }

  return true;
}

/**
 * Get the Expo push token for this device
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      return null;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
      });
    }

    // Get push token (projectId is optional for development with Expo Go)
    const tokenData = await Notifications.getExpoPushTokenAsync();

    return tokenData.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

/**
 * Save the push token to the user's profile
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to save push token:', error);
    throw error;
  }
}

/**
 * Register for push notifications and save the token
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    const token = await getExpoPushToken();
    if (token) {
      await savePushToken(userId, token);
      return token;
    }
    return null;
  } catch (error) {
    console.error('Failed to register for push notifications:', error);
    return null;
  }
}

/**
 * Send a push notification to a specific user
 * Note: This is a client-side helper. In production, you should use a backend service
 * or Supabase Edge Function to send notifications securely.
 */
export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data: data || {},
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}

/**
 * Get push token for a specific user from the database
 */
export async function getUserPushToken(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data?.push_token || null;
  } catch (error) {
    console.error('Failed to get user push token:', error);
    return null;
  }
}

/**
 * Notify other parent about a new exception proposal
 */
export async function notifyExceptionProposed(
  otherParentId: string,
  proposerName: string,
  date: string
): Promise<void> {
  const token = await getUserPushToken(otherParentId);
  if (!token) return;

  await sendPushNotification(
    token,
    'Neue Ausnahme vorgeschlagen',
    `${proposerName} hat eine Ausnahme für ${date} vorgeschlagen`,
    { type: 'exception_proposed', date }
  );
}

/**
 * Notify proposer about exception status change
 */
export async function notifyExceptionStatusChanged(
  proposerId: string,
  status: 'accepted' | 'rejected',
  date: string
): Promise<void> {
  const token = await getUserPushToken(proposerId);
  if (!token) return;

  const title = status === 'accepted' ? 'Ausnahme akzeptiert' : 'Ausnahme abgelehnt';
  const body = `Deine Ausnahme für ${date} wurde ${
    status === 'accepted' ? 'akzeptiert' : 'abgelehnt'
  }`;

  await sendPushNotification(token, title, body, {
    type: 'exception_status_changed',
    status,
    date,
  });
}

/**
 * Notify both parents about upcoming handover
 */
export async function notifyHandoverDue(
  parentAId: string,
  parentBId: string,
  date: string
): Promise<void> {
  const [tokenA, tokenB] = await Promise.all([
    getUserPushToken(parentAId),
    getUserPushToken(parentBId),
  ]);

  const title = 'Übergabe steht an';
  const body = `Erinnerung: Übergabe am ${date}`;
  const data = { type: 'handover_due', date };

  if (tokenA) {
    await sendPushNotification(tokenA, title, body, data);
  }
  if (tokenB) {
    await sendPushNotification(tokenB, title, body, data);
  }
}

/**
 * Notify other parent about a new expense
 */
export async function notifyNewExpense(
  otherParentId: string,
  amount: number,
  description: string,
  paidByName: string
): Promise<void> {
  const token = await getUserPushToken(otherParentId);
  if (!token) return;

  await sendPushNotification(
    token,
    'Neue Ausgabe hinzugefügt',
    `${paidByName} hat eine Ausgabe hinzugefügt: ${description} (${amount.toFixed(2)} €)`,
    { type: 'new_expense', amount, description }
  );
}

/**
 * Notify other parent about settlement (Quitt)
 */
export async function notifySettlement(
  otherParentId: string,
  settledByName: string
): Promise<void> {
  const token = await getUserPushToken(otherParentId);
  if (!token) return;

  await sendPushNotification(
    token,
    'Ihr seid Quitt!',
    `${settledByName} hat notiert dass ihr Quitt seid. Alle bisherigen Kauf-Notizen wurden gelöscht.`,
    { type: 'settlement' }
  );
}

/**
 * Add notification listener for when app is in foreground
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification listener for when user taps on notification
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
