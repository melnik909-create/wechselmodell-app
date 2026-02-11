import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export type ImageBucket = 'receipts' | 'handover-photos' | 'avatars';

/**
 * Pick an image from the device library
 */
export async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  // Request permission
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('Berechtigung zum Zugriff auf Fotos wurde verweigert.');
  }

  // Launch image picker
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
    exif: false,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0];
}

/**
 * Take a photo with the camera
 */
export async function takePhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
  // Request permission
  const { status } = await ImagePicker.requestCameraPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('Berechtigung zur Kamera wurde verweigert.');
  }

  // Launch camera
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.8,
    exif: false,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0];
}

/**
 * Upload an image to Supabase Storage
 * @param imageUri - Local URI of the image
 * @param bucket - Storage bucket name
 * @param familyId - Family ID for organizing files
 * @param fileName - Optional custom file name
 * @returns Public URL of the uploaded image
 */
export async function uploadImage(
  imageUri: string,
  bucket: ImageBucket,
  familyId: string,
  fileName?: string
): Promise<string> {
  try {
    // Generate unique file name if not provided
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const finalFileName = fileName || `${timestamp}_${randomStr}.jpg`;
    const filePath = `${familyId}/${finalFileName}`;

    // Fetch the image as a blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Convert blob to array buffer
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) throw error;

    // Return the file path (not public URL since buckets are private)
    return data.path;
  } catch (error: any) {
    console.error('Image upload error:', error);
    throw new Error(`Bild konnte nicht hochgeladen werden: ${error.message}`);
  }
}

/**
 * Get a signed URL for a private image
 * @param bucket - Storage bucket name
 * @param filePath - Path to the file in storage
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export async function getSignedUrl(
  bucket: ImageBucket,
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;

    return data.signedUrl;
  } catch (error: any) {
    console.error('Get signed URL error:', error);
    throw new Error(`URL konnte nicht erstellt werden: ${error.message}`);
  }
}

/**
 * Delete an image from Supabase Storage
 * @param bucket - Storage bucket name
 * @param filePath - Path to the file in storage
 */
export async function deleteImage(
  bucket: ImageBucket,
  filePath: string
): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;
  } catch (error: any) {
    console.error('Image delete error:', error);
    throw new Error(`Bild konnte nicht gelöscht werden: ${error.message}`);
  }
}
