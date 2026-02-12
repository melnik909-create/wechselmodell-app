import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export type ImageBucket = 'receipts' | 'handover-photos' | 'avatars';
export type ImageKind = 'receipt' | 'handover' | 'avatar';

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
 * Request signed upload URL from Edge Function
 */
export async function requestSignedUpload(params: {
  familyId: string;
  kind: ImageKind;
  expenseId?: string;
  mime: string;
  bytes: number;
}): Promise<{
  bucket: string;
  path: string;
  signedUrl: string;
  token: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('create_upload_url', {
      body: {
        family_id: params.familyId,
        kind: params.kind,
        expense_id: params.expenseId,
        mime: params.mime,
        bytes: params.bytes,
      },
    });

    if (error) {
      if (error.message?.includes('CLOUD_PLUS_REQUIRED')) {
        throw new Error('Cloud Plus erforderlich für Uploads');
      }
      throw error;
    }

    if (!data || !data.signedUrl) {
      throw new Error('Keine Upload-URL erhalten');
    }

    return data;
  } catch (error: any) {
    console.error('Request signed upload error:', error);
    throw new Error(error.message || 'Upload-URL konnte nicht erstellt werden');
  }
}

/**
 * Upload file via signed URL
 */
export async function uploadViaSignedUrl(
  signedUrl: string,
  fileBytes: ArrayBuffer,
  mime: string
): Promise<void> {
  try {
    const response = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mime,
      },
      body: fileBytes,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
  } catch (error: any) {
    console.error('Upload via signed URL error:', error);
    throw new Error(`Upload fehlgeschlagen: ${error.message}`);
  }
}

/**
 * Upload an image to Supabase Storage via Edge Function
 *
 * @param imageUri - Local URI of the image
 * @param kind - Type of image (receipt, avatar, handover)
 * @param familyId - Family ID for organizing files
 * @param expenseId - Optional expense ID (for receipts)
 * @returns Storage path (not URL!) for saving to database
 */
export async function uploadImage(
  imageUri: string,
  kind: ImageKind,
  familyId: string,
  expenseId?: string
): Promise<string> {
  try {
    // 1. Fetch the image as a blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // 2. Convert blob to array buffer
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });

    // 3. Determine MIME type
    const mime = blob.type || 'image/jpeg';
    const bytes = arrayBuffer.byteLength;

    // 4. Request signed upload URL from Edge Function
    const { path, signedUrl } = await requestSignedUpload({
      familyId,
      kind,
      expenseId,
      mime,
      bytes,
    });

    // 5. Upload via signed URL
    await uploadViaSignedUrl(signedUrl, arrayBuffer, mime);

    // 6. Return path (NOT URL) for database storage
    return path;
  } catch (error: any) {
    console.error('Image upload error:', error);

    // Special handling for Cloud Plus requirement
    if (error.message?.includes('Cloud Plus')) {
      throw error; // Re-throw to let UI handle it
    }

    throw new Error(`Bild konnte nicht hochgeladen werden: ${error.message}`);
  }
}

/**
 * Request signed download URL from Edge Function
 */
export async function requestSignedDownload(params: {
  familyId: string;
  bucket: ImageBucket;
  path: string;
}): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('create_download_url', {
      body: {
        family_id: params.familyId,
        bucket: params.bucket,
        path: params.path,
      },
    });

    if (error) {
      if (error.message?.includes('CLOUD_PLUS_REQUIRED')) {
        throw new Error('Cloud Plus erforderlich für Downloads');
      }
      throw error;
    }

    if (!data || !data.signedUrl) {
      throw new Error('Keine Download-URL erhalten');
    }

    return data.signedUrl;
  } catch (error: any) {
    console.error('Request signed download error:', error);
    throw new Error(error.message || 'Download-URL konnte nicht erstellt werden');
  }
}

/**
 * Get signed URL for viewing a receipt image
 *
 * @param familyId - Family ID
 * @param path - Storage path (from database)
 * @returns Signed URL for displaying image
 */
export async function getReceiptImageUrl(familyId: string, path: string): Promise<string> {
  return requestSignedDownload({
    familyId,
    bucket: 'receipts',
    path,
  });
}

/**
 * Get signed URL for viewing an avatar image
 */
export async function getAvatarImageUrl(familyId: string, path: string): Promise<string> {
  return requestSignedDownload({
    familyId,
    bucket: 'avatars',
    path,
  });
}

/**
 * Get signed URL for viewing a handover photo
 */
export async function getHandoverImageUrl(familyId: string, path: string): Promise<string> {
  return requestSignedDownload({
    familyId,
    bucket: 'handover-photos',
    path,
  });
}

/**
 * Delete an image from Supabase Storage
 *
 * NOTE: After storage lockdown, this function CANNOT work from client!
 * Deletion must happen server-side (via Edge Functions like settle_family).
 * This is kept for backward compatibility but will fail with RLS.
 *
 * @deprecated Use settle_family Edge Function for deletion
 */
export async function deleteImage(
  bucket: ImageBucket,
  filePath: string
): Promise<void> {
  console.warn('deleteImage called from client - this will fail with storage lockdown');
  throw new Error('Direct deletion blocked. Use Edge Function instead.');
}
