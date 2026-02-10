import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
}: ButtonProps) {
  const baseStyles = 'flex-row items-center justify-center rounded-xl py-4 px-6';
  const variantStyles = {
    primary: 'bg-indigo-600',
    secondary: 'bg-gray-100',
    outline: 'border-2 border-indigo-600',
    ghost: '',
  };
  const textStyles = {
    primary: 'text-white font-semibold text-base',
    secondary: 'text-gray-900 font-semibold text-base',
    outline: 'text-indigo-600 font-semibold text-base',
    ghost: 'text-indigo-600 font-semibold text-base',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${disabled ? 'opacity-50' : ''}`}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#4F46E5'} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className={textStyles[variant]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
