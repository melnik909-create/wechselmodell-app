import { View, Image, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Child } from '@/types';
import { useChildAvatarUrl } from '@/hooks/useChildAvatarUrl';

type Props = {
  familyId: string | undefined;
  child: Child;
  size?: number;
};

export default function ChildAvatar({ familyId, child, size = 44 }: Props) {
  const { data: avatarUrl } = useChildAvatarUrl(familyId, child.id, child.avatar_url ?? null);

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={[styles.img, { width: size, height: size, borderRadius: size / 2 }]} />
      ) : (
        <MaterialCommunityIcons name="account-child" size={size * 0.5} color="#A855F7" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FAF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  img: {},
});
