import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { pickImage, takePhoto } from '@/lib/image-upload';
import type { ImagePickerAsset } from 'expo-image-picker';

interface ImagePickerButtonProps {
  imageUri: string | null;
  onImageSelected: (imageUri: string, asset: ImagePickerAsset) => void;
  onImageRemoved?: () => void;
  label?: string;
  aspectRatio?: [number, number];
}

export default function ImagePickerButton({
  imageUri,
  onImageSelected,
  onImageRemoved,
  label = 'Foto hinzufügen',
  aspectRatio = [4, 3],
}: ImagePickerButtonProps) {
  const [isUploading, setIsUploading] = useState(false);

  async function handlePickImage() {
    try {
      setIsUploading(true);
      const asset = await pickImage();
      if (asset) {
        onImageSelected(asset.uri, asset);
      }
    } catch (error: any) {
      Alert.alert('Fehler', error.message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleTakePhoto() {
    try {
      setIsUploading(true);
      const asset = await takePhoto();
      if (asset) {
        onImageSelected(asset.uri, asset);
      }
    } catch (error: any) {
      Alert.alert('Fehler', error.message);
    } finally {
      setIsUploading(false);
    }
  }

  function showImageOptions() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Abbrechen', 'Foto aufnehmen', 'Aus Galerie wählen'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleTakePhoto();
          } else if (buttonIndex === 2) {
            handlePickImage();
          }
        }
      );
    } else {
      Alert.alert('Foto hinzufügen', 'Wähle eine Option', [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Foto aufnehmen', onPress: handleTakePhoto },
        { text: 'Aus Galerie wählen', onPress: handlePickImage },
      ]);
    }
  }

  function handleRemoveImage() {
    Alert.alert('Foto entfernen', 'Möchtest du das Foto wirklich entfernen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Entfernen',
        style: 'destructive',
        onPress: () => onImageRemoved?.(),
      },
    ]);
  }

  if (imageUri) {
    return (
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemoveImage}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="close-circle" size={28} color="#EF4444" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.changeButton}
          onPress={showImageOptions}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="camera-flip" size={20} color="#fff" />
          <Text style={styles.changeButtonText}>Ändern</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.addButton}
      onPress={showImageOptions}
      disabled={isUploading}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name="camera-plus"
        size={32}
        color="#9CA3AF"
      />
      <Text style={styles.addButtonText}>
        {isUploading ? 'Wird geladen...' : label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  changeButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});
