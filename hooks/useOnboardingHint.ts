import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HINT_FIRST_SEEN_KEY = 'onboarding_hint_first_seen';
const HINT_VISIBLE_DAYS = 10;

/**
 * Returns true if onboarding hints should still be shown.
 * Hints are visible for the first 10 days after initial app use,
 * then they disappear automatically.
 */
export function useOnboardingHint(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(HINT_FIRST_SEEN_KEY);
        const now = Date.now();

        if (!stored) {
          await AsyncStorage.setItem(HINT_FIRST_SEEN_KEY, String(now));
          setVisible(true);
          return;
        }

        const firstSeen = parseInt(stored, 10);
        const daysSince = (now - firstSeen) / (1000 * 60 * 60 * 24);
        setVisible(daysSince <= HINT_VISIBLE_DAYS);
      } catch {
        setVisible(false);
      }
    })();
  }, []);

  return visible;
}
