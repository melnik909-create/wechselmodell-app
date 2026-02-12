import { View, StyleSheet } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';

interface Props {
  children: React.ReactNode;
  maxWidth?: number;
}

/**
 * Wraps content with a max-width constraint for tablets.
 * On phones, content stretches full width as normal.
 * On tablets, content is centered with a max width.
 */
export default function ResponsiveContainer({ children, maxWidth }: Props) {
  const { isTablet, contentMaxWidth } = useResponsive();

  if (!isTablet) {
    return <>{children}</>;
  }

  return (
    <View style={styles.outer}>
      <View style={[styles.inner, { maxWidth: maxWidth ?? contentMaxWidth }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
  },
});
