import { View, TouchableOpacity } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
}

export function Card({ children, className = '', onPress }: CardProps) {
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 ${className}`}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 ${className}`}>
      {children}
    </View>
  );
}
