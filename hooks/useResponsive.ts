import { useWindowDimensions } from 'react-native';

export type DeviceType = 'phone' | 'tablet';
export type Orientation = 'portrait' | 'landscape';

export interface ResponsiveInfo {
  width: number;
  height: number;
  deviceType: DeviceType;
  orientation: Orientation;
  isTablet: boolean;
  isLandscape: boolean;
  // Content constraints
  contentMaxWidth: number;
  contentPadding: number;
  // Scaling
  scale: number;
  // Columns for grid layouts
  columns: number;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const shortSide = Math.min(width, height);
  const isTablet = shortSide >= 600;
  const deviceType: DeviceType = isTablet ? 'tablet' : 'phone';
  const orientation: Orientation = isLandscape ? 'landscape' : 'portrait';

  // Content max width: prevent overly wide content on tablets
  const contentMaxWidth = isTablet ? 600 : width;

  // Padding scales with device size
  const contentPadding = isTablet ? 24 : 16;

  // Scale factor for icons/elements (1.0 on phone, up to 1.2 on tablet)
  const scale = isTablet ? 1.15 : 1.0;

  // Grid columns: 2 on tablet landscape, 1 otherwise
  const columns = isTablet && isLandscape ? 2 : 1;

  return {
    width,
    height,
    deviceType,
    orientation,
    isTablet,
    isLandscape,
    contentMaxWidth,
    contentPadding,
    scale,
    columns,
  };
}
