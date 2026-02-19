import { Platform, Alert as RNAlert, AlertButton } from 'react-native';

/**
 * Cross-platform Alert wrapper
 * - Native: Uses React Native Alert.alert
 * - Web: Uses window.confirm / window.alert
 */
export const AppAlert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[]
  ) => {
    if (Platform.OS === 'web') {
      if (buttons && buttons.length > 2) {
        // Multiple options: show confirm for the destructive/main action
        const confirmed = window.confirm(`${title}\n\n${message || ''}`);
        if (confirmed) {
          const action = buttons.find((b) => b.style !== 'cancel');
          action?.onPress?.();
        } else {
          const cancel = buttons.find((b) => b.style === 'cancel');
          cancel?.onPress?.();
        }
      } else if (buttons && buttons.length === 2) {
        const confirmed = window.confirm(`${title}\n\n${message || ''}`);
        if (confirmed) {
          const action = buttons.find((b) => b.style !== 'cancel');
          action?.onPress?.();
        } else {
          const cancel = buttons.find((b) => b.style === 'cancel');
          cancel?.onPress?.();
        }
      } else {
        window.alert(`${title}${message ? '\n\n' + message : ''}`);
        buttons?.[0]?.onPress?.();
      }
    } else {
      RNAlert.alert(title, message, buttons);
    }
  },
};
